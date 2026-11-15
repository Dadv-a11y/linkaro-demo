import { z } from "zod"

/** Code TOTP à 6 chiffres (les espaces saisis sont ignorés). */
export const TotpCode = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Le code contient 6 chiffres."))

/** Code de secours, tel qu'affiché à l'activation. */
export const BackupCode = z
  .string()
  .trim()
  .min(6, "Code de secours invalide.")
  .max(32, "Code de secours invalide.")
