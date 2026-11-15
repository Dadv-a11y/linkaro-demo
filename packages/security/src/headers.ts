export type HeaderEntry = { key: string; value: string }

type SecurityHeadersOptions = {
  isProduction: boolean
  /** Empêche l'indexation par les moteurs de recherche (back-office). */
  noIndex?: boolean
}

/**
 * En-têtes de sécurité appliqués à toutes les réponses (pages et API).
 * La CSP, qui dépend d'un nonce par requête, est ajoutée séparément par le proxy.
 */
export function securityHeaders({
  isProduction,
  noIndex = false,
}: SecurityHeadersOptions): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    // Le navigateur ne devine pas le type des fichiers (évite l'exécution de contenu déguisé).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Interdit l'affichage dans une iframe (clickjacking) ; doublé par frame-ancestors dans la CSP.
    { key: "X-Frame-Options", value: "DENY" },
    // N'envoie que l'origine aux autres sites, jamais le chemin complet.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Fonctions du navigateur dont l'app n'a pas besoin : désactivées.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    // Isole la fenêtre des pages ouvertes depuis un autre site.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ]
  if (isProduction) {
    // Force le HTTPS pendant un an. Pas de « preload » tant que tous les
    // sous-domaines ne sont pas garantis en HTTPS.
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    })
  }
  if (noIndex) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" })
  }
  return headers
}
