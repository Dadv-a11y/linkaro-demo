"use client"

import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { Badge } from "@linkaro/ui/components/badge"
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
import { Separator } from "@linkaro/ui/components/separator"
import { useActionState } from "react"

import { LinkSent } from "@/app/connexion/sign-in-form"

import { acceptInvitation, type AcceptState } from "./actions"

export function AcceptInvitationForm({
  token,
  email,
  role,
  expiresAt,
}: {
  token: string
  email: string
  role: string
  expiresAt: string
}) {
  const [state, formAction, pending] = useActionState<AcceptState, FormData>(
    acceptInvitation.bind(null, token),
    { status: "idle" }
  )

  if (state.status === "sent") return <LinkSent />

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Rejoindre l&apos;équipe Linkaro</CardTitle>
        <CardDescription>
          Tu as été invité(e) à rejoindre l&apos;administration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Adresse</dt>
            <dd className="truncate font-medium">{email}</dd>
            <dt className="text-muted-foreground">Rôle</dt>
            <dd>
              <Badge variant="secondary">{role}</Badge>
            </dd>
            <dt className="text-muted-foreground">Expire</dt>
            <dd>le {expiresAt}</dd>
          </dl>
          <Separator />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Ton nom</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Prénom Nom"
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            Accepter l&apos;invitation
          </Button>
          <p className="text-xs text-muted-foreground">
            Étape suivante : un lien de connexion t&apos;est envoyé, puis tu
            actives la double authentification.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
