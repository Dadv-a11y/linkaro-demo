import { prisma } from "@linkaro/db"
import { recordAudit, type RequestContext } from "@linkaro/observability"
import { z } from "zod"

import { can, type Permission } from "./staff-roles"

/**
 * Actions de l'équipe sur les comptes créateurs. Chaque fonction revérifie le
 * membre (actif, permission) en base, valide ses entrées et écrit au journal
 * d'audit : elles ne dépendent pas d'un contrôle fait ailleurs.
 */

/** Erreur métier, au message affichable tel quel. */
export class CreatorAdminError extends Error {}

const Reason = z.string().trim().min(3, "Indique le motif").max(500)
const CreatorId = z.string().min(1).max(100)

/** Domaine des adresses factices (comptes sans e-mail fourni par le réseau). */
const PLACEHOLDER_EMAIL_DOMAIN = "@comptes.linkaro.invalid"

export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(PLACEHOLDER_EMAIL_DOMAIN)
}

async function loadActor(actorId: string, permission: Permission) {
  const actor = await prisma.staffMember.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, status: true },
  })
  if (!actor || actor.status !== "active" || !can(actor.role, permission)) {
    throw new CreatorAdminError("Action non autorisée.")
  }
  return actor
}

async function loadCreator(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: CreatorId.parse(creatorId) },
    select: { id: true, name: true, email: true, status: true },
  })
  if (!creator) throw new CreatorAdminError("Créateur introuvable.")
  return creator
}

/** Suspend un créateur : accès coupé immédiatement, données conservées. */
export async function suspendCreator(
  input: { actorId: string; creatorId: string; reason: string },
  context: RequestContext = {}
) {
  const reason = Reason.parse(input.reason)
  const actor = await loadActor(input.actorId, "creators.suspend")
  const creator = await loadCreator(input.creatorId)
  if (creator.status === "suspended") {
    throw new CreatorAdminError("Ce créateur est déjà suspendu.")
  }
  await prisma.$transaction([
    prisma.creator.update({
      where: { id: creator.id },
      data: { status: "suspended" },
    }),
    prisma.creatorSession.deleteMany({ where: { userId: creator.id } }),
  ])
  await recordAudit({
    actor: { type: "ADMIN", id: actor.id, role: actor.role },
    action: "creator.suspended",
    target: { type: "creator", id: creator.id },
    reason,
    changes: { before: { status: "active" }, after: { status: "suspended" } },
    context,
  })
}

/** Réactive un créateur suspendu. */
export async function reactivateCreator(
  input: { actorId: string; creatorId: string; reason: string },
  context: RequestContext = {}
) {
  const reason = Reason.parse(input.reason)
  const actor = await loadActor(input.actorId, "creators.suspend")
  const creator = await loadCreator(input.creatorId)
  if (creator.status !== "suspended") {
    throw new CreatorAdminError("Ce créateur n'est pas suspendu.")
  }
  await prisma.creator.update({
    where: { id: creator.id },
    data: { status: "active" },
  })
  await recordAudit({
    actor: { type: "ADMIN", id: actor.id, role: actor.role },
    action: "creator.reactivated",
    target: { type: "creator", id: creator.id },
    reason,
    changes: { before: { status: "suspended" }, after: { status: "active" } },
    context,
  })
}

/**
 * Affiche l'e-mail complet d'un créateur. La consultation est journalisée :
 * dans les listes, l'adresse reste masquée.
 */
export async function revealCreatorEmail(
  input: { actorId: string; creatorId: string },
  context: RequestContext = {}
): Promise<string | null> {
  const actor = await loadActor(input.actorId, "creators.read")
  const creator = await loadCreator(input.creatorId)
  await recordAudit({
    actor: { type: "ADMIN", id: actor.id, role: actor.role },
    action: "creator.email_viewed",
    target: { type: "creator", id: creator.id },
    context,
  })
  return isPlaceholderEmail(creator.email) ? null : creator.email
}

/**
 * Export des données d'un créateur (droit d'accès, loi n° 2024/017). Les tokens
 * des réseaux ne sont jamais exportés.
 */
export async function exportCreatorData(
  input: { actorId: string; creatorId: string },
  context: RequestContext = {}
) {
  const actor = await loadActor(input.actorId, "creators.export")
  const { id } = await loadCreator(input.creatorId)

  const [creator, accounts, sessions, history] = await Promise.all([
    prisma.creator.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        adultConfirmedAt: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.creatorAccount.findMany({
      where: { userId: id },
      select: {
        providerId: true,
        accountId: true,
        scope: true,
        createdAt: true,
      },
    }),
    prisma.creatorSession.findMany({
      where: { userId: id },
      select: {
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { targetType: "creator", targetId: id },
          { actorType: "USER", actorId: id },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, action: true, actorType: true },
    }),
  ])

  await recordAudit({
    actor: { type: "ADMIN", id: actor.id, role: actor.role },
    action: "creator.exported",
    target: { type: "creator", id },
    context,
  })

  return {
    exportedAt: new Date().toISOString(),
    creator: {
      ...creator,
      email: isPlaceholderEmail(creator.email) ? null : creator.email,
    },
    connectedNetworks: accounts,
    activeSessions: sessions,
    history,
  }
}

/**
 * Suppression définitive (droit à l'effacement) : le compte, ses réseaux, leurs
 * tokens et ses sessions. Le journal d'audit ne garde que la trace de la
 * suppression, sans nom ni e-mail.
 */
export async function deleteCreator(
  input: {
    actorId: string
    creatorId: string
    reason: string
    confirmName: string
  },
  context: RequestContext = {}
) {
  const reason = Reason.parse(input.reason)
  const actor = await loadActor(input.actorId, "creators.delete")
  const creator = await loadCreator(input.creatorId)
  if (input.confirmName.trim() !== creator.name.trim()) {
    throw new CreatorAdminError("Le nom saisi ne correspond pas.")
  }
  // Sessions et réseaux supprimés en cascade (contraintes de la base).
  await prisma.creator.delete({ where: { id: creator.id } })
  await recordAudit({
    actor: { type: "ADMIN", id: actor.id, role: actor.role },
    action: "creator.deleted",
    target: { type: "creator", id: creator.id },
    reason,
    context,
  })
}
