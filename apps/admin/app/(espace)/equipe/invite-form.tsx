"use client"

import type { StaffRole } from "@linkaro/auth"
import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { Button } from "@linkaro/ui/components/button"
import { Input } from "@linkaro/ui/components/input"
import { Label } from "@linkaro/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@linkaro/ui/components/select"
import { Textarea } from "@linkaro/ui/components/textarea"
import { UserPlus } from "lucide-react"
import { useActionState } from "react"

import { inviteMember, type InviteState } from "./actions"

export function InviteForm({
  roles,
}: {
  roles: { value: StaffRole; label: string; description: string }[]
}) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    inviteMember,
    { status: "idle" }
  )

  return (
    <form
      action={formAction}
      // Formulaire vidé après un envoi réussi.
      key={state.status === "sent" ? state.message : undefined}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Adresse e-mail</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="prenom@linkaro.cm"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-role">Rôle</Label>
        <Select name="role" required>
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue placeholder="Choisir un rôle" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label} — {role.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="invite-reason">Motif</Label>
        <Textarea
          id="invite-reason"
          name="reason"
          placeholder="Ex. : renfort du support pour le lancement"
          required
          minLength={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          Inscrit au journal d&apos;audit. Le lien, valable 48 h, part
          uniquement par e-mail.
        </p>
      </div>
      {state.status !== "idle" ? (
        <Alert
          variant={state.status === "error" ? "destructive" : "default"}
          className="sm:col-span-2"
        >
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          <UserPlus /> Envoyer l&apos;invitation
        </Button>
      </div>
    </form>
  )
}
