import "server-only"

import { createHash, createHmac, timingSafeEqual } from "node:crypto"

import { DEV_OAUTH_PROVIDER_ID } from "@linkaro/auth"
import { env } from "@linkaro/env"
import { notFound } from "next/navigation"

/**
 * Jetons du fournisseur OAuth simulé : signés (HMAC-SHA256), autoportants et
 * de courte durée. Aucun état serveur n'est nécessaire.
 */

type CodePayload = {
  kind: "code"
  personaId: string
  codeChallenge: string
  redirectUri: string
  exp: number
}
type AccessPayload = { kind: "access"; personaId: string; exp: number }

function key() {
  // Clé dérivée, propre au fournisseur simulé.
  return createHmac("sha256", env.CREATOR_AUTH_SECRET)
    .update("dev-oauth")
    .digest()
}

function sign(payload: CodePayload | AccessPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const mac = createHmac("sha256", key()).update(body).digest("base64url")
  return `${body}.${mac}`
}

function verify<T extends CodePayload | AccessPayload>(
  token: string,
  kind: T["kind"]
): T | null {
  const [body, mac] = token.split(".")
  if (!body || !mac) return null
  const expected = createHmac("sha256", key()).update(body).digest()
  const given = Buffer.from(mac, "base64url")
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T
  if (payload.kind !== kind || payload.exp < Date.now()) return null
  return payload
}

export const devRedirectUri = () =>
  `${env.WEB_URL}/api/auth/callback/${DEV_OAUTH_PROVIDER_ID}`

/** Le fournisseur simulé n'existe pas hors développement (404). */
export function assertDevOAuthEnabled() {
  if (!env.ENABLE_DEV_OAUTH || env.NODE_ENV === "production") notFound()
}

export function issueCode(
  personaId: string,
  codeChallenge: string,
  redirectUri: string
) {
  return sign({
    kind: "code",
    personaId,
    codeChallenge,
    redirectUri,
    exp: Date.now() + 60_000,
  })
}

export function issueAccessToken(personaId: string) {
  return sign({ kind: "access", personaId, exp: Date.now() + 3_600_000 })
}

export function readAccessToken(token: string) {
  return verify<AccessPayload>(token, "access")
}

/** Échange du code : signature, expiration, URI de retour et preuve PKCE (S256). */
export function redeemCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
) {
  const payload = verify<CodePayload>(code, "code")
  if (!payload || payload.redirectUri !== redirectUri) return null
  const challenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")
  return challenge === payload.codeChallenge ? payload : null
}
