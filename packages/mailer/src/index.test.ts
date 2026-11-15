import { readFile, rm } from "node:fs/promises"

import { beforeEach, describe, expect, it, vi } from "vitest"

const env = vi.hoisted(() => ({
  NODE_ENV: "development" as string,
  SMTP_HOST: undefined as string | undefined,
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: undefined as string | undefined,
  SMTP_PASSWORD: undefined as string | undefined,
  MAIL_FROM: "Linkaro <no-reply@linkaro.test>",
}))
const sendMailMock = vi.hoisted(() => vi.fn())

vi.mock("@linkaro/env", () => ({ env }))
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}))

const { devMailDir, sendMail } = await import("./index")
const DEV_MAIL_DIR = devMailDir()

const mail = {
  to: "awa@example.com",
  subject: "Test",
  text: "Lien : https://exemple.test/x",
}

describe("sendMail", () => {
  beforeEach(() => {
    env.NODE_ENV = "development"
    env.SMTP_HOST = undefined
    sendMailMock.mockReset()
  })

  it("écrit l'e-mail dans .dev-mails/ sans SMTP en développement", async () => {
    await rm(DEV_MAIL_DIR, { recursive: true, force: true })
    await sendMail(mail)
    const { readdir } = await import("node:fs/promises")
    const [file] = await readdir(DEV_MAIL_DIR)
    const content = await readFile(`${DEV_MAIL_DIR}/${file}`, "utf8")
    expect(content).toContain("À : awa@example.com")
    expect(content).toContain("https://exemple.test/x")
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it("refuse d'envoyer sans SMTP en production", async () => {
    env.NODE_ENV = "production"
    await expect(sendMail(mail)).rejects.toThrow("SMTP non configuré")
  })

  it("passe par SMTP quand il est configuré", async () => {
    env.SMTP_HOST = "smtp.exemple.test"
    await sendMail(mail)
    expect(sendMailMock).toHaveBeenCalledWith({ from: env.MAIL_FROM, ...mail })
  })
})
