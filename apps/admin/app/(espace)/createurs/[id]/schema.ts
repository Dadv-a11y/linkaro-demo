import { z } from "zod"

export const CreatorIdParam = z.string().min(1).max(100)

export const ReasonInput = z.object({
  reason: z.string().trim().min(3, "Indique le motif").max(500),
})

export const DeleteInput = ReasonInput.extend({
  confirmName: z.string().trim().min(1, "Saisis le nom pour confirmer"),
})
