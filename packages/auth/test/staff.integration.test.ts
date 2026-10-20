import { createHmac } from "node:crypto"

import { prisma } from "@linkaro/db"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

// Les e-mails sont capturés au lieu d'être envoyés.
const sentMails: { to: string; text: string }[] = []
vi.mock("@linkaro/mailer", () => ({
  devMailDir: () => "",
  sendMail: vi.fn(async (mail: { to: string; text: string }) => {
    sentMails.push(mail)
  }),
}))

const {
  acceptStaffInvitation,
  changeStaffRole,
  createStaffInvitation,
  disableStaffMember,
  getStaffAuth,
  StaffInvitationError,
  StaffMemberError,
} = await import("../src")

const hasDatabase = Boolean(process.env.LINKARO_TEST_DB)
const ADMIN = process.env.ADMIN_URL ?? "http://localhost:3001"

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, pas de 30 s) à partir d'un secret base32. */
function totp(base32Secret: string, time = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0")
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)))
  const hmac = createHmac("sha1", key).update(counter).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, "0")
}

/** Appelle l'API d'authentification de l'équipe comme le ferait le navigateur. */
async function call(
  path: string,
  init: { method?: string; body?: unknown; cookie?: string } = {}
) {
  const headers = new Headers({
    origin: ADMIN,
    "content-type": "application/json",
  })
  if (init.cookie) headers.set("cookie", init.cookie)
  const url = path.startsWith("http") ? path : `${ADMIN}/api/auth${path}`
  return getStaffAuth().handler(
    new Request(url, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      redirect: "manual",
    })
  )
}

function cookiesFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ")
}

const tokenOf = (url: string) => url.split("/invitation/")[1]!

/** Secret TOTP tel que l'application d'authentification l'a reçu à l'activation. */
let authenticatorSecret = ""

