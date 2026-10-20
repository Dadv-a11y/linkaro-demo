import { describe, expect, it } from "vitest"

import { buildContentSecurityPolicy, createNonce } from "./csp"
import { securityHeaders } from "./headers"
import { createRequestId } from "./request-id"

describe("createNonce", () => {
  it("produit une valeur différente à chaque appel", () => {
    const nonces = new Set(Array.from({ length: 100 }, () => createNonce()))
    expect(nonces.size).toBe(100)
  })

  it("contient au moins 128 bits d'aléa encodés en base64", () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/)
  })
})

describe("buildContentSecurityPolicy", () => {
  const prod = buildContentSecurityPolicy({
    nonce: "abc",
    isDevelopment: false,
  })

  it("n'autorise que nos scripts et ceux portant le nonce", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(prod).not.toContain("'unsafe-inline' 'nonce")
  })

  it("n'autorise jamais eval en production", () => {
    expect(prod).not.toContain("unsafe-eval")
    expect(
      buildContentSecurityPolicy({ nonce: "abc", isDevelopment: true })
    ).toContain("'unsafe-eval'")
  })

  it("bloque les iframes, les plugins et le détournement de formulaires", () => {
    expect(prod).toContain("frame-ancestors 'none'")
    expect(prod).toContain("object-src 'none'")
    expect(prod).toContain("form-action 'self'")
    expect(prod).toContain("upgrade-insecure-requests")
  })

  it("accepte des origines supplémentaires explicites", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abc",
      isDevelopment: false,
      imgSrc: ["https://yt3.ggpht.com"],
    })
    expect(csp).toContain("img-src 'self' blob: data: https://yt3.ggpht.com")
  })
})

describe("securityHeaders", () => {
  const keys = (h: { key: string }[]) => h.map((x) => x.key)

  it("n'active HSTS qu'en production", () => {
    expect(keys(securityHeaders({ isProduction: false }))).not.toContain(
      "Strict-Transport-Security"
    )
    expect(keys(securityHeaders({ isProduction: true }))).toContain(
      "Strict-Transport-Security"
    )
  })

  it("ajoute noindex pour le back-office", () => {
    expect(
      keys(securityHeaders({ isProduction: true, noIndex: true }))
    ).toContain("X-Robots-Tag")
  })
})

describe("createRequestId", () => {
  it("génère un UUID v4", () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })
})
