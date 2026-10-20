import { STAFF_ROLES } from "@linkaro/auth"
import { z } from "zod"

export const InviteInput = z.object({
  email: z.email("Adresse e-mail invalide"),
  role: z.enum(STAFF_ROLES, "Choisis un rôle"),
  reason: z.string().trim().min(3, "Indique le motif de l'invitation").max(500),
})

export const RevokeInput = z.object({ invitationId: z.uuid() })
