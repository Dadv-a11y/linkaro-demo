/**
 * Fournisseur OAuth simulé, pour développer et tester sans clés de réseaux sociaux.
 *
 * Il reproduit un vrai flux OAuth 2.0 (redirection, state, PKCE, échange du code,
 * lecture du profil) avec des créateurs fictifs. Il n'est actif que si
 * ENABLE_DEV_OAUTH=true, ce que la validation de l'environnement interdit en production.
 */

export const DEV_OAUTH_PROVIDER_ID = "linkaro-dev"
export const DEV_OAUTH_CLIENT_ID = "linkaro-dev-client"
export const DEV_OAUTH_CLIENT_SECRET = "linkaro-dev-secret"

export type DevPersona = {
  id: string
  name: string
  username: string
  platform: "tiktok" | "instagram" | "youtube" | "facebook"
  followers: number
  /** Interactions médianes par publication (likes + commentaires + partages). */
  medianInteractions: number
  medianViews: number
}

/** Créateurs fictifs couvrant différents profils (petit compte engagé, gros compte, cas suspect). */
export const DEV_PERSONAS: DevPersona[] = [
  {
    id: "dev-awa",
    name: "Awa Mbarga",
    username: "awa.cuisine237",
    platform: "tiktok",
    followers: 25_000,
    medianInteractions: 1_200,
    medianViews: 12_000,
  },
  {
    id: "dev-junior",
    name: "Junior Ndzana",
    username: "junior_le_comique",
    platform: "tiktok",
    followers: 800_000,
    medianInteractions: 6_000,
    medianViews: 150_000,
  },
  {
    id: "dev-lydie",
    name: "Lydie Fotso",
    username: "lydie.style",
    platform: "instagram",
    followers: 10_000,
    medianInteractions: 5_000,
    medianViews: 9_000,
  },
]

export function findDevPersona(id: string): DevPersona | undefined {
  return DEV_PERSONAS.find((persona) => persona.id === id)
}

/** Adresse factice et non routable, pour les comptes sans e-mail. */
export function placeholderEmail(provider: string, accountId: string): string {
  const safe = `${provider}-${accountId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
  return `${safe}@comptes.linkaro.invalid`
}
