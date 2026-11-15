"use client"

import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { Button } from "@linkaro/ui/components/button"
import { Input } from "@linkaro/ui/components/input"
import { Label } from "@linkaro/ui/components/label"
import { Check, Copy, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient, authErrorMessage } from "@/lib/auth-client"

import { TotpCode } from "../schema"

export function EnrollForm({ backupCodes }: { backupCodes: string[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const text = backupCodes.join("\n")

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([`Codes de secours Linkaro Admin (usage unique)\n\n${text}\n`], {
        type: "text/plain",
      })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "linkaro-codes-de-secours.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = TotpCode.safeParse(
      new FormData(event.currentTarget).get("code")
    )
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Code invalide")
      return
    }
    setPending(true)
    setError(null)
    const { error } = await authClient.twoFactor.verifyTotp({
      code: parsed.data,
    })
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <p className="text-sm font-medium">2. Conserve tes codes de secours</p>
      <p className="text-sm text-muted-foreground">
        Chacun sert une seule fois si tu perds ton téléphone. Ils ne seront plus
        affichés.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
        {backupCodes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />} {copied ? "Copié" : "Copier"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download /> Télécharger
        </Button>
      </div>
      <Label htmlFor="code" className="pt-2 text-sm font-medium">
        3. Saisis le code affiché
      </Label>
      <Input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123 456"
        className="font-mono tracking-widest"
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        Activer et continuer
      </Button>
    </form>
  )
}
