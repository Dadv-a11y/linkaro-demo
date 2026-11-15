import path from "node:path"
import { config } from "dotenv"
import { defineConfig } from "vitest/config"

config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true })

export default defineConfig({
  test: {
    // Cache propre au paquet : le cache par défaut est partagé à la racine du dépôt, et
    // plusieurs paquets lancés en parallèle par Turborepo s'y gênaient (ENOTEMPTY).
    fsModuleCachePath: path.resolve(
      import.meta.dirname,
      "node_modules/.vitest-cache"
    ),
    // Crée une base PostgreSQL jetable pour les tests d'intégration (si disponible).
    globalSetup: ["./test/global-setup.ts"],
    // Les tests d'intégration partagent la même base : exécution séquentielle.
    fileParallelism: false,
  },
})
