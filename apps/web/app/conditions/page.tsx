import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@linkaro/ui/components/alert"

export const metadata = { title: "Conditions d'utilisation — Linkaro" }

// Page provisoire : le texte définitif doit être rédigé et validé par un juriste
// (loi n° 2024/017, voir docs/architecture/02-securite-et-conformite.md).
export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Conditions d'utilisation</h1>
      <Alert>
        <AlertTitle>Document en cours de rédaction</AlertTitle>
        <AlertDescription>
          La version définitive sera publiée avant l&apos;ouverture au public,
          après validation juridique.
        </AlertDescription>
      </Alert>
    </main>
  )
}
