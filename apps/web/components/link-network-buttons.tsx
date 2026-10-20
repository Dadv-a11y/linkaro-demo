"use client"

import type { SignInProvider } from "@linkaro/auth"
import { Button } from "@linkaro/ui/components/button"
import { useState } from "react"

import { ProviderLogo } from "@/components/provider-logo"
import { authClient } from "@/lib/auth-client"

/** Ajoute un réseau au compte du créateur connecté (nouvelle autorisation OAuth). */
export function LinkNetworkButtons({
  providers,
}: {
  providers: SignInProvider[]
}) {
  const [pending, setPending] = useState<string | null>(null)

  async function link(provider: string) {
    setPending(provider)
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: "/tableau-de-bord",
      errorCallbackURL: "/tableau-de-bord?erreur=liaison",
    })
    if (error) setPending(null)
  }

  if (providers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun autre réseau disponible pour le moment.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          disabled={pending !== null}
          onClick={() => void link(provider.id)}
        >
          <ProviderLogo logo={provider.logo} className="size-4" />
          {pending === provider.id ? "Redirection…" : provider.label}
        </Button>
      ))}
    </div>
  )
}
