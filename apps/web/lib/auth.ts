import "server-only"

import { getCreatorAuth } from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function getCreatorSession() {
  return getCreatorAuth().api.getSession({ headers: await headers() })
}

/**
 * Exige un créateur connecté et actif. Par défaut, exige aussi qu'il ait
 * terminé l'inscription (confirmation « 18 ans ou plus » et conditions).
 * À appeler en tête de chaque page et Server Action protégée : l'autorisation
 * est toujours vérifiée côté serveur.
 */
export async function requireCreator({ onboarded = true } = {}) {
  const session = await getCreatorSession()
  if (!session) redirect("/connexion")

  // Lecture fraîche en base : un compte suspendu perd l'accès immédiatement.
  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      image: true,
      status: true,
      adultConfirmedAt: true,
    },
  })
  if (!creator || creator.status !== "active")
    redirect("/connexion?compte=inactif")
  if (onboarded && !creator.adultConfirmedAt) redirect("/bienvenue")
  return { session, creator }
}
