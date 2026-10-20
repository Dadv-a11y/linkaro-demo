import { afterEach, describe, expect, it, vi } from "vitest"

async function loadEnv(vars: Record<string, string>) {
  vi.resetModules()
  // Ces tests vérifient la validation : on l'active même si la CI la désactive ailleurs.
  vi.stubEnv("SKIP_ENV_VALIDATION", "")
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value)
  return (await import("./index")).env
}

const base = { DATABASE_URL: "postgresql://app:secret@localhost:5432/linkaro" }

describe("validation de l'environnement", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepte une configuration de développement", async () => {
    const env = await loadEnv({
      ...base,
      NODE_ENV: "development",
      WEB_URL: "http://localhost:3000",
    })
    expect(env.WEB_URL).toBe("http://localhost:3000")
    expect(env.TRUSTED_PROXY_HOPS).toBe(0)
  })

  it("exige HTTPS en production pour une URL publique", async () => {
    await expect(
      loadEnv({
        ...base,
        NODE_ENV: "production",
        WEB_URL: "http://linkaro.app",
      })
    ).rejects.toThrow()
    const env = await loadEnv({
      ...base,
      NODE_ENV: "production",
      WEB_URL: "https://linkaro.app",
    })
    expect(env.WEB_URL).toBe("https://linkaro.app")
  })

  it("tolère localhost en production (test d'un build en local)", async () => {
    const env = await loadEnv({
      ...base,
      NODE_ENV: "production",
      WEB_URL: "http://localhost:3000",
    })
    expect(env.WEB_URL).toBe("http://localhost:3000")
  })

  it("refuse une URL de base de données qui n'est pas PostgreSQL", async () => {
    await expect(
      loadEnv({ DATABASE_URL: "mysql://a:b@localhost/x" })
    ).rejects.toThrow()
  })

  it("borne le nombre de proxys de confiance", async () => {
    await expect(
      loadEnv({ ...base, TRUSTED_PROXY_HOPS: "50" })
    ).rejects.toThrow()
  })
})
