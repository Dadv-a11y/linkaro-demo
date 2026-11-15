"use client"

import { Input } from "@linkaro/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@linkaro/ui/components/select"
import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

const ALL = "tous"

/** Recherche et filtres : l'état vit dans l'URL (partageable, retour arrière). */
export function CreatorFilters({
  networks,
}: {
  networks: { id: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function update(key: string, value: string | undefined) {
    const next = new URLSearchParams(params)
    if (value && value !== ALL) next.set(key, value)
    else next.delete(key)
    next.delete("page")
    startTransition(() => router.replace(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap gap-2">
      <form
        role="search"
        className="relative min-w-56 flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          const q = new FormData(event.currentTarget).get("q")
          update("q", typeof q === "string" ? q.trim() : undefined)
        }}
      >
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Rechercher par nom (Entrée)"
          aria-label="Rechercher par nom"
          className="pl-8"
          maxLength={100}
        />
      </form>
      <Select
        value={params.get("statut") ?? ALL}
        onValueChange={(value) => update("statut", value)}
      >
        <SelectTrigger className="w-40" aria-label="Statut">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les statuts</SelectItem>
          <SelectItem value="active">Actifs</SelectItem>
          <SelectItem value="suspended">Suspendus</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={params.get("reseau") ?? ALL}
        onValueChange={(value) => update("reseau", value)}
      >
        <SelectTrigger className="w-40" aria-label="Réseau">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les réseaux</SelectItem>
          {networks.map((network) => (
            <SelectItem key={network.id} value={network.id}>
              {network.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.get("inscription") ?? ALL}
        onValueChange={(value) => update("inscription", value)}
      >
        <SelectTrigger className="w-44" aria-label="Inscription">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Inscription : toutes</SelectItem>
          <SelectItem value="terminee">Terminée</SelectItem>
          <SelectItem value="en-attente">Non terminée</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
