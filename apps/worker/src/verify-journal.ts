import {
  recordSecurityEvent,
  verifyAuditChain,
  type Logger,
} from "@linkaro/observability"

/**
 * Vérifie que le journal d'audit n'a pas été altéré. En cas de rupture, l'alerte
 * est journalisée et inscrite comme événement de sécurité CRITIQUE.
 */
export async function verifyJournal(logger: Logger): Promise<boolean> {
  const result = await verifyAuditChain()
  if (result.ok) {
    logger.info({ checked: result.checked }, "Journal d'audit intègre")
    return true
  }
  logger.fatal(result, "ALERTE : journal d'audit altéré")
  await recordSecurityEvent({
    type: "audit.chain_broken",
    severity: "CRITICAL",
    details: {
      brokenAtId: result.brokenAtId,
      problem: result.problem,
      checked: result.checked,
    },
  })
  return false
}
