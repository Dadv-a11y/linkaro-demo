import { DEV_OAUTH_CLIENT_ID } from "@linkaro/auth"
import { z } from "zod"

/** Paramètres d'une demande d'autorisation OAuth (avec PKCE obligatoire). */
export const AuthorizeRequest = z.object({
  client_id: z.literal(DEV_OAUTH_CLIENT_ID),
  redirect_uri: z.url(),
  response_type: z.literal("code"),
  state: z.string().min(1).max(512),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  code_challenge_method: z.literal("S256"),
})
