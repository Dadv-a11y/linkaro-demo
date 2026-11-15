import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { env } from "@linkaro/env"
import { createLogger, maskEmail } from "@linkaro/observability"
import nodemailer, { type Transporter } from "nodemailer"

const logger = createLogger({ app: "mailer" })

export type Mail = {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Dossier où sont écrits les e-mails en développement (exclu de Git), à la
 * racine du monorepo. Calculé à l'appel : import.meta.dirname n'existe pas
 * une fois le module empaqueté par Next.js.
 */
export function devMailDir(start = process.cwd()): string {
  let dir = path.resolve(start)
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir)
    if (parent === dir) return path.resolve(start, ".dev-mails")
    dir = parent
  }
  return path.join(dir, ".dev-mails")
}

let transporter: Transporter | undefined
function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    // STARTTLS exigé quand la connexion n'est pas chiffrée d'emblée.
    requireTLS: !env.SMTP_SECURE,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  })
  return transporter
}

/**
 * Envoie un e-mail par SMTP. Sans serveur SMTP configuré (développement), l'e-mail
 * est écrit dans .dev-mails/ : le lien qu'il contient ne passe jamais par les journaux.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const recipient = maskEmail(mail.to)
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === "production") throw new Error("SMTP non configuré")
    const dir = devMailDir()
    await mkdir(dir, { recursive: true, mode: 0o700 })
    const file = path.join(
      dir,
      `${new Date().toISOString().replace(/[:.]/g, "-")}.txt`
    )
    const content = `À : ${mail.to}\nDe : ${env.MAIL_FROM}\nObjet : ${mail.subject}\n\n${mail.text}\n`
    await writeFile(file, content, { mode: 0o600 })
    logger.info(
      { to: recipient, subject: mail.subject, file },
      "E-mail écrit dans .dev-mails/ (développement)"
    )
    return
  }
  await getTransporter().sendMail({ from: env.MAIL_FROM, ...mail })
  logger.info({ to: recipient, subject: mail.subject }, "E-mail envoyé")
}
