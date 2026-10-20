import { enabledSignInProviders } from "@linkaro/auth"
import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import Link from "next/link"
import { redirect } from "next/navigation"

import { SignInButtons } from "@/components/sign-in-buttons"
import { getCreatorSession } from "@/lib/auth"

export const metadata = { title: "Connexion — Linkaro" }

const NOTICES: Record<string, string> = {
  inactif:
    "Ce compte n'est pas actif. Contacte l'équipe Linkaro si tu penses qu'il s'agit d'une erreur.",
  mineur:
    "Linkaro est réservé aux personnes de 18 ans ou plus. Ton compte et ses données ont été supprimés.",
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/connexion">) {
  if (await getCreatorSession()) redirect("/tableau-de-bord")
  const { compte } = await searchParams
  const notice = typeof compte === "string" ? NOTICES[compte] : undefined
  const providers = enabledSignInProviders()

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Bienvenue sur Linkaro</CardTitle>
          <CardDescription>
            Pas de mot de passe : connecte le réseau où tu publies le plus. Ton
            profil se remplit tout seul.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {notice ? (
            <Alert>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {providers.length > 0 ? (
            <SignInButtons providers={providers} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun réseau n&apos;est configuré pour le moment.
            </p>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <p>
            En continuant, tu autorises Linkaro à lire ton profil et tes
            statistiques publiques, en lecture seule. Voir les{" "}
            <Link href="/conditions" className="underline">
              conditions
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
