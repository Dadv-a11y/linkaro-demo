import { createAuthClient } from "better-auth/react"

/** Client d'authentification côté navigateur (même origine : /api/auth). */
export const authClient = createAuthClient()
