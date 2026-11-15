import { describe, expect, it } from "vitest"

import { DEV_PERSONAS, findDevPersona, placeholderEmail } from "./dev-oauth"
import {
  CLIENT_IP_HEADER,
  contextFromEndpoint,
  contextFromHeaders,
} from "./request-context"

describe("placeholderEmail", () => {
  it("produit une adresse non routable (.invalid) et normalisée", () => {
    expect(placeholderEmail("tiktok", "Ab_C.123")).toBe(
      "tiktok-ab-c-123@comptes.linkaro.invalid"
    )
    expect(placeholderEmail("facebook", "42")).toMatch(/\.invalid$/)
  })
})

describe("contexte de requête", () => {
  const headers = new Headers({
    "x-request-id": "req-1",
    [CLIENT_IP_HEADER]: "41.202.207.1",
    "x-forwarded-for": "6.6.6.6",
    "user-agent": "vitest",
  })

  it("lit l'IP posée par notre proxy, jamais X-Forwarded-For", () => {
    expect(contextFromHeaders(headers)).toEqual({
      requestId: "req-1",
      ipAddress: "41.202.207.1",
      userAgent: "vitest",
    })
  })

  it("accepte un contexte Better Auth avec en-têtes ou requête, ou rien", () => {
    expect(contextFromEndpoint({ headers }).ipAddress).toBe("41.202.207.1")
    expect(
      contextFromEndpoint({ request: new Request("http://x", { headers }) })
        .requestId
    ).toBe("req-1")
    expect(contextFromEndpoint(null)).toEqual({})
  })
})

describe("créateurs fictifs", () => {
  it("ont des identifiants uniques et retrouvables", () => {
    const ids = DEV_PERSONAS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findDevPersona("dev-awa")?.name).toBe("Awa Mbarga")
    expect(findDevPersona("inconnu")).toBeUndefined()
  })
})
