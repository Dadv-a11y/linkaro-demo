import "server-only"

import { createLogger, type RequestContext } from "@linkaro/observability"
import { CLIENT_IP_HEADER, REQUEST_ID_HEADER } from "@linkaro/security"
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
    // IP réelle calculée par proxy.ts (la valeur du client y est écrasée).
    ipAddress: h.get(CLIENT_IP_HEADER),
    userAgent: h.get("user-agent"),
  }
}
