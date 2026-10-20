import { STAFF_IDLE_TIMEOUT_MS } from "./staff-auth"
import { can, type Permission } from "./staff-roles"

export type StaffAccessDecision =
  | { kind: "allow" }
  | { kind: "sign-in" } // pas de session
  | { kind: "disabled" } // compte désactivé
  | { kind: "idle" } // inactif depuis plus de 30 min
  | { kind: "enroll-second-factor" } // double authentification à activer
  | { kind: "verify-second-factor" } // code à saisir pour cette session
  | { kind: "forbidden" } // rôle sans la permission demandée

/**
 * Règles d'accès à l'administration, dans l'ordre. Fonction pure : appelée par
 * chaque page et action de l'app admin, et testée unitairement.
 */
export function evaluateStaffAccess(input: {
  member: {
    role: string
    status: string
    twoFactorEnabled: boolean | null
  } | null
  session: { updatedAt: Date; secondFactorVerifiedAt: Date | null } | null
  permission?: Permission
  now?: Date
}): StaffAccessDecision {
  const { member, session, permission, now = new Date() } = input
  if (!member || !session) return { kind: "sign-in" }
  if (member.status !== "active") return { kind: "disabled" }
  if (now.getTime() - session.updatedAt.getTime() > STAFF_IDLE_TIMEOUT_MS)
    return { kind: "idle" }
  if (!member.twoFactorEnabled) return { kind: "enroll-second-factor" }
  if (!session.secondFactorVerifiedAt) return { kind: "verify-second-factor" }
  if (permission && !can(member.role, permission)) return { kind: "forbidden" }
  return { kind: "allow" }
}
