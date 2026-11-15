import { prisma } from "@linkaro/db"

import { logger } from "@/lib/observability"

// Toujours exécutée à la demande : l'état de la base ne doit pas être mis en cache.
export const dynamic = "force-dynamic"

export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({
      status: "ok",
      app: "admin",
      database: "ok",
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    logger.error({ err: error }, "Base de données injoignable")
    return Response.json(
      { status: "degraded", app: "admin", database: "unreachable" },
      { status: 503 }
    )
  }
}
