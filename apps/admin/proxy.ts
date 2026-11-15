import { env } from "@linkaro/env"
import {
  buildContentSecurityPolicy,
  CLIENT_IP_HEADER,
  createNonce,
  createRequestId,
  getClientIp,
  REQUEST_ID_HEADER,
} from "@linkaro/security"
import { NextResponse, type NextRequest } from "next/server"

import { logger } from "./lib/proxy-logger"

export function proxy(request: NextRequest) {
  const nonce = createNonce()
  const requestId = createRequestId()
  const csp = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === "development",
  })

  // Next.js lit la CSP de la requête pour appliquer le nonce à ses propres scripts.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)
  // IP réelle, calculée ici et transmise à l'app. La valeur éventuellement
  // envoyée par le client est toujours supprimée.
  const clientIp = getClientIp(
    request.headers.get("x-forwarded-for"),
    env.TRUSTED_PROXY_HOPS
  )
  if (clientIp) requestHeaders.set(CLIENT_IP_HEADER, clientIp)
  else requestHeaders.delete(CLIENT_IP_HEADER)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set(REQUEST_ID_HEADER, requestId)

  // Journal d'accès : chemin sans query string (codes OAuth, tokens…).
  logger.info(
    { requestId, method: request.method, path: request.nextUrl.pathname },
    "requête"
  )
  return response
}

export const config = {
  // Toutes les requêtes sauf les fichiers statiques. Pas d'exception fondée sur un
  // en-tête (ex. « prefetch ») : le client le contrôle et pourrait contourner le proxy.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
