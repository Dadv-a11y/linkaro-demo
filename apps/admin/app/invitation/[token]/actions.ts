"use server"

import {
  acceptStaffInvitation,
  getStaffAuth,
  StaffInvitationError,
} from "@linkaro/auth"
import { headers } from "next/headers"

import { getRequestContext, logger } from "@/lib/observability"

import { AcceptInvitationInput } from "./schema"

export type AcceptState = {
  status: "idle" | "sent" | "error"
  message?: string
}

/**
 * Accepte l'invitation puis envoie un lien de connexion à l'adresse invitée :
 * c'est ce lien qui prouve la possession de la boîte mail.
 */
export async function acceptInvitation(
  token: string,
  _previous: AcceptState,
  formData: FormData
): Promise<AcceptState> {
  const parsed = AcceptInvitationInput.safeParse({
    token,
    name: formData.get("name"),
  })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message }
  }

  try {
    const { email } = await acceptStaffInvitation(
      parsed.data.token,
      parsed.data.name,
      await getRequestContext()
    )
    await getStaffAuth().api.signInMagicLink({
      body: { email, callbackURL: "/" },
      headers: await headers(),
    })
    return { status: "sent" }
  } catch (error) {
    if (error instanceof StaffInvitationError) {
      return { status: "error", message: error.message }
    }
    logger.error({ err: error }, "Acceptation d'invitation impossible")
    return { status: "error", message: "Une erreur est survenue. Réessaie." }
  }
}
