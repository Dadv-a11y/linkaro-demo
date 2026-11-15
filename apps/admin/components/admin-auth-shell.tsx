import { Badge } from "@linkaro/ui/components/badge"
import { LinkaroLogo } from "@linkaro/ui/components/linkaro-logo"
import type { ReactNode } from "react"

/** Cadre des écrans d'accès de l'équipe : fond Linkaro, logo, contenu centré. */
export function AdminAuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[radial-gradient(60%_40%_at_50%_0%,color-mix(in_srgb,var(--brand-2)_14%,transparent),transparent),radial-gradient(50%_35%_at_50%_100%,color-mix(in_srgb,var(--brand)_14%,transparent),transparent)] p-4">
      <div className="flex items-center gap-3">
        <LinkaroLogo size="lg" />
        <Badge variant="secondary">Équipe</Badge>
      </div>
      {children}
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Accès réservé à l&apos;équipe Linkaro. Chaque connexion et chaque action
        sont journalisées.
      </p>
    </main>
  )
}
