import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** Client d'authentification de l'équipe côté navigateur (même origine : /api/auth). */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), twoFactorClient()],
})

/** Message affichable pour une erreur renvoyée par /api/auth. */
export function authErrorMessage(error: { status: number }): string {
  if (error.status === 429)
    return "Trop de tentatives. Patiente une minute avant de réessayer."
  return "Une erreur est survenue. Réessaie."
}
