"use client"

import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { Button } from "@linkaro/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { Input } from "@linkaro/ui/components/input"
import { Label } from "@linkaro/ui/components/label"
import { Mail, MailCheck } from "lucide-react"
import { useState } from "react"
import { z } from "zod"

import { authClient, authErrorMessage } from "@/lib/auth-client"

const Email = z.email("Adresse e-mail invalide")

export function SignInForm() {
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Email.safeParse(
      new FormData(event.currentTarget).get("email")
    )
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Adresse e-mail invalide")
      return
    }
    setPending(true)
    setError(null)
    const { error } = await authClient.signIn.magicLink({
      email: parsed.data,
      callbackURL: "/",
    })
    setPending(false)
    if (error) setError(authErrorMessage(error))
    else setSent(true)
  }

  if (sent) return <LinkSent onReset={() => setSent(false)} />

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Connexion de l&apos;équipe</CardTitle>
        <CardDescription>
          Saisis ton adresse professionnelle : tu recevras un lien de connexion
          valable 10 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="prenom@linkaro.cm"
              required
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            <Mail /> Recevoir le lien de connexion
          </Button>
          <p className="text-xs text-muted-foreground">
            Pas encore de compte ? L&apos;accès se fait uniquement sur
            invitation d&apos;un superadmin.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

/** Même message pour toutes les adresses : on ne révèle pas qui fait partie de l'équipe. */
export function LinkSent({ onReset }: { onReset?: () => void }) {
  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader className="items-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MailCheck className="size-6" />
        </div>
        <CardTitle>Vérifie ta boîte mail</CardTitle>
        <CardDescription>
          Si cette adresse appartient à un membre de l&apos;équipe, un lien de
          connexion vient d&apos;y être envoyé. Il expire dans 10 minutes.
        </CardDescription>
      </CardHeader>
      {onReset ? (
        <CardContent>
          <Button variant="ghost" className="w-full" onClick={onReset}>
            Utiliser une autre adresse
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )
}
