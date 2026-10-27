import { prisma } from "@linkaro/db"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@linkaro/mailer", () => ({ devMailDir: () => "", sendMail: vi.fn() }))

const {
  CreatorAdminError,
  deleteCreator,
  exportCreatorData,
  reactivateCreator,
  revealCreatorEmail,
  suspendCreator,
} = await import("../src")

const hasDatabase = Boolean(process.env.LINKARO_TEST_DB)

let counter = 0
async function staff(role: string, status = "active") {
  counter += 1
  return prisma.staffMember.create({
    data: {
      id: `staff-${counter}-${role}`,
      name: `Membre ${counter}`,
      email: `membre${counter}@linkaro.test`,
      role,
      status,
    },
  })
}

async function creatorWithNetwork(email = "awa@exemple.com") {
  counter += 1
  const id = `creator-${counter}`
  await prisma.creator.create({
    data: { id, name: "Awa Mbarga", email: `${counter}-${email}` },
  })
  await prisma.creatorAccount.create({
    data: {
      id: `account-${counter}`,
      accountId: `tiktok-${counter}`,
      providerId: "tiktok",
      userId: id,
      accessToken: "token-chiffre-de-test",
    },
  })
  await prisma.creatorSession.create({
    data: {
      id: `session-${counter}`,
      token: `jeton-${counter}`,
      userId: id,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  })
  return id
}

const actions = (targetId: string) =>
  prisma.auditLog.findMany({
    where: { targetType: "creator", targetId },
    select: { action: true, reason: true },
  })

describe.skipIf(!hasDatabase)("actions de l'équipe sur les créateurs", () => {
  beforeEach(() => {
    counter += 100
  })

  it("suspend (sessions fermées) puis réactive, avec motif et audit", async () => {
    const support = await staff("support")
    const id = await creatorWithNetwork()

    await expect(
      suspendCreator({ actorId: support.id, creatorId: id, reason: "" })
    ).rejects.toThrow()

    await suspendCreator({
      actorId: support.id,
      creatorId: id,
      reason: "Signalement d'usurpation",
    })
    const suspended = await prisma.creator.findUniqueOrThrow({ where: { id } })
    expect(suspended.status).toBe("suspended")
    expect(await prisma.creatorSession.count({ where: { userId: id } })).toBe(0)

    await expect(
      suspendCreator({ actorId: support.id, creatorId: id, reason: "Encore" })
    ).rejects.toBeInstanceOf(CreatorAdminError)

    await reactivateCreator({
      actorId: support.id,
      creatorId: id,
      reason: "Vérification faite",
    })
    expect(
      (await prisma.creator.findUniqueOrThrow({ where: { id } })).status
    ).toBe("active")
    expect((await actions(id)).map((a) => a.action)).toEqual([
      "creator.suspended",
      "creator.reactivated",
    ])
  })

  it("refuse selon le rôle et le statut du membre", async () => {
    const tech = await staff("tech")
    const disabled = await staff("superadmin", "disabled")
    const support = await staff("support")
    const id = await creatorWithNetwork()

    await expect(
      suspendCreator({ actorId: tech.id, creatorId: id, reason: "Test" })
    ).rejects.toBeInstanceOf(CreatorAdminError)
    await expect(
      exportCreatorData({ actorId: support.id, creatorId: id })
    ).rejects.toBeInstanceOf(CreatorAdminError)
    await expect(
      deleteCreator({
        actorId: disabled.id,
        creatorId: id,
        reason: "Test",
        confirmName: "Awa Mbarga",
      })
    ).rejects.toBeInstanceOf(CreatorAdminError)
    expect(await actions(id)).toEqual([])
  })

  it("affiche l'e-mail en journalisant la consultation", async () => {
    const ops = await staff("ops")
    const id = await creatorWithNetwork()
    const email = await revealCreatorEmail({ actorId: ops.id, creatorId: id })
    expect(email).toMatch(/awa@exemple\.com$/)

    const placeholder = await creatorWithNetwork("x@comptes.linkaro.invalid")
    expect(
      await revealCreatorEmail({ actorId: ops.id, creatorId: placeholder })
    ).toBeNull()
    expect((await actions(id)).map((a) => a.action)).toEqual([
      "creator.email_viewed",
    ])
  })

  it("exporte les données sans aucun token", async () => {
    const admin = await staff("superadmin")
    const id = await creatorWithNetwork()
    const data = await exportCreatorData({ actorId: admin.id, creatorId: id })
    expect(data.creator.id).toBe(id)
    expect(data.connectedNetworks).toHaveLength(1)
    expect(JSON.stringify(data)).not.toContain("token-chiffre-de-test")
    expect(JSON.stringify(data)).not.toContain("jeton-")
    expect((await actions(id)).map((a) => a.action)).toContain(
      "creator.exported"
    )
  })

  it("supprime définitivement, après confirmation du nom", async () => {
    const admin = await staff("superadmin")
    const id = await creatorWithNetwork()

    await expect(
      deleteCreator({
        actorId: admin.id,
        creatorId: id,
        reason: "Demande de la créatrice",
        confirmName: "Autre nom",
      })
    ).rejects.toBeInstanceOf(CreatorAdminError)

    await deleteCreator({
      actorId: admin.id,
      creatorId: id,
      reason: "Demande de la créatrice",
      confirmName: "Awa Mbarga",
    })
    expect(await prisma.creator.findUnique({ where: { id } })).toBeNull()
    expect(await prisma.creatorAccount.count({ where: { userId: id } })).toBe(0)
    expect(await prisma.creatorSession.count({ where: { userId: id } })).toBe(0)
    const trail = await actions(id)
    expect(trail).toEqual([
      { action: "creator.deleted", reason: "Demande de la créatrice" },
    ])
  })
})
