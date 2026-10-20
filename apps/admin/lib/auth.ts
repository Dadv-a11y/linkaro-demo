import "server-only"

import {
  evaluateStaffAccess,
  getStaffAuth,
  type Permission,
} from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { recordSecurityEvent } from "@linkaro/observability"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getRequestContext } from "@/lib/observability"

const ACTIVITY_TOUCH_MS = 60 * 1000

/**
 * Exige un membre de l'équipe actif, avec une session validée par la double
 * authentification et, si demandé, la permission voulue. À appeler en tête de
 * chaque page et Server Action de l'administration.
 */
export async function requireStaff(permission?: Permission) {
  const auth = getStaffAuth()
  const requestHeaders = await headers()
  // Sans rafraîchissement : l'inactivité est jugée sur la date d'activité stockée.
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableRefresh: true },
  })

  // Lecture fraîche en base : rôle, statut et double authentification à jour.
  const [member, stored] = session
    ? await Promise.all([
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
          select: { updatedAt: true, secondFactorVerifiedAt: true },
        }),
      ])
    : [null, null]

  const decision = evaluateStaffAccess({ member, session: stored, permission })
  switch (decision.kind) {
    case "allow":
      // Activité enregistrée au plus une fois par minute.
      if (Date.now() - stored!.updatedAt.getTime() > ACTIVITY_TOUCH_MS) {
        await prisma.staffSession.update({
          where: { id: session!.session.id },
          data: { updatedAt: new Date() },
        })
      }
      return { member: member!, session: session! }
    case "sign-in":
      redirect("/connexion")
    case "disabled":
    case "idle":
      await auth.api.signOut({ headers: requestHeaders }).catch(() => undefined)
      redirect(
        `/connexion?raison=${decision.kind === "idle" ? "inactivite" : "desactive"}`
      )
    case "enroll-second-factor":
      redirect("/securite/activer")
    case "verify-second-factor":
      redirect("/securite/verifier")
    case "forbidden":
      await recordSecurityEvent({
        type: "staff.access_denied",
        severity: "WARNING",
        userId: member!.id,
        details: { permission },
        context: await getRequestContext(),
      })
      redirect("/acces-refuse")
  }
}
