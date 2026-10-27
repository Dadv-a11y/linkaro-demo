import "server-only"

import { DEV_OAUTH_PROVIDER_ID, isPlaceholderEmail } from "@linkaro/auth"
import { maskEmail } from "@linkaro/observability"

export type NetworkLogo = "tiktok" | "instagram" | "facebook" | "google" | "dev"

/** Réseaux connus : libellé et logo à afficher. */
const NETWORKS: Record<string, { label: string; logo: NetworkLogo }> = {
  tiktok: { label: "TikTok", logo: "tiktok" },
  instagram: { label: "Instagram", logo: "instagram" },
  facebook: { label: "Facebook", logo: "facebook" },
  google: { label: "YouTube", logo: "google" },
  [DEV_OAUTH_PROVIDER_ID]: { label: "Compte de test", logo: "dev" },
}

export function networkInfo(providerId: string) {
  return NETWORKS[providerId] ?? { label: providerId, logo: "dev" as const }
}

/** E-mail affiché dans les listes : masqué, ou mention si le réseau n'en a pas fourni. */
export function displayEmail(email: string): string {
  return isPlaceholderEmail(email) ? "Adresse non fournie" : maskEmail(email)
}
