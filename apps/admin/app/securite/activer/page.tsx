import { getStaffAuth } from "@linkaro/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { headers } from "next/headers"

import { AdminAuthShell } from "@/components/admin-auth-shell"
import { TotpQrCode } from "@/components/totp-qr-code"
import { requireSecondFactorStep } from "@/lib/auth"

import { EnrollForm } from "./enroll-form"

export const metadata = { title: "Double authentification — Linkaro Admin" }

/** Clé lisible (groupes de 4) pour la saisie manuelle. */
function formatSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret
}

export default async function EnrollPage() {
  await requireSecondFactorStep("enroll-second-factor")

  // Nouveau secret à chaque affichage tant que l'activation n'est pas confirmée.
  const enabled = await getStaffAuth().api.enableTwoFactor({
    body: { method: "totp" },
    headers: await headers(),
  })
  if (enabled.method !== "totp") throw new Error("Méthode TOTP attendue")
  const { totpURI, backupCodes } = enabled
  const secret = new URL(totpURI).searchParams.get("secret") ?? ""

  return (
    <AdminAuthShell>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Active la double authentification</CardTitle>
          <CardDescription>
            Obligatoire pour tous les membres de l&apos;équipe, à chaque
            connexion.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">1. Scanne ce QR code</p>
            <p className="text-sm text-muted-foreground">
              Avec Google Authenticator, Aegis, 1Password…
            </p>
            <TotpQrCode value={totpURI} />
            <p className="text-xs text-muted-foreground">
              Impossible de scanner ? Clé :{" "}
              <code className="font-mono break-all">
                {formatSecret(secret)}
              </code>
            </p>
          </div>
          <EnrollForm backupCodes={backupCodes} />
        </CardContent>
      </Card>
    </AdminAuthShell>
  )
}
