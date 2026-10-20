import { prisma } from "@linkaro/db"
import { env } from "@linkaro/env"
import { createLogger, installConsoleRedaction } from "@linkaro/observability"

import { verifyJournal } from "./verify-journal"

// Processus des tâches de fond (synchronisation des statistiques, tokens,
// Indice Linkaro, purges). Les files de tâches pg-boss seront branchées ici.

installConsoleRedaction()
const logger = createLogger({ app: "worker" })

async function main() {
  await prisma.$queryRaw`SELECT 1`
  logger.info(
    { env: env.NODE_ENV },
    "Worker démarré, base de données joignable"
  )
  await verifyJournal(logger)
}

async function shutdown(signal: string) {
  logger.info({ signal }, "Arrêt demandé")
  await prisma.$disconnect()
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

main().catch(async (error: unknown) => {
  logger.fatal({ err: error }, "Échec du démarrage du worker")
  await prisma.$disconnect()
  process.exit(1)
})
