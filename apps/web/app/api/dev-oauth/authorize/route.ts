import { findDevPersona } from "@linkaro/auth"
import { z } from "zod"

import { AuthorizeRequest } from "@/app/dev-oauth/autoriser/schema"
import {
  assertDevOAuthEnabled,
  devRedirectUri,
  issueCode,
} from "@/lib/dev-oauth/tokens"

export const dynamic = "force-dynamic"

const Choice = AuthorizeRequest.extend({ persona_id: z.string().min(1) })

/**
 * Le « créateur » a choisi un compte fictif : redirection HTTP vers Linkaro avec
 * un code, comme le ferait TikTok ou Instagram (navigation complète du navigateur).
 */
export function GET(request: Request) {
  assertDevOAuthEnabled()
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const choice = Choice.safeParse(params)
  if (
    !choice.success ||
    choice.data.redirect_uri !== devRedirectUri() ||
    !findDevPersona(choice.data.persona_id)
  ) {
    return Response.json({ error: "invalid_request" }, { status: 400 })
  }
  const target = new URL(choice.data.redirect_uri)
  target.searchParams.set(
    "code",
    issueCode(
      choice.data.persona_id,
      choice.data.code_challenge,
      choice.data.redirect_uri
    )
  )
  target.searchParams.set("state", choice.data.state)
  return Response.redirect(target, 302)
}
