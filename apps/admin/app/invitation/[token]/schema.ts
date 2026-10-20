import { z } from "zod"

/** Jeton d'invitation : 32 octets en base64url. */
export const InvitationToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invitation invalide")

export const AcceptInvitationInput = z.object({
  token: InvitationToken,
  name: z.string().trim().min(2, "Indique ton nom").max(100),
})
