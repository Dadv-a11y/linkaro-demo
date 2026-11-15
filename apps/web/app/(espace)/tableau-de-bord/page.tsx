import { enabledSignInProviders } from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { Badge } from "@linkaro/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { Separator } from "@linkaro/ui/components/separator"
import { BadgeCheck } from "lucide-react"

import { LinkNetworkButtons } from "@/components/link-network-buttons"
import { ProviderLogo } from "@/components/provider-logo"
import { requireCreator } from "@/lib/auth"

export const metadata = { title: "Tableau de bord — Linkaro" }

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
  const providerOf = (id: string) => providers.find((p) => p.id === id)
  const linkable = providers.filter(
    (p) => !accounts.some((a) => a.providerId === p.id)
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour {creator.name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">Voici ton espace créateur.</p>
      </div>

      {erreur === "liaison" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Ce réseau n&apos;a pas pu être ajouté. Il est peut-être déjà
            rattaché à un autre compte Linkaro.
          </AlertDescription>
        </Alert>
      ) : null}

      {accounts.length < 2 ? (
        <Alert className="border-brand/40 bg-accent text-accent-foreground">
          <AlertDescription className="text-accent-foreground">
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
          <ul className="flex flex-col gap-3">
            {accounts.map((account) => {
              const provider = providerOf(account.providerId)
              return (
                <li key={account.id} className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <ProviderLogo logo={provider?.logo ?? "dev"} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {provider?.label ?? account.providerId}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Connecté le {dateFormat.format(account.createdAt)}
                    </span>
                  </span>
                  <Badge className="gap-1 border-transparent bg-brand/15 text-accent-foreground">
                    <BadgeCheck className="size-3.5" />
                    Vérifié
                  </Badge>
                </li>
              )
            })}
          </ul>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Ajouter un réseau</p>
            <LinkNetworkButtons providers={linkable} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
