import { findDevPersona } from "@linkaro/auth"

import { assertDevOAuthEnabled, readAccessToken } from "@/lib/dev-oauth/tokens"

export const dynamic = "force-dynamic"

/** Profil du créateur fictif (fournisseur simulé, développement uniquement). */
export function GET(request: Request) {
  assertDevOAuthEnabled()
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ")
    ? readAccessToken(header.slice(7))
    : null
  const persona = token ? findDevPersona(token.personaId) : undefined
  if (!persona)
    return Response.json({ error: "invalid_token" }, { status: 401 })

  return Response.json({
    sub: persona.id,
    name: persona.name,
    preferred_username: persona.username,
    platform: persona.platform,
    followers: persona.followers,
    median_interactions: persona.medianInteractions,
    median_views: persona.medianViews,
  })
}
