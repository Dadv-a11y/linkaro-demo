import { prisma } from "@linkaro/db"
import { env } from "@linkaro/env"

// Processus des tâches de fond (synchronisation des statistiques, tokens,
// Indice Linkaro). Les files de tâches pg-boss seront branchées ici.

async function main() {
  await prisma.$queryRaw`SELECT 1`
  console.info(`[worker] démarré (${env.NODE_ENV}), base de données joignable`)
}

async function shutdown(signal: string) {
  console.info(`[worker] arrêt demandé (${signal})`)
  await prisma.$disconnect()
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

main().catch(async (error: unknown) => {
  console.error("[worker] échec du démarrage", error)
  await prisma.$disconnect()
  process.exit(1)
})
