import { Button } from "@linkaro/ui/components/button"
import Link from "next/link"

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Linkaro</h1>
        <p className="text-muted-foreground">
          Développez et gérez vos collaborations avec les marques.
        </p>
        <Button className="w-fit" asChild>
          <Link href="/connexion">Commencer</Link>
        </Button>
      </div>
    </main>
  )
}
