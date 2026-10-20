import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

/**
 * Variables d'environnement côté serveur, partagées par web, admin et worker.
 * La validation a lieu au premier accès : une variable manquante ou invalide
 * fait échouer le démarrage avec un message explicite, plutôt qu'une panne
 * silencieuse plus tard.
 */
const isProduction = process.env.NODE_ENV === "production"

// En production, les URLs publiques doivent être en HTTPS.
const publicUrl = isProduction ? z.url({ protocol: /^https$/ }) : z.url()

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    WEB_URL: publicUrl.default("http://localhost:3000"),
    ADMIN_URL: publicUrl.default("http://localhost:3001"),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("info"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Permet `next build` et les tests sans .env complet (SKIP_ENV_VALIDATION=1).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
