import { DEV_OAUTH_CLIENT_ID, DEV_OAUTH_CLIENT_SECRET } from "@linkaro/auth"
import { z } from "zod"

import {
  assertDevOAuthEnabled,
  issueAccessToken,
  redeemCode,
} from "@/lib/dev-oauth/tokens"

export const dynamic = "force-dynamic"

const TokenRequest = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  redirect_uri: z.url(),
  code_verifier: z.string().min(43).max(128),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
})

const oauthError = (error: string, status = 400) =>
  Response.json({ error }, { status })

/** Point d'échange du code (fournisseur simulé, développement uniquement). */
export async function POST(request: Request) {
  assertDevOAuthEnabled()
  const parsed = TokenRequest.safeParse(
    Object.fromEntries(await request.formData())
  )
  if (!parsed.success) return oauthError("invalid_request")

  // Authentification du client : en-tête Basic ou paramètres du formulaire.
  let { client_id: clientId, client_secret: clientSecret } = parsed.data
  const basic = request.headers.get("authorization")
  if (basic?.startsWith("Basic ")) {
    const decoded = Buffer.from(basic.slice(6), "base64").toString()
    const separator = decoded.indexOf(":")
    clientId = decodeURIComponent(decoded.slice(0, separator))
    clientSecret = decodeURIComponent(decoded.slice(separator + 1))
  }
  if (
    clientId !== DEV_OAUTH_CLIENT_ID ||
    clientSecret !== DEV_OAUTH_CLIENT_SECRET
  ) {
    return oauthError("invalid_client", 401)
  }

  const code = redeemCode(
    parsed.data.code,
    parsed.data.code_verifier,
    parsed.data.redirect_uri
  )
  if (!code) return oauthError("invalid_grant")

  return Response.json({
    access_token: issueAccessToken(code.personaId),
    token_type: "Bearer",
    expires_in: 3600,
    scope: "profile",
  })
}
