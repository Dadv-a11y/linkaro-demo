import { isIP } from "node:net"

/** En-tête interne posé par notre proxy (jamais celui du client) : IP réelle du visiteur. */
export const CLIENT_IP_HEADER = "x-linkaro-client-ip"

/**
 * Détermine l'IP réelle du client à partir de X-Forwarded-For.
 *
 * Chaque proxy ajoute l'adresse de son interlocuteur À LA FIN de l'en-tête.
 * Les valeurs de gauche peuvent être inventées par le client : on ne fait
 * donc confiance qu'aux `trustedHops` dernières entrées (ajoutées par nos
 * propres proxys) et on prend celle juste avant elles.
 *
 * Sans proxy de confiance (trustedHops = 0), l'en-tête est ignoré : on renvoie
 * null plutôt qu'une valeur falsifiable.
 */
export function getClientIp(
  forwardedFor: string | null | undefined,
  trustedHops: number
): string | null {
  if (!forwardedFor || trustedHops <= 0) return null
  const chain = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  const candidate = chain[chain.length - trustedHops]
  if (!candidate) return null
  // Retire un éventuel port (« 1.2.3.4:5678 ») et les crochets IPv6.
  const cleaned = candidate
    .replace(/^\[([^\]]+)\](:\d+)?$/, "$1")
    .replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1")
  return isIP(cleaned) ? cleaned : null
}
