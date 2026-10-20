"use client"

import type { SignInProvider } from "@linkaro/auth"
import { Button } from "@linkaro/ui/components/button"
import { useState } from "react"

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

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          size="lg"
          variant={provider.isDev ? "outline" : "default"}
          disabled={pending !== null}
          onClick={() => void signIn(provider.id)}
        >
          {pending === provider.id
            ? "Redirection…"
            : `Continuer avec ${provider.label}`}
        </Button>
      ))}
    </div>
  )
}
