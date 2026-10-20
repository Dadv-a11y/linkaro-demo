import { prisma } from "@linkaro/db"
import { recordAudit, type RequestContext } from "@linkaro/observability"
import { z } from "zod"

import { can, STAFF_ROLES, type StaffRole } from "./staff-roles"

/** Erreur métier, au message affichable tel quel. */
export class StaffMemberError extends Error {}

const Reason = z.string().trim().min(3, "Indique le motif").max(500)

async function loadActor(actorId: string) {
  const actor = await prisma.staffMember.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, status: true },
  })
  if (!actor || actor.status !== "active" || !can(actor.role, "staff.manage")) {
    throw new StaffMemberError("Action réservée à un superadmin.")
  }
  return actor
}

async function activeSuperadminCount() {
  return prisma.staffMember.count({
    where: { role: "superadmin", status: "active" },
  })
}

/** Change le rôle d'un membre (superadmin, avec motif). */
export async function changeStaffRole(
  input: { actorId: string; memberId: string; role: StaffRole; reason: string },
  context: RequestContext = {}
) {
  const reason = Reason.parse(input.reason)
  const role = z.enum(STAFF_ROLES).parse(input.role)
  await loadActor(input.actorId)
  if (input.actorId === input.memberId) {
    throw new StaffMemberError("Tu ne peux pas modifier ton propre rôle.")
  }
  const member = await prisma.staffMember.findUnique({
    where: { id: input.memberId },
  })
  if (!member) throw new StaffMemberError("Membre introuvable.")
  if (
    member.role === "superadmin" &&
    role !== "superadmin" &&
    (await activeSuperadminCount()) <= 1
  ) {
    throw new StaffMemberError(
      "Il doit toujours rester au moins un superadmin actif."
    )
  }

  await prisma.staffMember.update({ where: { id: member.id }, data: { role } })
  // Les sessions en cours sont fermées : le nouveau rôle s'applique à la prochaine connexion.
  await prisma.staffSession.deleteMany({ where: { userId: member.id } })
  await recordAudit({
    actor: { type: "ADMIN", id: input.actorId },
    action: "staff.role_changed",
    target: { type: "staff_member", id: member.id },
    reason,
    changes: { before: { role: member.role }, after: { role } },
    context,
  })
}

/** Désactive un membre : accès coupé immédiatement (toutes ses sessions sont révoquées). */
export async function disableStaffMember(
  input: { actorId: string; memberId: string; reason: string },
  context: RequestContext = {}
) {
  const reason = Reason.parse(input.reason)
  await loadActor(input.actorId)
  if (input.actorId === input.memberId) {
    throw new StaffMemberError("Tu ne peux pas désactiver ton propre compte.")
  }
  const member = await prisma.staffMember.findUnique({
    where: { id: input.memberId },
  })
  if (!member || member.status === "disabled")
    throw new StaffMemberError("Membre introuvable ou déjà désactivé.")
  if (member.role === "superadmin" && (await activeSuperadminCount()) <= 1) {
    throw new StaffMemberError(
      "Il doit toujours rester au moins un superadmin actif."
    )
  }

  await prisma.$transaction([
    prisma.staffMember.update({
      where: { id: member.id },
      data: { status: "disabled" },
    }),
    prisma.staffSession.deleteMany({ where: { userId: member.id } }),
  ])
  await recordAudit({
    actor: { type: "ADMIN", id: input.actorId },
    action: "staff.disabled",
    target: { type: "staff_member", id: member.id },
    reason,
    changes: { before: { status: "active" }, after: { status: "disabled" } },
    context,
  })
}
