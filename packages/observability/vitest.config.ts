import path from "node:path"
import { config } from "dotenv"
import { defineConfig } from "vitest/config"

config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true })

export default defineConfig({
  test: {
    // Crée une base PostgreSQL jetable pour les tests d'intégration (si disponible).
    globalSetup: ["./test/global-setup.ts"],
    // Les tests d'intégration partagent la même base : exécution séquentielle.
    fileParallelism: false,
  },
})
