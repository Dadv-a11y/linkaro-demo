import { afterEach, describe, expect, it, vi } from "vitest"

import { installConsoleRedaction } from "./console"

describe("installConsoleRedaction", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("masque les secrets des chaînes et des erreurs affichées", () => {
    const seen: unknown[][] = []
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      seen.push(args)
    })
    installConsoleRedaction()
    const original = new Error("Échec (token=abc123)")
    console.error("appel avec password=hunter2", original)

    const [text, error] = seen[0] as [string, Error]
    expect(text).toBe("appel avec password=[MASQUÉ]")
    expect(error.message).toBe("Échec (token=[MASQUÉ])")
    expect(error.stack).not.toContain("abc123")
    expect(error).toBeInstanceOf(Error)
    // L'erreur d'origine n'est pas modifiée.
    expect(original.message).toBe("Échec (token=abc123)")
  })
})
