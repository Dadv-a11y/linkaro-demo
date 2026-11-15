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
import { ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient, authErrorMessage } from "@/lib/auth-client"

import { BackupCode, TotpCode } from "../schema"

export function VerifyForm() {
  const router = useRouter()
  const [useBackup, setUseBackup] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const raw = new FormData(event.currentTarget).get("code")
    const parsed = (useBackup ? BackupCode : TotpCode).safeParse(raw)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Code invalide")
      return
    }
    setPending(true)
    setError(null)
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code: parsed.data })
      : await authClient.twoFactor.verifyTotp({ code: parsed.data })
    setPending(false)
    if (error) {
      setError(
        error.status === 429 ? authErrorMessage(error) : "Code incorrect."
      )
      return
    }
    router.replace("/")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle>Double authentification</CardTitle>
        <CardDescription>
          {useBackup
            ? "Saisis l'un de tes codes de secours. Il ne pourra plus resservir."
            : "Saisis le code à 6 chiffres de ton application d'authentification."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          key={useBackup ? "backup" : "totp"}
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Label htmlFor="code" className="sr-only">
            {useBackup ? "Code de secours" : "Code à 6 chiffres"}
          </Label>
          <Input
            id="code"
            name="code"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={useBackup ? "XXXXX-XXXXX" : "123 456"}
            className="h-12 text-center font-mono text-xl tracking-[0.3em]"
            aria-invalid={error ? true : undefined}
            autoFocus
          />
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            Vérifier
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-muted-foreground"
            onClick={() => {
              setUseBackup(!useBackup)
              setError(null)
            }}
          >
            {useBackup
              ? "Utiliser l'application d'authentification"
              : "Téléphone perdu ? Utiliser un code de secours"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
