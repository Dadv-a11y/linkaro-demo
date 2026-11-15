import { z } from "zod"

/** Paramètres de la liste des créateurs (URL), valeurs inconnues ignorées. */
export const CreatorListQuery = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  statut: z.enum(["active", "suspended"]).optional().catch(undefined),
  reseau: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional()
    .catch(undefined),
  inscription: z.enum(["terminee", "en-attente"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
})

export type CreatorListQuery = z.infer<typeof CreatorListQuery>
