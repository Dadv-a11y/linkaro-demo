import path from "node:path"
import { config } from "dotenv"
import { defineConfig } from "vitest/config"

config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true })

export default defineConfig({
  test: {
    // Base PostgreSQL jetable pour les tests d'intégration (si disponible).
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
  },
})
