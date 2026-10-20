import { prisma } from "@linkaro/db"

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
    console.error("[health] base de données injoignable", error)
    return Response.json(
      { status: "degraded", app: "admin", database: "unreachable" },
      { status: 503 }
    )
  }
}
