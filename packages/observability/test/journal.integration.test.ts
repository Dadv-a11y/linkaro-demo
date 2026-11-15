import { prisma } from "@linkaro/db"
import { afterAll, describe, expect, it } from "vitest"

import { recordAudit, recordSecurityEvent, verifyAuditChain } from "../src"

const hasDatabase = Boolean(process.env.LINKARO_TEST_DB)

describe.skipIf(!hasDatabase)("journal d'audit (PostgreSQL)", () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("enregistre des actions chaînées et vérifiables", async () => {
    const context = {
      requestId: "req-1",
      ipAddress: "41.202.207.1",
      userAgent: "vitest",
    }
    const first = await recordAudit({
      actor: { type: "USER", id: "user-1", role: "creator" },
      action: "auth.login",
      context,
    })
    const second = await recordAudit({
      actor: { type: "ADMIN", id: "admin-1", role: "support" },
      action: "creator.suspend",
      target: { type: "creator", id: "user-1" },
      reason: "Signalement de fraude",
      changes: { before: { status: "active" }, after: { status: "suspended" } },
      metadata: {
        phoneNumber: "+237699123456",
        accessToken: "ne-doit-pas-apparaitre",
      },
      context,
    })
    expect(second.id).toBeGreaterThan(first.id)

    const stored = await prisma.auditLog.findUniqueOrThrow({
      where: { id: second.id },
    })
    expect(stored.prevHash).toBe(first.hash)
    expect(stored.metadata).toEqual({
      phoneNumber: "+237 6••••••56",
      accessToken: "[MASQUÉ]",
    })

    await expect(verifyAuditChain()).resolves.toEqual({ ok: true, checked: 2 })
  })

  it("supporte des écritures concurrentes sans casser la chaîne", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        recordAudit({
          actor: { type: "SYSTEM" },
          action: "test.concurrent",
          metadata: { i },
        })
      )
    )
    await expect(verifyAuditChain(7)).resolves.toEqual({
      ok: true,
      checked: 22,
    })
  })

  it("refuse toute modification ou suppression, même directe en SQL", async () => {
    await expect(
      prisma.$executeRaw`UPDATE audit_log SET action = 'falsifie'`
    ).rejects.toThrow(/ajout seul/)
    await expect(prisma.$executeRaw`DELETE FROM audit_log`).rejects.toThrow(
      /ajout seul/
    )
    await expect(prisma.$executeRaw`TRUNCATE audit_log`).rejects.toThrow(
      /ajout seul/
    )
  })

  it("détecte une ligne insérée frauduleusement (empreinte fausse)", async () => {
    const last = await prisma.auditLog.findFirstOrThrow({
      orderBy: { id: "desc" },
    })
    const forged = await prisma.auditLog.create({
      data: {
        createdAt: new Date(),
        actorType: "ADMIN",
        action: "creator.delete",
        result: "SUCCESS",
        prevHash: last.hash,
        hash: "f".repeat(64),
      },
    })
    await expect(verifyAuditChain()).resolves.toEqual({
      ok: false,
      checked: 22,
      brokenAtId: forged.id.toString(),
      problem: "hash",
    })
  })

  it("enregistre un événement de sécurité avec l'identifiant masqué", async () => {
    const { id } = await recordSecurityEvent({
      type: "auth.login_failed",
      severity: "WARNING",
      identifier: "awa.ndiaye@gmail.com",
      details: { reason: "code invalide", otp: "123456" },
      context: { requestId: "req-2", ipAddress: "41.202.207.1" },
    })
    const event = await prisma.securityEvent.findUniqueOrThrow({
      where: { id },
    })
    expect(event.identifier).toBe("a•••@g•••.com")
    expect(event.details).toEqual({ reason: "code invalide", otp: "[MASQUÉ]" })
  })
})
