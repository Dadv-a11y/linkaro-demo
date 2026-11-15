import { Button } from "@linkaro/ui/components/button"
import { LinkaroLogo } from "@linkaro/ui/components/linkaro-logo"
import Link from "next/link"

export const metadata = { title: "Page introuvable — Linkaro" }

/**
 * Page 404, aussi affichée quand un membre n'a pas la permission requise :
 * l'existence d'une page réservée n'est pas révélée.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[70svh] flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <LinkaroLogo size="lg" />
      <div className="flex flex-col gap-2">
        <p className="text-6xl font-semibold tracking-tight text-brand">404</p>
        <h1 className="text-xl font-semibold">Page introuvable</h1>
        <p className="max-w-sm text-muted-foreground">
          Cette page n&apos;existe pas ou n&apos;est plus disponible.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </main>
  )
}
