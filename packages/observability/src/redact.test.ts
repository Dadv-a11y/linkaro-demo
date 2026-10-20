import { describe, expect, it } from "vitest"

import {
  canonicalJson,
  computeAuditHash,
  GENESIS_HASH,
  type AuditRecord,
} from "./audit"
import { maskEmail, maskPhone, MASKED, sanitize } from "./redact"

describe("maskPhone", () => {
  it("garde l'indicatif, le premier et les deux derniers chiffres", () => {
    expect(maskPhone("+237 6 99 12 34 56")).toBe("+237 6••••••56")
    expect(maskPhone("699123456")).toBe("6••••••56")
  })
  it("masque entièrement un numéro trop court", () => {
    expect(maskPhone("1234")).toBe("••••")
  })
})

describe("maskEmail", () => {
  it("garde la première lettre et l'extension", () => {
    expect(maskEmail("awa.ndiaye@gmail.com")).toBe("a•••@g•••.com")
  })
  it("masque une valeur qui n'est pas un e-mail", () => {
    expect(maskEmail("pas-un-email")).toBe(MASKED)
  })
})

describe("sanitize", () => {
  it("masque les secrets, quel que soit le format du nom de clé", () => {
    const out = sanitize({
      password: "x",
      refreshToken: "x",
      access_token: "x",
      apiKey: "x",
      client_secret: "x",
      otp: "123456",
      nested: { deep: { cookie: "x" } },
    })
    expect(out).toEqual({
      password: MASKED,
      refreshToken: MASKED,
      access_token: MASKED,
      apiKey: MASKED,
      client_secret: MASKED,
      otp: MASKED,
      nested: { deep: { cookie: MASKED } },
    })
  })

  it("ne masque pas des clés anodines qui contiennent ces lettres", () => {
    const out = sanitize({
      footprint: "ok",
      postcode: "ok",
      barcode: "ok",
      decode: "ok",
    })
    expect(out).toEqual({
      footprint: "ok",
      postcode: "ok",
      barcode: "ok",
      decode: "ok",
    })
  })

  it("masque partiellement téléphones et e-mails", () => {
    expect(
      sanitize({ phoneNumber: "+237699123456", email: "awa@gmail.com" })
    ).toEqual({
      phoneNumber: "+237 6••••••56",
      email: "a•••@g•••.com",
    })
  })

  it("produit du JSON pur (dates, bigint, undefined)", () => {
    expect(
      sanitize({ at: new Date("2026-01-01T00:00:00Z"), n: 10n, u: undefined })
    ).toEqual({
      at: "2026-01-01T00:00:00.000Z",
      n: "10",
      u: null,
    })
  })
})

describe("erreurs et secrets en clair", () => {
  it("conserve le message et la pile d'une erreur, secrets masqués", () => {
    const error = new Error("Échec de connexion (password=hunter2)", {
      cause: new Error("token: abc123"),
    })
    const out = sanitize({ err: error }) as { err: Record<string, unknown> }
    expect(out.err.type).toBe("Error")
    expect(out.err.message).toBe("Échec de connexion (password=[MASQUÉ])")
    expect(String(out.err.stack)).toContain("password=[MASQUÉ]")
    expect(String(out.err.stack)).not.toContain("hunter2")
    expect((out.err.cause as Record<string, unknown>).message).toBe(
      "token: [MASQUÉ]"
    )
  })

  it("masque les paramètres sensibles d'une URL", () => {
    expect(sanitize({ url: "/auth/callback?code=xyz&state=s1" })).toEqual({
      url: "/auth/callback?code=[MASQUÉ]&state=[MASQUÉ]",
    })
  })

  it("garde les codes d'erreur utiles au débogage", () => {
    expect(
      sanitize({ code: "P2002", message: "error code: ECONNREFUSED" })
    ).toEqual({
      code: "P2002",
      message: "error code: ECONNREFUSED",
    })
  })
})

describe("chaînage de l'audit", () => {
  const record: AuditRecord = {
    createdAt: "2026-10-20T10:00:00.000Z",
    actorType: "USER",
    actorId: "u1",
    actorRole: "creator",
    action: "auth.login",
    targetType: null,
    targetId: null,
    result: "SUCCESS",
    reason: null,
    changes: null,
    metadata: { b: 1, a: { d: 2, c: 3 } },
    requestId: "r1",
    ipAddress: "1.2.3.4",
    userAgent: "test",
  }

  it("le JSON canonique ne dépend pas de l'ordre des clés", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 2 }, b: 1 })
    )
  })

  it("une empreinte change si un seul champ change", () => {
    const h1 = computeAuditHash(record, GENESIS_HASH)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(
      computeAuditHash({ ...record, actorId: "u2" }, GENESIS_HASH)
    ).not.toBe(h1)
  })

  it("une empreinte dépend de la ligne précédente", () => {
    expect(computeAuditHash(record, "a".repeat(64))).not.toBe(
      computeAuditHash(record, GENESIS_HASH)
    )
  })
})
