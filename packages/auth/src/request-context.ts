import type { RequestContext } from "@linkaro/observability"
import { CLIENT_IP_HEADER } from "@linkaro/security"

export { CLIENT_IP_HEADER }

type MaybeEndpointContext =
  | {
      headers?: Headers | null
      request?: Request | null
    }
  | null
  | undefined

/** Contexte de requête (identifiant, IP, navigateur) à partir des en-têtes. */
export function contextFromHeaders(
  headers: Headers | null | undefined
): RequestContext {
  if (!headers) return {}
  return {
    requestId: headers.get("x-request-id"),
    ipAddress: headers.get(CLIENT_IP_HEADER),
    userAgent: headers.get("user-agent"),
  }
}

/** Contexte de requête depuis le contexte d'un hook Better Auth (peut être absent). */
export function contextFromEndpoint(ctx: MaybeEndpointContext): RequestContext {
  return contextFromHeaders(ctx?.headers ?? ctx?.request?.headers ?? null)
}
