type CspOptions = {
  nonce: string
  isDevelopment: boolean
  /** Origines supplémentaires autorisées pour les appels réseau (fetch, WebSocket). */
  connectSrc?: string[]
  /** Origines supplémentaires autorisées pour les images (avatars des réseaux sociaux…). */
  imgSrc?: string[]
}

/** Génère un nonce imprévisible, unique pour chaque requête. */
export function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Politique de sécurité du contenu stricte : seuls nos propres scripts, et les
 * scripts portant le nonce de la requête, peuvent s'exécuter. Bloque l'essentiel
 * des injections de script (XSS).
 */
export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  connectSrc = [],
  imgSrc = [],
}: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' uniquement en développement : React s'en sert pour les messages d'erreur.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    // Les styles en ligne restent autorisés : risque faible, et requis par plusieurs composants d'interface.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...imgSrc],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...connectSrc],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  }
  const policy = Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ")
  return isDevelopment ? policy : `${policy}; upgrade-insecure-requests`
}
