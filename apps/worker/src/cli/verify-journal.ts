import { prisma } from "@linkaro/db"
import { createLogger } from "@linkaro/observability"

import { verifyJournal } from "../verify-journal"

// Vérification ponctuelle : pnpm journal:verify (code de sortie 1 si altéré).
const logger = createLogger({ app: "worker" })
const ok = await verifyJournal(logger)
await prisma.$disconnect()
process.exit(ok ? 0 : 1)
