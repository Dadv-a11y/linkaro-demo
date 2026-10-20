import "server-only"

import { env } from "@linkaro/env"
import { createLogger, type RequestContext } from "@linkaro/observability"
import { getClientIp, REQUEST_ID_HEADER } from "@linkaro/security"
import { headers } from "next/headers"

export const logger = createLogger({ app: "web" })

/**
 * Contexte de la requête en cours (identifiant, IP réelle, navigateur),
 * à joindre aux journaux, à l'audit et aux événements de sécurité.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers()
  return {
    requestId: h.get(REQUEST_ID_HEADER),
    ipAddress: getClientIp(h.get("x-forwarded-for"), env.TRUSTED_PROXY_HOPS),
    userAgent: h.get("user-agent"),
  }
}
