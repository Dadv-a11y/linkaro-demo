import { LinkaroLogo } from "@linkaro/ui/components/linkaro-logo"
import type { ReactNode } from "react"

/** Cadre des écrans d'accès : fond aux couleurs Linkaro, logo, contenu centré. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-[radial-gradient(60%_40%_at_50%_0%,color-mix(in_srgb,var(--brand-2)_14%,transparent),transparent),radial-gradient(50%_35%_at_50%_100%,color-mix(in_srgb,var(--brand)_14%,transparent),transparent)] p-4">
      <LinkaroLogo size="lg" />
      {children}
    </main>
  )
}
