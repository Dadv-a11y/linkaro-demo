import { enabledSignInProviders } from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@linkaro/ui/components/avatar"
import { Badge } from "@linkaro/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { Separator } from "@linkaro/ui/components/separator"

import { LinkNetworkButtons } from "@/components/link-network-buttons"
import { SignOutButton } from "@/components/sign-out-button"
import { requireCreator } from "@/lib/auth"

export const metadata = { title: "Mon espace — Linkaro" }

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" })

export default async function DashboardPage({
  searchParams,
}: PageProps<"/tableau-de-bord">) {
  const { creator } = await requireCreator()
  const { erreur } = await searchParams

  // Réseaux connectés : jamais les tokens, seulement ce qui s'affiche.
  const accounts = await prisma.creatorAccount.findMany({
    where: { userId: creator.id },
    select: { id: true, providerId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  const providers = enabledSignInProviders()
  const labelOf = (id: string) =>
    providers.find((p) => p.id === id)?.label ?? id
  const linkable = providers.filter(
    (p) => !accounts.some((a) => a.providerId === p.id)
  )

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            {creator.image ? <AvatarImage src={creator.image} alt="" /> : null}
            <AvatarFallback>
              {creator.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{creator.name}</h1>
            <p className="text-sm text-muted-foreground">Mon espace créateur</p>
          </div>
        </div>
        <SignOutButton />
      </header>

      {erreur === "liaison" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Ce réseau n&apos;a pas pu être ajouté. Il est peut-être déjà
            rattaché à un autre compte Linkaro.
          </AlertDescription>
        </Alert>
      ) : null}

      {accounts.length < 2 ? (
        <Alert>
          <AlertDescription>
            Ajoute un deuxième réseau (ou, bientôt, ton numéro WhatsApp) pour ne
            jamais perdre l&apos;accès à ton compte.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mes réseaux</CardTitle>
          <CardDescription>
            Statistiques lues directement chez le réseau, en lecture seule.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between"
              >
                <span className="font-medium">
                  {labelOf(account.providerId)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    depuis le {dateFormat.format(account.createdAt)}
                  </span>
                  <Badge>Vérifié</Badge>
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <LinkNetworkButtons providers={linkable} />
        </CardContent>
      </Card>
    </main>
  )
}
