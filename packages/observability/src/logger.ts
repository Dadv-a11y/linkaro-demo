import pino, { type Logger } from "pino"
import pretty from "pino-pretty"

import { LOG_REDACT_PATHS, MASKED, sanitize } from "./redact"

export type { Logger }

type LoggerOptions = {
  /** Nom de l'application qui écrit : web, admin, worker… */
  app: string
}

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal", "silent"]

/**
 * Logger JSON structuré (une ligne par événement), masquant automatiquement
 * les secrets. En développement, sortie lisible en couleur ; en production,
 * JSON sur la sortie standard, collecté par PM2 (rotation par pm2-logrotate).
 */
export function createLogger({ app }: LoggerOptions): Logger {
  const level = LEVELS.includes(process.env.LOG_LEVEL ?? "")
    ? (process.env.LOG_LEVEL as string)
    : "info"
  const isDevelopment = process.env.NODE_ENV === "development"

  const options: pino.LoggerOptions = {
    level,
    base: { app, env: process.env.NODE_ENV ?? "development" },
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: "msg",
    redact: { paths: LOG_REDACT_PATHS, censor: MASKED },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    formatters: {
      level: (label) => ({ level: label }),
      // Filet de sécurité : toute clé sensible, même imbriquée et non prévue
      // dans LOG_REDACT_PATHS, est masquée (téléphones et e-mails partiellement).
      log: (object) => sanitize(object) as Record<string, unknown>,
    },
  }

  // Flux synchrone (pas de thread de transport) : compatible avec Next.js.
  return isDevelopment
    ? pino(
        options,
        pretty({ sync: true, colorize: true, translateTime: "SYS:HH:MM:ss" })
      )
    : pino(options)
}
