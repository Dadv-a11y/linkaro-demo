export const REQUEST_ID_HEADER = "x-request-id"

/**
 * Identifiant unique de requête, propagé dans les journaux et l'audit.
 * On n'accepte jamais celui envoyé par le client : il pourrait être forgé
 * pour brouiller une enquête.
 */
export function createRequestId(): string {
  return crypto.randomUUID()
}
