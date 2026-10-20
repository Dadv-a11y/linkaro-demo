import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@linkaro/ui/components/alert"
import { Button } from "@linkaro/ui/components/button"
import Link from "next/link"

import { AuthShell } from "@/components/auth-shell"

export const metadata = { title: "Connexion impossible — Linkaro" }

const MESSAGES: Record<string, string> = {
  access_denied:
    "Tu as refusé l'autorisation. Tu peux réessayer quand tu veux.",
  account_already_linked_to_different_user:
    "Ce compte est déjà rattaché à un autre profil Linkaro.",
  rate_limited: "Trop de tentatives. Patiente une minute avant de réessayer.",
}

export default async function SignInErrorPage({
  searchParams,
}: PageProps<"/connexion/erreur">) {
  const { error } = await searchParams
  const code = typeof error === "string" ? error : ""
  return (
    <AuthShell>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Alert variant="destructive">
          <AlertTitle>La connexion n&apos;a pas abouti</AlertTitle>
          <AlertDescription>
            {MESSAGES[code] ??
              "Une erreur est survenue avec le réseau social. Réessaie dans un instant."}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/connexion">Revenir à la connexion</Link>
        </Button>
      </div>
    </AuthShell>
  )
}
