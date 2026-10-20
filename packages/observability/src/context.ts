/** Informations sur la requête en cours, jointes aux journaux, à l'audit et aux événements. */
export type RequestContext = {
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/** Évite de stocker des en-têtes User-Agent démesurés. */
export function truncateUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return null
  return userAgent.length > 512 ? userAgent.slice(0, 512) : userAgent
}
