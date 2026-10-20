import path from "node:path"
import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// Un seul fichier .env, à la racine du monorepo.
config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Facultatif pour `prisma generate` (CI, installation sans .env) ;
    // les migrations échouent explicitement si l'URL est absente.
    // Les migrations utilisent le rôle propriétaire ; l'application, le rôle restreint.
    url: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL ?? "",
  },
})
