/**
 * Rôles de l'équipe Linkaro et permissions associées (moindre privilège).
 * Le rôle est relu en base à chaque requête : un changement s'applique immédiatement.
 */

export const STAFF_ROLES = ["superadmin", "ops", "support", "tech"] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  superadmin: "Superadmin",
  ops: "Pilotage",
  support: "Support",
  tech: "Technique",
}

export type Permission =
  | "staff.read" // voir l'équipe
  | "staff.manage" // inviter, changer un rôle, désactiver
  | "creators.read" // fiches créateurs
  | "creators.suspend" // suspendre / réactiver un créateur
  | "creators.export" // exporter les données d'un créateur (droit d'accès)
  | "creators.delete" // supprimer définitivement un créateur (droit à l'effacement)
  | "metrics.read" // indicateurs de pilotage
  | "audit.read" // journal d'audit
  | "security.read" // événements de sécurité
  | "logs.read" // journaux techniques, tâches de fond

const PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  superadmin: new Set<Permission>([
    "staff.read",
    "staff.manage",
    "creators.read",
    "creators.suspend",
    "creators.export",
    "creators.delete",
    "metrics.read",
    "audit.read",
    "security.read",
    "logs.read",
  ]),
  ops: new Set<Permission>(["staff.read", "creators.read", "metrics.read"]),
  support: new Set<Permission>(["creators.read", "creators.suspend"]),
  tech: new Set<Permission>(["audit.read", "security.read", "logs.read"]),
}

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value)
}

export function can(role: string, permission: Permission): boolean {
  return isStaffRole(role) && PERMISSIONS[role].has(permission)
}
