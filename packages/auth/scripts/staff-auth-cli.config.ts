// Point d'entrée du CLI Better Auth pour l'annuaire de l'équipe (génération du schéma).
import path from "node:path"
import { config } from "dotenv"

config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
  quiet: true,
})

const { getStaffAuth } = await import("../src/staff-auth")
export const auth = getStaffAuth()
