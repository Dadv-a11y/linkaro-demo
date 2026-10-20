import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

/**
 * Variables d'environnement côté serveur, partagées par web, admin et worker.
 * La validation a lieu au premier accès : une variable manquante ou invalide
 * fait échouer le démarrage avec un message explicite, plutôt qu'une panne
 * silencieuse plus tard.
 */
const isProduction = process.env.NODE_ENV === "production"

// En production, les URLs publiques doivent être en HTTPS (sauf localhost,
// pour tester un build de production sur sa machine).
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])
const publicUrl = z.url().refine(
  (value) => {
    if (!isProduction) return true
    const url = new URL(value)
    return url.protocol === "https:" || LOCAL_HOSTS.has(url.hostname)
  },
  { message: "HTTPS obligatoire en production" }
)

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_MIGRATION_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    WEB_URL: publicUrl.default("http://localhost:3000"),
    ADMIN_URL: publicUrl.default("http://localhost:3001"),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("info"),
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Permet `next build` et les tests sans .env complet (SKIP_ENV_VALIDATION=1).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
