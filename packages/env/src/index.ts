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

    // Authentification des créateurs (Better Auth). Sert aussi à chiffrer les
    // tokens OAuth en base : la changer rend les tokens existants illisibles.
    CREATOR_AUTH_SECRET: z.string().min(32, "32 caractères minimum"),

    // Réseaux sociaux : chaque fournisseur n'est activé que si ses clés sont présentes.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    FACEBOOK_CLIENT_ID: z.string().optional(),
    FACEBOOK_CLIENT_SECRET: z.string().optional(),
    INSTAGRAM_CLIENT_ID: z.string().optional(),
    INSTAGRAM_CLIENT_SECRET: z.string().optional(),
    TIKTOK_CLIENT_KEY: z.string().optional(),
    TIKTOK_CLIENT_SECRET: z.string().optional(),

    // Fournisseur OAuth simulé (comptes fictifs), pour développer sans clés.
    // Refusé en production.
    ENABLE_DEV_OAUTH: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true")
      .refine((enabled) => !(enabled && isProduction), {
        message: "Le fournisseur simulé est interdit en production",
      }),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Validation au démarrage du serveur, pas pendant `next build` (qui n'utilise
  // aucune de ces valeurs). SKIP_ENV_VALIDATION=1 : CI sans .env complet.
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.NEXT_PHASE === "phase-production-build",
})
