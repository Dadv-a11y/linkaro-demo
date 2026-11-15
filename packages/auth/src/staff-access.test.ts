import { describe, expect, it } from "vitest"

import { evaluateStaffAccess } from "./staff-access"
import { can } from "./staff-roles"

const now = new Date("2026-10-20T12:00:00Z")
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)
const member = { role: "support", status: "active", twoFactorEnabled: true }
const session = {
  updatedAt: minutesAgo(5),
  secondFactorVerifiedAt: minutesAgo(5),
}

describe("evaluateStaffAccess", () => {
  it("autorise un membre actif, validé, avec la permission", () => {
    expect(
      evaluateStaffAccess({ member, session, permission: "creators.read", now })
        .kind
    ).toBe("allow")
  })
  it("exige une session", () => {
    expect(evaluateStaffAccess({ member, session: null, now }).kind).toBe(
      "sign-in"
    )
  })
  it("refuse un compte désactivé, avant tout le reste", () => {
    expect(
      evaluateStaffAccess({
        member: { ...member, status: "disabled" },
        session,
        now,
      }).kind
    ).toBe("disabled")
  })
  it("ferme une session inactive depuis plus de 30 min", () => {
    expect(
      evaluateStaffAccess({
        member,
        session: { ...session, updatedAt: minutesAgo(31) },
        now,
      }).kind
    ).toBe("idle")
  })
  it("impose d'activer puis de valider la double authentification", () => {
    expect(
      evaluateStaffAccess({
        member: { ...member, twoFactorEnabled: false },
        session,
        now,
      }).kind
    ).toBe("enroll-second-factor")
    expect(
      evaluateStaffAccess({
        member,
        session: { ...session, secondFactorVerifiedAt: null },
        now,
      }).kind
    ).toBe("verify-second-factor")
  })
  it("applique le moindre privilège", () => {
    expect(
      evaluateStaffAccess({ member, session, permission: "audit.read", now })
        .kind
    ).toBe("forbidden")
    expect(can("tech", "audit.read")).toBe(true)
    expect(can("tech", "staff.manage")).toBe(false)
    expect(can("superadmin", "staff.manage")).toBe(true)
    expect(can("inconnu", "creators.read")).toBe(false)
  })
})
