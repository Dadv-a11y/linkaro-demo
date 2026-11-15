"use server"

import {
  createStaffInvitation,
  revokeStaffInvitation,
  sendStaffInvitationEmail,
  StaffInvitationError,
} from "@linkaro/auth"
import { revalidatePath } from "next/cache"

import { requireStaff } from "@/lib/auth"
import { getRequestContext, logger } from "@/lib/observability"

import { InviteInput, RevokeInput } from "./schema"

export type InviteState = {
  status: "idle" | "sent" | "error"
  message?: string
}

/** Invite un membre (superadmin) : le lien part par e-mail, il n'est jamais affiché. */
export async function inviteMember(
  _previous: InviteState,
  formData: FormData
): Promise<InviteState> {
  const { member } = await requireStaff("staff.manage")
  const parsed = InviteInput.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message }
  }

  try {
    const { url } = await createStaffInvitation(
      parsed.data,
      { kind: "staff", id: member.id },
      await getRequestContext()
    )
    await sendStaffInvitationEmail(parsed.data.email, parsed.data.role, url)
  } catch (error) {
    if (error instanceof StaffInvitationError) {
      return { status: "error", message: error.message }
    }
    logger.error({ err: error }, "Invitation impossible")
    return { status: "error", message: "Une erreur est survenue. Réessaie." }
  }
  revalidatePath("/equipe")
  return { status: "sent", message: "Invitation envoyée par e-mail." }
}

/** Révoque une invitation en attente (superadmin). */
export async function revokeInvitation(formData: FormData) {
  const { member } = await requireStaff("staff.manage")
  const parsed = RevokeInput.safeParse({
    invitationId: formData.get("invitationId"),
  })
  if (!parsed.success) return
  try {
    await revokeStaffInvitation(
      parsed.data.invitationId,
      member.id,
      await getRequestContext()
    )
  } catch (error) {
    if (!(error instanceof StaffInvitationError)) throw error
  }
  revalidatePath("/equipe")
}
