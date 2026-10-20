import { describe, expect, it } from "vitest"

import { getClientIp } from "./client-ip"

describe("getClientIp", () => {
  it("ignore l'en-tête sans proxy de confiance (valeur falsifiable)", () => {
    expect(getClientIp("41.202.207.1", 0)).toBeNull()
  })

  it("prend l'adresse ajoutée par notre proxy (Caddy = 1 saut)", () => {
    expect(getClientIp("41.202.207.1", 1)).toBe("41.202.207.1")
  })

  it("ne se laisse pas tromper par une adresse injectée par le client", () => {
    // Le client envoie « X-Forwarded-For: 1.1.1.1 » ; Caddy ajoute sa vraie IP.
    expect(getClientIp("1.1.1.1, 41.202.207.1", 1)).toBe("41.202.207.1")
  })

  it("gère plusieurs proxys de confiance", () => {
    expect(getClientIp("1.1.1.1, 41.202.207.1, 10.0.0.2", 2)).toBe(
      "41.202.207.1"
    )
  })

  it("accepte IPv6 et retire les ports", () => {
    expect(getClientIp("2001:db8::1", 1)).toBe("2001:db8::1")
    expect(getClientIp("[2001:db8::1]:443", 1)).toBe("2001:db8::1")
    expect(getClientIp("41.202.207.1:5678", 1)).toBe("41.202.207.1")
  })

  it("rejette une valeur qui n'est pas une IP", () => {
    expect(getClientIp("<script>", 1)).toBeNull()
    expect(getClientIp("", 1)).toBeNull()
    expect(getClientIp("41.202.207.1", 3)).toBeNull()
  })
})
