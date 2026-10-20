import { maskInlineSecrets } from "./redact"

const INSTALLED = Symbol.for("linkaro.consoleRedaction")

function redactArg(arg: unknown): unknown {
  if (typeof arg === "string") return maskInlineSecrets(arg)
  if (arg instanceof Error) {
    const message = maskInlineSecrets(arg.message)
    const stack = arg.stack ? maskInlineSecrets(arg.stack) : arg.stack
    if (message === arg.message && stack === arg.stack) return arg
    // Copie masquée : on ne modifie pas l'erreur d'origine (elle peut encore être traitée).
    const copy = Object.create(Object.getPrototypeOf(arg) as object) as Error
    Object.assign(copy, arg)
    Object.defineProperty(copy, "message", {
      value: message,
      enumerable: false,
    })
    Object.defineProperty(copy, "stack", { value: stack, enumerable: false })
    return copy
  }
  return arg
}

/**
 * Masque les secrets écrits en clair dans tout ce qui passe par la console,
 * y compris les messages d'erreur affichés par Next.js lui-même, qui ne
 * passent pas par notre logger. À appeler une fois au démarrage du serveur.
 */
export function installConsoleRedaction(): void {
  const target = console as Console & { [INSTALLED]?: boolean }
  if (target[INSTALLED]) return
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => original(...args.map(redactArg))
  }
  target[INSTALLED] = true
}
