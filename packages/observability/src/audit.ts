import { createHash } from "node:crypto"

import { prisma, type ActorType, type AuditResult } from "@linkaro/db"

import { truncateUserAgent, type RequestContext } from "./context"
import { sanitize } from "./redact"

export const GENESIS_HASH = "0".repeat(64)

// Verrou PostgreSQL qui sérialise les écritures du journal : le chaînage exige
// de connaître l'empreinte de la dernière ligne au moment de l'insertion.
const AUDIT_LOCK_KEY = 74_268_41

export type AuditActor = {
  type: ActorType
  id?: string | null
  role?: string | null
}

export type AuditInput = {
  actor: AuditActor
  /** Action au format domaine.verbe : « auth.login », « social.connect »… */
  action: string
  target?: { type: string; id?: string | null }
  result?: AuditResult
  /** Obligatoire pour une action d'administration ; cause pour un échec. */
  reason?: string | null
  changes?: { before?: unknown; after?: unknown } | null
  metadata?: Record<string, unknown> | null
  context?: RequestContext
}

/** Contenu d'une ligne d'audit, tel qu'il est haché. */
export type AuditRecord = {
  createdAt: string
  actorType: string
  actorId: string | null
  actorRole: string | null
  action: string
  targetType: string | null
  targetId: string | null
  result: string
  reason: string | null
  changes: unknown
  metadata: unknown
  requestId: string | null
  ipAddress: string | null
  userAgent: string | null
}

/** JSON canonique : clés triées à tous les niveaux, pour un hachage reproductible. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`
}

/** Empreinte SHA-256 d'une ligne, liée à l'empreinte de la ligne précédente. */
export function computeAuditHash(
  record: AuditRecord,
  prevHash: string
): string {
  return createHash("sha256")
    .update(prevHash)
    .update("\n")
    .update(canonicalJson(record))
    .digest("hex")
}

function toRecord(input: AuditInput, createdAt: Date): AuditRecord {
  const ctx = input.context ?? {}
  return {
    createdAt: createdAt.toISOString(),
    actorType: input.actor.type,
    actorId: input.actor.id ?? null,
    actorRole: input.actor.role ?? null,
    action: input.action,
    targetType: input.target?.type ?? null,
    targetId: input.target?.id ?? null,
    result: input.result ?? "SUCCESS",
    reason: input.reason ?? null,
    changes: input.changes ? sanitize(input.changes) : null,
    metadata: input.metadata ? sanitize(input.metadata) : null,
    requestId: ctx.requestId ?? null,
    ipAddress: ctx.ipAddress ?? null,
    userAgent: truncateUserAgent(ctx.userAgent),
  }
}

/**
 * Inscrit une action au journal d'audit (en ajout seul, chaîné).
 * Lève une erreur si l'écriture échoue : une action sensible ne doit pas
 * passer sans trace.
 */
export async function recordAudit(
  input: AuditInput
): Promise<{ id: bigint; hash: string }> {
  const record = toRecord(input, new Date())
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`
    const last = await tx.auditLog.findFirst({
      orderBy: { id: "desc" },
      select: { hash: true },
    })
    const prevHash = last?.hash ?? GENESIS_HASH
    const hash = computeAuditHash(record, prevHash)
    const created = await tx.auditLog.create({
      data: {
        ...record,
        createdAt: new Date(record.createdAt),
        actorType: record.actorType as ActorType,
        result: record.result as AuditResult,
        changes: record.changes ?? undefined,
        metadata: record.metadata ?? undefined,
        prevHash,
        hash,
      },
      select: { id: true, hash: true },
    })
    return created
  })
}

export type ChainVerification =
  | { ok: true; checked: number }
  | { ok: false; checked: number; brokenAtId: string; problem: "hash" | "link" }

/**
 * Vérifie l'intégrité du journal : chaque ligne doit avoir l'empreinte attendue
 * et pointer vers la ligne précédente. Après une purge (> 12 mois), la première
 * ligne restante sert de point d'ancrage.
 */
export async function verifyAuditChain(
  batchSize = 1000
): Promise<ChainVerification> {
  let checked = 0
  let cursor: bigint | undefined
  let previousHash: string | undefined

  for (;;) {
    const rows = await prisma.auditLog.findMany({
      where: cursor === undefined ? undefined : { id: { gt: cursor } },
      orderBy: { id: "asc" },
      take: batchSize,
    })
    if (rows.length === 0) return { ok: true, checked }

    for (const row of rows) {
      if (previousHash !== undefined && row.prevHash !== previousHash) {
        return {
          ok: false,
          checked,
          brokenAtId: row.id.toString(),
          problem: "link",
        }
      }
      const expected = computeAuditHash(
        {
          createdAt: row.createdAt.toISOString(),
          actorType: row.actorType,
          actorId: row.actorId,
          actorRole: row.actorRole,
          action: row.action,
          targetType: row.targetType,
          targetId: row.targetId,
          result: row.result,
          reason: row.reason,
          changes: row.changes ?? null,
          metadata: row.metadata ?? null,
          requestId: row.requestId,
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
        },
        row.prevHash
      )
      if (expected !== row.hash) {
        return {
          ok: false,
          checked,
          brokenAtId: row.id.toString(),
          problem: "hash",
        }
      }
      previousHash = row.hash
      checked++
    }
    cursor = rows[rows.length - 1]!.id
  }
}
