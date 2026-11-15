import { prisma, type SecuritySeverity } from "@linkaro/db"

import { truncateUserAgent, type RequestContext } from "./context"
import { maskEmail, maskPhone, sanitize } from "./redact"

export type SecurityEventInput = {
  /** Type au format domaine.événement : « auth.login_failed », « auth.rate_limited »… */
  type: string
  severity?: SecuritySeverity
  userId?: string | null
  /** Identifiant de connexion tenté (téléphone ou e-mail) : il est masqué avant écriture. */
  identifier?: string | null
  details?: Record<string, unknown> | null
  context?: RequestContext
}

/** Masque un identifiant de connexion selon sa forme (e-mail ou téléphone). */
export function maskIdentifier(identifier: string): string {
  return identifier.includes("@")
    ? maskEmail(identifier)
    : maskPhone(identifier)
}

export async function recordSecurityEvent(input: SecurityEventInput) {
  const ctx = input.context ?? {}
  return prisma.securityEvent.create({
    data: {
      type: input.type,
      severity: input.severity ?? "INFO",
      userId: input.userId ?? null,
      identifier: input.identifier ? maskIdentifier(input.identifier) : null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: truncateUserAgent(ctx.userAgent),
      requestId: ctx.requestId ?? null,
      details: input.details ? (sanitize(input.details) as object) : undefined,
    },
    select: { id: true },
  })
}
