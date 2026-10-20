import "server-only"

import { prisma } from "@linkaro/db"

/** Alertes de sécurité (avertissements et critiques) des dernières 24 h. */
export async function countRecentSecurityAlerts() {
  return prisma.securityEvent.count({
    where: {
      severity: { in: ["WARNING", "CRITICAL"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })
}
