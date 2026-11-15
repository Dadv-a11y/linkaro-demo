import { installConsoleRedaction } from "@linkaro/observability"

// Démarrage du serveur (runtime Node.js uniquement).

// Masquage des secrets sur toute la sortie console.
installConsoleRedaction()

// Valide l'environnement dès le démarrage : une configuration invalide ou
// dangereuse (ex. fournisseur simulé en production) empêche le serveur de démarrer.
try {
  await import("@linkaro/env")
} catch (error) {
  console.error("Configuration invalide : arrêt du serveur.", error)
  process.exit(1)
}

// Sans proxy de confiance déclaré, l'IP réelle des visiteurs est inconnue :
// la limitation de débit les regrouperait tous sous une même adresse.
const { env } = await import("@linkaro/env")
if (env.NODE_ENV === "production" && env.TRUSTED_PROXY_HOPS === 0) {
  console.warn(
    "TRUSTED_PROXY_HOPS=0 en production : IP des visiteurs inconnue. Derrière Caddy, utiliser TRUSTED_PROXY_HOPS=1."
  )
}
