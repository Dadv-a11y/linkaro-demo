"use client"

import { Button } from "@linkaro/ui/components/button"
import { Eye } from "lucide-react"
import { useState, useTransition } from "react"

import { revealEmailAction } from "./actions"

export function RevealEmail({
  creatorId,
  masked,
  hasEmail,
}: {
  creatorId: string
  masked: string
  hasEmail: boolean
}) {
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!hasEmail) return <span className="text-muted-foreground">{masked}</span>
  if (email) return <span className="break-all">{email}</span>

  return (
    <span className="flex flex-wrap items-center gap-2">
      {masked}
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revealEmailAction(creatorId)
            if ("error" in result) setError(result.error)
            else setEmail(result.email ?? "Adresse non fournie")
          })
        }
      >
        <Eye className="size-3.5" /> Afficher
      </Button>
      {error ? <span className="text-destructive">{error}</span> : null}
    </span>
  )
}
