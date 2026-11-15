"use server"

import { getCreatorAuth, TERMS_VERSION } from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { recordAudit } from "@linkaro/observability"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireCreator } from "@/lib/auth"
import { getRequestContext } from "@/lib/observability"

const Onboarding = z.object({
  adult: z.literal("on", { error: "Confirme que tu as 18 ans ou plus." }),
  terms: z.literal("on", { error: "Accepte les conditions pour continuer." }),
})

export type OnboardingState = { error?: string }

/** Termine l'inscription : confirmation de majorité et acceptation des conditions. */
export async function completeOnboarding(
  _previous: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { creator } = await requireCreator({ onboarded: false })
  const parsed = Onboarding.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const now = new Date()
  await prisma.creator.update({
    where: { id: creator.id },
    data: {
      adultConfirmedAt: now,
      termsAcceptedAt: now,
      termsVersion: TERMS_VERSION,
    },
  })
  await recordAudit({
    actor: { type: "USER", id: creator.id, role: "creator" },
    action: "creator.onboarded",
    target: { type: "creator", id: creator.id },
    metadata: { adultConfirmed: true, termsVersion: TERMS_VERSION },
    context: await getRequestContext(),
  })
  redirect("/tableau-de-bord")
}

/**
 * La personne indique avoir moins de 18 ans : Linkaro ne peut pas l'accueillir.
 * Le compte et ses données sont supprimés immédiatement (minimisation).
 */
export async function declareUnderage() {
  const { creator } = await requireCreator({ onboarded: false })
  const context = await getRequestContext()

  await recordAudit({
    actor: { type: "USER", id: creator.id, role: "creator" },
    action: "creator.deleted_underage",
    target: { type: "creator", id: creator.id },
    reason: "Déclaration de moins de 18 ans",
    context,
  })
  // Supprime aussi sessions et réseaux connectés (suppression en cascade).
  await getCreatorAuth().api.signOut({ headers: await headers() })
  await prisma.creator.delete({ where: { id: creator.id } })
  redirect("/connexion?compte=mineur")
}
