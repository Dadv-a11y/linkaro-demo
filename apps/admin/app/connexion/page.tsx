import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { redirect } from "next/navigation"

import { AdminAuthShell } from "@/components/admin-auth-shell"
import { isFullySignedIn } from "@/lib/auth"

import { SignInForm } from "./sign-in-form"

export const metadata = { title: "Connexion — Linkaro Admin" }

const NOTICES: Record<string, string> = {
  inactivite: "Ta session a expiré après 30 minutes d'inactivité.",
  desactive: "Ce compte a été désactivé.",
  lien: "Ce lien de connexion n'est plus valable. Demande-en un nouveau.",
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/connexion">) {
  if (await isFullySignedIn()) redirect("/")
  const { raison, erreur } = await searchParams
  const key = typeof raison === "string" ? raison : erreur
  const notice = typeof key === "string" ? NOTICES[key] : undefined

  return (
    <AdminAuthShell>
      {notice ? (
        <Alert className="w-full max-w-sm">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <SignInForm />
    </AdminAuthShell>
  )
}
