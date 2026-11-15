import { DEV_PERSONAS } from "@linkaro/auth"
import { Badge } from "@linkaro/ui/components/badge"
import { Button } from "@linkaro/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"

import { assertDevOAuthEnabled, devRedirectUri } from "@/lib/dev-oauth/tokens"

import { AuthorizeRequest } from "./schema"

const numberFormat = new Intl.NumberFormat("fr-FR")

/**
 * Écran d'autorisation du fournisseur simulé (développement uniquement) :
 * il joue le rôle de la page « Autoriser Linkaro ? » de TikTok ou d'Instagram.
 */
export default async function DevAuthorizePage({
  searchParams,
}: PageProps<"/dev-oauth/autoriser">) {
  assertDevOAuthEnabled()
  const request = AuthorizeRequest.safeParse(await searchParams)
  if (!request.success || request.data.redirect_uri !== devRedirectUri()) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-destructive">
          Demande d&apos;autorisation invalide.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline">Développement</Badge>
        <span className="text-sm text-muted-foreground">
          Fournisseur simulé
        </span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Autoriser Linkaro à lire ton profil et tes statistiques ?
      </h1>
      <p className="text-sm text-muted-foreground">
        Choisis un créateur fictif. Aucune donnée réelle n&apos;est utilisée.
      </p>
      {DEV_PERSONAS.map((persona) => (
        <Card key={persona.id}>
          <CardHeader>
            <CardTitle>{persona.name}</CardTitle>
            <CardDescription>
              @{persona.username} · {persona.platform} ·{" "}
              {numberFormat.format(persona.followers)} abonnés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form method="get" action="/api/dev-oauth/authorize">
              {Object.entries(request.data).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <input type="hidden" name="persona_id" value={persona.id} />
              <Button type="submit" className="w-full">
                Autoriser en tant que {persona.name}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </main>
  )
}
