/**
 * Protection des données sensibles dans les journaux et l'audit.
 *
 * Deux niveaux :
 *  - les secrets (mots de passe, tokens, codes OTP, cookies…) sont remplacés
 *    par « [MASQUÉ] » ;
 *  - les données personnelles utiles à une enquête (téléphone, e-mail) sont
 *    partiellement masquées : on peut reconnaître un compte sans exposer la valeur.
 */

export const MASKED = "[MASQUÉ]"

/** Découpe un nom de clé en mots : « refreshToken », « refresh_token » → [refresh, token]. */
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

const SECRET_WORDS = new Set([
  "password",
  "passwd",
  "secret",
  "token",
  "otp",
  "authorization",
  "cookie",
  "signature",
  "credential",
  "credentials",
  "apikey",
])
const PHONE_WORDS = new Set(["phone", "telephone", "mobile", "msisdn"])
const EMAIL_WORDS = new Set(["email", "mail"])

function isSecretKey(key: string): boolean {
  const words = keyWords(key)
  if (words.some((w) => SECRET_WORDS.has(w))) return true
  const joined = words.join("_")
  // Note : une clé « code » seule n'est PAS masquée (codes d'erreur P2002,
  // ECONNREFUSED… utiles au débogage) ; les codes OAuth passent par l'URL.
  return /(^|_)(api|private)_key($|_)/.test(joined)
}
const isPhoneKey = (key: string) =>
  keyWords(key).some((w) => PHONE_WORDS.has(w))
const isEmailKey = (key: string) =>
  keyWords(key).some((w) => EMAIL_WORDS.has(w))

/** Chemins masqués par Pino dans chaque ligne de journal (syntaxe fast-redact). */
export const LOG_REDACT_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "idToken",
  "*.idToken",
  "otp",
  "*.otp",
  "secret",
  "*.secret",
  "clientSecret",
  "*.clientSecret",
  "authorization",
  "*.authorization",
  "cookie",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',
  "req.headers.authorization",
  "req.headers.cookie",
]

/** +237 6 99 12 34 56 → +237 6•• •• •• 56 (garde l'indicatif, le 1er et les 2 derniers chiffres). */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length < 6) return "•".repeat(digits.length)
  const country = value.trim().startsWith("+") ? digits.slice(0, 3) : ""
  const local = digits.slice(country.length)
  const middle = "•".repeat(Math.max(local.length - 3, 0))
  return `${country ? `+${country} ` : ""}${local[0]}${middle}${local.slice(-2)}`
}

/** awa.ndiaye@gmail.com → a•••@g•••.com */
export function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@")
  if (!domain) return MASKED
  const dot = domain.lastIndexOf(".")
  const name = dot > 0 ? domain.slice(0, dot) : domain
  const tld = dot > 0 ? domain.slice(dot) : ""
  return `${local.slice(0, 1)}•••@${name.slice(0, 1)}•••${tld}`
}

/** Secrets écrits en clair dans un texte : « password=hunter2 », « token: abc ». */
const INLINE_SECRET =
  /\b(password|passwd|secret|token|access_token|refresh_token|id_token|otp|api[_-]?key|authorization)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s&,;"')\]}]+)/gi

/** Paramètres sensibles d'une URL, dont le code d'autorisation OAuth : « ?code=xyz ». */
const URL_SECRET_PARAM =
  /([?&](?:code|state|token|access_token|refresh_token|id_token|otp)=)[^&#\s"']+/gi

export function maskInlineSecrets(text: string): string {
  return text
    .replace(INLINE_SECRET, `$1$2${MASKED}`)
    .replace(URL_SECRET_PARAM, `$1${MASKED}`)
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * Copie « nettoyée » d'un objet avant de l'écrire dans l'audit ou un événement
 * de sécurité : secrets masqués, téléphones et e-mails partiellement masqués,
 * dates converties en texte. Le résultat est du JSON pur (stable pour le hachage).
 */
export function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (depth > 8) return "[TROP PROFOND]"
  if (value === null || value === undefined) return null
  if (key && isSecretKey(key)) return MASKED
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    // Les propriétés d'une erreur (message, pile) ne sont pas énumérables.
    const out: Record<string, unknown> = {
      type: value.name,
      message: maskInlineSecrets(value.message),
      stack: value.stack
        ? truncate(maskInlineSecrets(value.stack), 8000)
        : null,
    }
    for (const [k, v] of Object.entries(value))
      out[k] = sanitize(v, k, depth + 1)
    if (value.cause !== undefined)
      out.cause = sanitize(value.cause, "cause", depth + 1)
    return out
  }
  if (typeof value === "string") {
    if (key && isPhoneKey(key)) return maskPhone(value)
    if (key && isEmailKey(key)) return maskEmail(value)
    return truncate(maskInlineSecrets(value), key === "stack" ? 8000 : 2000)
  }
  if (typeof value === "number" || typeof value === "boolean") return value
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value))
    return value.slice(0, 200).map((item) => sanitize(item, key, depth + 1))
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitize(v, k, depth + 1)
    }
    return out
  }
  return String(value)
}
