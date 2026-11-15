import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Cache propre au paquet : le cache par défaut est partagé à la racine du dépôt, et
    // plusieurs paquets lancés en parallèle par Turborepo s'y gênaient (ENOTEMPTY).
    fsModuleCachePath: path.resolve(
      import.meta.dirname,
      "node_modules/.vitest-cache"
    ),
  },
})
