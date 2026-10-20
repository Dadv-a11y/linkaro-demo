import {
  buildContentSecurityPolicy,
  createNonce,
  createRequestId,
  REQUEST_ID_HEADER,
} from "@linkaro/security"
import { NextResponse, type NextRequest } from "next/server"

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

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export const config = {
  matcher: [
    // Toutes les pages, sauf les fichiers statiques et les préchargements de liens.
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
