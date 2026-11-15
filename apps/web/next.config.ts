import path from "node:path"
import { loadEnvConfig } from "@next/env"
import { securityHeaders } from "@linkaro/security"
import type { NextConfig } from "next"

const monorepoRoot = path.resolve(import.meta.dirname, "../..")

// Un seul fichier .env, à la racine du monorepo. Next.js a déjà chargé (et mis
// en cache) les .env du dossier de l'app : on force le rechargement depuis la racine.
loadEnvConfig(
  monorepoRoot,
  process.env.NODE_ENV !== "production",
  undefined,
  true
)

const nextConfig: NextConfig = {
  // Build autonome, copié tel quel sur le VPS (voir docs/architecture).
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@linkaro/ui",
    "@linkaro/db",
    "@linkaro/env",
    "@linkaro/security",
    "@linkaro/observability",
  ],
  serverExternalPackages: ["pg", "pino", "pino-pretty", "thread-stream"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          isProduction: process.env.NODE_ENV === "production",
        }),
      },
    ]
  },
}

export default nextConfig
