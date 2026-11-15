import { createHash, randomBytes } from "node:crypto"

import { prisma } from "@linkaro/db"
import { env } from "@linkaro/env"
import { sendMail } from "@linkaro/mailer"
import { recordAudit, type RequestContext } from "@linkaro/observability"
import { z } from "zod"

import {
  can,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  type StaffRole,
} from "./staff-roles"

export const INVITATION_TTL_MS = 48 * 60 * 60 * 1000 // 48 h

/** Erreur métier, au message affichable tel quel. */
export class StaffInvitationError extends Error {}

const InvitationInput = z.object({
  email: z
    .email("Adresse e-mail invalide")
    .transform((value) => value.trim().toLowerCase()),
  role: z.enum(STAFF_ROLES),
  reason: z.string().trim().min(3, "Indique le motif de l'invitation").max(500),
})

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function invitationUrl(token: string): string {
  return `${env.ADMIN_URL}/invitation/${token}`
}

type Inviter =
  { kind: "staff"; id: string } | { kind: "system"; description: string }

async function assertCanInvite(inviter: Inviter) {
  if (inviter.kind === "system") return
  const member = await prisma.staffMember.findUnique({
    where: { id: inviter.id },
    select: { role: true, status: true },
  })
  if (
    !member ||
    member.status !== "active" ||
    !can(member.role, "staff.manage")
  ) {
    throw new StaffInvitationError(
      "Seul un superadmin peut inviter un membre de l'équipe."
    )
  }
}

/**
 * Crée une invitation. Le jeton n'existe qu'une fois, dans le lien renvoyé :
 * seule son empreinte est stockée.
 */
export async function createStaffInvitation(
  input: { email: string; role: StaffRole; reason: string },
  inviter: Inviter,
  context: RequestContext = {}
): Promise<{ id: string; url: string; expiresAt: Date }> {
  const data = InvitationInput.parse(input)
  await assertCanInvite(inviter)

  const existing = await prisma.staffMember.findUnique({
    where: { email: data.email },
  })
  if (existing)
    throw new StaffInvitationError(
      "Cette personne fait déjà partie de l'équipe."
    )

  // Une seule invitation en attente par adresse : les précédentes sont révoquées.
  await prisma.staffInvitation.updateMany({
    where: { email: data.email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
  const invitation = await prisma.staffInvitation.create({
    data: {
      email: data.email,
      role: data.role,
      reason: data.reason,
      tokenHash: hashInvitationToken(token),
      invitedById: inviter.kind === "staff" ? inviter.id : null,
      expiresAt,
    },
    select: { id: true },
  })

  await recordAudit({
    actor:
      inviter.kind === "staff"
        ? { type: "ADMIN", id: inviter.id }
        : { type: "SYSTEM", id: inviter.description },
    action: "staff.invite",
    target: { type: "staff_invitation", id: invitation.id },
    reason: data.reason,
    metadata: { email: data.email, role: data.role },
    context,
  })
  return { id: invitation.id, url: invitationUrl(token), expiresAt }
}

/** Envoie l'invitation par e-mail (invitations faites depuis le dashboard). */
export async function sendStaffInvitationEmail(
  email: string,
  role: StaffRole,
  url: string
) {
  await sendMail({
    to: email,
    subject: "Invitation à rejoindre l'équipe Linkaro",
    text: [
      "Bonjour,",
      "",
      `Tu es invité(e) à rejoindre l'administration Linkaro (rôle : ${STAFF_ROLE_LABELS[role]}).`,
      "Ce lien est personnel, valable 48 heures et utilisable une seule fois :",
      url,
      "",
      "Tu devras ensuite activer la double authentification (application comme Google Authenticator ou Aegis).",
    ].join("\n"),
  })
}

/** État d'une invitation, sans rien modifier (affichage de la page d'invitation). */
export async function findPendingInvitation(token: string) {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
    },
  })
  if (!invitation || invitation.acceptedAt || invitation.revokedAt) return null
  if (invitation.expiresAt.getTime() < Date.now()) return null
  return invitation
}

/**
 * Accepte une invitation : crée le compte de l'équipe (sans mot de passe).
 * L'accès réel passe ensuite par un lien magique envoyé à l'adresse invitée,
 * puis par l'activation de la double authentification.
 */
export async function acceptStaffInvitation(
  token: string,
  name: string,
  context: RequestContext = {}
): Promise<{ email: string }> {
  const displayName = z
    .string()
    .trim()
    .min(2, "Indique ton nom")
    .max(100)
    .parse(name)
  const tokenHash = hashInvitationToken(token)

  const result = await prisma.$transaction(async (tx) => {
    // Consommation atomique : une seule acceptation possible, même en cas de double clic.
    const consumed = await tx.staffInvitation.updateMany({
      where: {
        tokenHash,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { acceptedAt: new Date() },
    })
    if (consumed.count !== 1) {
      throw new StaffInvitationError(
        "Cette invitation n'est plus valable. Demande-en une nouvelle."
      )
    }
    const invitation = await tx.staffInvitation.findUniqueOrThrow({
      where: { tokenHash },
    })
    if (
      await tx.staffMember.findUnique({ where: { email: invitation.email } })
    ) {
      throw new StaffInvitationError(
        "Cette personne fait déjà partie de l'équipe."
      )
    }
    const member = await tx.staffMember.create({
      data: {
        id: randomBytes(16).toString("hex"),
        name: displayName,
        email: invitation.email,
        // L'adresse sera prouvée par le lien magique.
        emailVerified: false,
        role: invitation.role,
      },
      select: { id: true, email: true, role: true },
    })
    return { member, invitationId: invitation.id }
  })

  await recordAudit({
    actor: { type: "ADMIN", id: result.member.id, role: result.member.role },
    action: "staff.invitation_accepted",
    target: { type: "staff_invitation", id: result.invitationId },
    context,
  })
  return { email: result.member.email }
}

/** Révoque une invitation en attente (superadmin). */
export async function revokeStaffInvitation(
  invitationId: string,
  revokerId: string,
  context: RequestContext = {}
) {
  await assertCanInvite({ kind: "staff", id: revokerId })
  const revoked = await prisma.staffInvitation.updateMany({
    where: { id: invitationId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (revoked.count !== 1)
    throw new StaffInvitationError("Invitation introuvable ou déjà utilisée.")
  await recordAudit({
    actor: { type: "ADMIN", id: revokerId },
    action: "staff.invitation_revoked",
    target: { type: "staff_invitation", id: invitationId },
    context,
  })
}
