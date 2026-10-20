// Point d'entrée du CLI Better Auth (génération du schéma Prisma) :
//   pnpm --filter @linkaro/auth auth:schema
import path from "node:path"
import { config } from "dotenv"

config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
  quiet: true,
})

const { getCreatorAuth } = await import("../src/creator-auth")
export const auth = getCreatorAuth()
