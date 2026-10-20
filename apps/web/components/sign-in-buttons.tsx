"use client"

import type { SignInProvider } from "@linkaro/auth"
import { Button } from "@linkaro/ui/components/button"
import { Separator } from "@linkaro/ui/components/separator"
import { useState } from "react"

import { ProviderLogo } from "@/components/provider-logo"
import { authClient } from "@/lib/auth-client"

/** « Continuer avec … » : connecter un réseau crée le compte s'il n'existe pas. */
export function SignInButtons({ providers }: { providers: SignInProvider[] }) {
  const [pending, setPending] = useState<string | null>(null)

  async function signIn(provider: string) {
    setPending(provider)
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/tableau-de-bord",
      newUserCallbackURL: "/bienvenue",
      errorCallbackURL: "/connexion/erreur",
    })
    if (error) setPending(null)
  }

  const button = (provider: SignInProvider) => (
    <Button
      key={provider.id}
      size="lg"
      variant="outline"
      className="h-12 justify-start gap-3 px-4 text-base"
      disabled={pending !== null}
      onClick={() => void signIn(provider.id)}
    >
      <ProviderLogo logo={provider.logo} />
      <span className="flex-1 text-center">
        {pending === provider.id
          ? "Redirection…"
          : `Continuer avec ${provider.label}`}
      </span>
    </Button>
  )

  const real = providers.filter((p) => !p.isDev)
  const dev = providers.filter((p) => p.isDev)
  return (
    <div className="flex flex-col gap-3">
      {real.map(button)}
      {dev.length > 0 ? (
        <>
          {real.length > 0 ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              développement
              <Separator className="flex-1" />
            </div>
          ) : null}
          {dev.map(button)}
        </>
      ) : null}
    </div>
  )
}