describe.skipIf(!hasDatabase)("accès de l'équipe (PostgreSQL)", () => {
  beforeEach(() => {
    sentMails.length = 0
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("premier superadmin : invitation par script, acceptation unique", async () => {
    const invitation = await createStaffInvitation(
      {
        email: "Awa@Linkaro.test",
        role: "superadmin",
        reason: "Premier superadmin",
      },
      { kind: "system", description: "test" }
    )
    const stored = await prisma.staffInvitation.findUniqueOrThrow({
      where: { id: invitation.id },
    })
    expect(stored.tokenHash).not.toContain(tokenOf(invitation.url)) // jamais le jeton en clair
    expect(stored.email).toBe("awa@linkaro.test")

    await expect(
      acceptStaffInvitation(tokenOf(invitation.url), "Awa Admin")
    ).resolves.toEqual({
      email: "awa@linkaro.test",
    })
    await expect(
      acceptStaffInvitation(tokenOf(invitation.url), "Awa Admin")
    ).rejects.toBeInstanceOf(StaffInvitationError)
    const member = await prisma.staffMember.findUniqueOrThrow({
      where: { email: "awa@linkaro.test" },
    })
    expect(member).toMatchObject({ role: "superadmin", status: "active" })
  })

  it("refuse une invitation expirée ou un faux jeton", async () => {
    const invitation = await createStaffInvitation(
      {
        email: "expire@linkaro.test",
        role: "support",
        reason: "Test d'expiration",
      },
      { kind: "system", description: "test" }
    )
    await prisma.staffInvitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    await expect(
      acceptStaffInvitation(tokenOf(invitation.url), "Expiré")
    ).rejects.toThrow(/plus valable/)
    await expect(acceptStaffInvitation("faux-jeton", "Pirate")).rejects.toThrow(
      /plus valable/
    )
  })

  it("lien magique : uniquement pour un membre invité", async () => {
    const unknown = await call("/sign-in/magic-link", {
      body: { email: "inconnu@linkaro.test", callbackURL: "/" },
    })
    expect(unknown.status).toBeLessThan(500)
    expect(sentMails).toHaveLength(0)
    expect(
      await prisma.staffMember.count({
        where: { email: "inconnu@linkaro.test" },
      })
    ).toBe(0)

    const known = await call("/sign-in/magic-link", {
      body: { email: "awa@linkaro.test", callbackURL: "/" },
    })
    expect(known.status).toBe(200)
    expect(sentMails).toHaveLength(1)
    expect(sentMails[0]!.text).toContain(
      `${ADMIN}/api/auth/magic-link/verify?token=`
    )
  })

  it("connexion par lien magique, puis double authentification obligatoire", async () => {
    await call("/sign-in/magic-link", {
      body: { email: "awa@linkaro.test", callbackURL: "/" },
    })
    const link = sentMails[0]!.text.match(
      /https?:\/\/\S+magic-link\/verify\S+/
    )![0]

    const verified = await call(link)
    expect(verified.status).toBe(302)
    const cookie = cookiesFrom(verified)
    expect(cookie).toContain("linkaro-staff.session_token=")

    const session = await prisma.staffSession.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    })
    expect(session.secondFactorVerifiedAt).toBeNull() // pas encore validée

    // Activation de la double authentification (sans mot de passe).
    const enabled = await call("/two-factor/enable", { body: {}, cookie })
    expect(enabled.status).toBe(200)
    const { totpURI, backupCodes } = (await enabled.json()) as {
      totpURI: string
      backupCodes: string[]
    }
    expect(backupCodes.length).toBeGreaterThan(0)
    const secret = new URL(totpURI).searchParams.get("secret")!
    authenticatorSecret = secret

    // Un mauvais code est refusé et tracé.
    const wrong = await call("/two-factor/verify-totp", {
      body: { code: "000000" },
      cookie,
    })
    expect(wrong.status).toBeGreaterThanOrEqual(400)
    expect(
      await prisma.securityEvent.count({
        where: { type: "staff.second_factor_failed" },
      })
    ).toBeGreaterThan(0)
    expect(
      (
        await prisma.staffSession.findUniqueOrThrow({
          where: { id: session.id },
        })
      ).secondFactorVerifiedAt
    ).toBeNull()

    // Le bon code valide la session.
    const ok = await call("/two-factor/verify-totp", {
      body: { code: totp(secret) },
      cookie,
    })
    expect(ok.status).toBe(200)
    // À l'activation, Better Auth remplace la session : l'ancienne n'existe plus,
    // la nouvelle (celle du cookie renvoyé) est validée.
    expect(await prisma.staffSession.count({ where: { id: session.id } })).toBe(
      0
    )
    const newToken = cookiesFrom(ok).match(
      /linkaro-staff\.session_token=([^.;]+)/
    )?.[1]
    expect(newToken).toBeTruthy()
    const after = await prisma.staffSession.findUniqueOrThrow({
      where: { token: newToken! },
    })
    expect(after.secondFactorVerifiedAt).not.toBeNull()
    const member = await prisma.staffMember.findUniqueOrThrow({
      where: { email: "awa@linkaro.test" },
    })
    expect(member.twoFactorEnabled).toBe(true)

    const actions = (
      await prisma.auditLog.findMany({ select: { action: true } })
    ).map((a) => a.action)
    expect(actions).toEqual(
      expect.arrayContaining([
        "staff.invite",
        "staff.invitation_accepted",
        "staff.login",
        "staff.second_factor_verified",
      ])
    )
  })

  it("retour d'un membre déjà équipé : lien magique puis code obligatoire", async () => {
    await call("/sign-in/magic-link", {
      body: { email: "awa@linkaro.test", callbackURL: "/" },
    })
    const link = sentMails[0]!.text.match(
      /https?:\/\/\S+magic-link\/verify\S+/
    )![0]
    const cookie = cookiesFrom(await call(link))
    const token = cookie.match(/linkaro-staff\.session_token=([^.;]+)/)![1]!
    const session = await prisma.staffSession.findUniqueOrThrow({
      where: { token },
    })
    expect(session.secondFactorVerifiedAt).toBeNull()

    // Le lien magique n'est utilisable qu'une fois.
    expect((await call(link)).headers.get("location")).toMatch(/erreur|error/)

    const twoFactor = await prisma.staffTwoFactor.findFirstOrThrow({
      where: { member: { email: "awa@linkaro.test" } },
    })
    expect(twoFactor.secret).not.toMatch(/^[A-Z2-7]+=*$/) // secret chiffré en base

    // Avant le code, impossible de relire le secret ou de désactiver la double authentification.
    // (view-backup-codes n'est pas exposé en HTTP par Better Auth.)
    for (const path of [
      "/two-factor/get-totp-uri",
      "/two-factor/disable",
      "/two-factor/generate-backup-codes",
    ]) {
      expect((await call(path, { body: {}, cookie })).status).toBe(403)
    }
    expect(
      await prisma.securityEvent.count({
        where: { type: "staff.second_factor_bypass_attempt" },
      })
    ).toBe(3)

    // Le code vient de l'application d'authentification du membre.
    const secret = authenticatorSecret
    const ok = await call("/two-factor/verify-totp", {
      body: { code: totp(secret) },
      cookie,
    })
    expect(ok.status).toBe(200)
    const sessions = await prisma.staffSession.findMany({
      where: { member: { email: "awa@linkaro.test" } },
      orderBy: { createdAt: "desc" },
      take: 1,
    })
    expect(sessions[0]!.secondFactorVerifiedAt).not.toBeNull()
  })

  it("garde-fous : invitations, rôles et désactivation", async () => {
    const awa = await prisma.staffMember.findUniqueOrThrow({
      where: { email: "awa@linkaro.test" },
    })
    const invite = await createStaffInvitation(
      {
        email: "paul@linkaro.test",
        role: "support",
        reason: "Renfort support",
      },
      { kind: "staff", id: awa.id }
    )
    await acceptStaffInvitation(tokenOf(invite.url), "Paul Support")
    const paul = await prisma.staffMember.findUniqueOrThrow({
      where: { email: "paul@linkaro.test" },
    })

    // Un membre « support » ne peut pas inviter.
    await expect(
      createStaffInvitation(
        { email: "x@linkaro.test", role: "superadmin", reason: "Escalade" },
        { kind: "staff", id: paul.id }
      )
    ).rejects.toThrow(/superadmin/)
    // Personne ne change son propre rôle ; le dernier superadmin reste superadmin.
    await expect(
      changeStaffRole({
        actorId: awa.id,
        memberId: awa.id,
        role: "ops",
        reason: "test",
      })
    ).rejects.toBeInstanceOf(StaffMemberError)
    await expect(
      changeStaffRole({
        actorId: paul.id,
        memberId: awa.id,
        role: "ops",
        reason: "test",
      })
    ).rejects.toThrow(/superadmin/)

    // Changement de rôle : motif obligatoire, sessions coupées.
    await expect(
      changeStaffRole({
        actorId: awa.id,
        memberId: paul.id,
        role: "tech",
        reason: "",
      })
    ).rejects.toThrow()
    await changeStaffRole({
      actorId: awa.id,
      memberId: paul.id,
      role: "tech",
      reason: "Passe en équipe technique",
    })
    expect(
      (await prisma.staffMember.findUniqueOrThrow({ where: { id: paul.id } }))
        .role
    ).toBe("tech")

    // Désactivation : accès coupé ; pas d'auto-désactivation.
    await expect(
      disableStaffMember({ actorId: awa.id, memberId: awa.id, reason: "test" })
    ).rejects.toBeInstanceOf(StaffMemberError)
    await disableStaffMember({
      actorId: awa.id,
      memberId: paul.id,
      reason: "Fin de mission",
    })
    expect(
      (await prisma.staffMember.findUniqueOrThrow({ where: { id: paul.id } }))
        .status
    ).toBe("disabled")
    expect(
      await prisma.staffSession.count({ where: { userId: paul.id } })
    ).toBe(0)
  })

  it("la base refuse un rôle inconnu", async () => {
    await expect(
      prisma.staffMember.create({
        data: { id: "x1", name: "X", email: "x1@linkaro.test", role: "god" },
      })
    ).rejects.toThrow()
  })
})
