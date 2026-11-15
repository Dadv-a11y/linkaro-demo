import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/prisma/client"

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL manquant : impossible de se connecter à PostgreSQL"
    )
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Une seule instance par processus. En développement, le rechargement à chaud
// réévalue les modules : on garde l'instance sur globalThis pour ne pas ouvrir
// un nouveau pool de connexions à chaque modification.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient()
  return globalForPrisma.prisma
}

// Création paresseuse : importer ce module (par exemple pendant `next build`)
// n'ouvre aucune connexion et n'exige pas DATABASE_URL ; le client est créé
// au premier appel réel.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client) as unknown
    return typeof value === "function" ? value.bind(client) : value
  },
})
