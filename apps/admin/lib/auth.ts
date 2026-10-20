import "server-only"

import {
  evaluateStaffAccess,
  getStaffAuth,
  STAFF_IDLE_TIMEOUT_MS,
  STAFF_SESSION_MAX_AGE_S,
  type Permission,
  type StaffAccessDecision,
} from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { recordSecurityEvent } from "@linkaro/observability"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import { getRequestContext } from "@/lib/observability"

const ACTIVITY_TOUCH_MS = 60 * 1000

/** Lecture fraîche de la session et du membre (une fois par requête). */
const loadStaffAccess = cache(async () => {
  const requestHeaders = await headers()
  // Sans rafraîchissement : l'inactivité est jugée sur la date d'activité stockée.
  const session = await getStaffAuth().api.getSession({
    headers: requestHeaders,
    query: { disableRefresh: true },
  })
  if (!session) return { session: null, member: null, stored: null }

  const [member, stored] = await Promise.all([
    prisma.staffMember.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
      },
    }),
    prisma.staffSession.findUnique({
      where: { id: session.session.id },
      select: {
        createdAt: true,
        updatedAt: true,
        secondFactorVerifiedAt: true,
      },
    }),
  ])
  return { session, member, stored }
})

/** Redirection correspondant à une décision qui ne donne pas accès. */
async function deny(decision: StaffAccessDecision, permission?: Permission) {
  switch (decision.kind) {
    case "sign-in":
      redirect("/connexion")
    case "disabled":
    case "idle":
      await getStaffAuth()
        .api.signOut({ headers: await headers() })
        .catch(() => undefined)
      redirect(
        `/connexion?raison=${decision.kind === "idle" ? "inactivite" : "desactive"}`
      )
    case "enroll-second-factor":
      redirect("/securite/activer")
    case "verify-second-factor":
      redirect("/securite/verifier")
    case "forbidden": {
      const { member } = await loadStaffAccess()
      await recordSecurityEvent({
        type: "staff.access_denied",
        severity: "WARNING",
        userId: member?.id,
        details: { permission },
        context: await getRequestContext(),
      })
      // Page 404 : on ne révèle pas l'existence d'une page non autorisée.
      notFound()
    }
  }
}

/**
 * Exige un membre de l'équipe actif, avec une session validée par la double
 * authentification et, si demandé, la permission voulue. À appeler en tête de
 * chaque page et Server Action de l'administration.
 */
export async function requireStaff(permission?: Permission) {
  const { session, member, stored } = await loadStaffAccess()
  const decision = evaluateStaffAccess({ member, session: stored, permission })
  if (decision.kind !== "allow" || !session || !member || !stored) {
    return deny(decision, permission) as never
  }

  // Activité enregistrée au plus une fois par minute.
  let lastActivity = stored.updatedAt
  if (Date.now() - lastActivity.getTime() > ACTIVITY_TOUCH_MS) {
    lastActivity = new Date()
    await prisma.staffSession.update({
      where: { id: session.session.id },
      data: { updatedAt: lastActivity },
    })
  }
  // Déconnexion à la première échéance : inactivité ou durée maximale.
  const expiresAt = new Date(
    Math.min(
      lastActivity.getTime() + STAFF_IDLE_TIMEOUT_MS,
      stored.createdAt.getTime() + STAFF_SESSION_MAX_AGE_S * 1000
    )
  )
  return { member, session, expiresAt }
}

/**
 * Pour les écrans de double authentification : n'autorise que l'étape attendue
 * (activation ou vérification) et renvoie ailleurs dans les autres cas.
 */
export async function requireSecondFactorStep(
  step: "enroll-second-factor" | "verify-second-factor"
) {
  const { member, stored } = await loadStaffAccess()
  const decision = evaluateStaffAccess({ member, session: stored })
  if (decision.kind === step && member) return { member }
  if (decision.kind === "allow") redirect("/")
  return deny(decision) as never
}

/** Membre déjà connecté et validé : utilisé pour sauter l'écran de connexion. */
export async function isFullySignedIn() {
  const { member, stored } = await loadStaffAccess()
  return evaluateStaffAccess({ member, session: stored }).kind === "allow"
}
