import { can, isPlaceholderEmail } from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { Avatar, AvatarFallback } from "@linkaro/ui/components/avatar"
import { Badge } from "@linkaro/ui/components/badge"
import { Button } from "@linkaro/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { ArrowLeft, BarChart3 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CreatorStatusBadge } from "@/components/creator-status-badge"
import { NetworkLogo } from "@/components/network-logo"
import { actionLabel } from "@/lib/audit-labels"
import { requireStaff } from "@/lib/auth"
import { displayEmail, networkInfo } from "@/lib/creators"

import { CreatorActions } from "./creator-actions"
import { RevealEmail } from "./reveal-email"
import { CreatorIdParam } from "./schema"

export const metadata = { title: "Fiche créateur — Linkaro Admin" }

const longDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Africa/Douala",
})
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Africa/Douala",
})
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Douala",
})

export default async function CreatorPage({
  params,
}: PageProps<"/createurs/[id]">) {
  const { member } = await requireStaff("creators.read")
  const parsed = CreatorIdParam.safeParse((await params).id)
  if (!parsed.success) notFound()
  const id = parsed.data

  const creator = await prisma.creator.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      adultConfirmedAt: true,
      termsAcceptedAt: true,
      termsVersion: true,
      createdAt: true,
      accounts: {
        select: { id: true, providerId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!creator) notFound()

  // Historique : actions du créateur et actions de l'équipe sur sa fiche.
  const [history, lastLogin] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [
          { targetType: "creator", targetId: id },
          { actorType: "USER", actorId: id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        createdAt: true,
        action: true,
        actorType: true,
        actorId: true,
        reason: true,
        metadata: true,
      },
    }),
    prisma.auditLog.findFirst({
      where: { actorType: "USER", actorId: id, action: "auth.login" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ])
  const staffIds = [
    ...new Set(
      history
        .filter((h) => h.actorType === "ADMIN" && h.actorId)
        .map((h) => h.actorId!)
    ),
  ]
  const staffNames = new Map(
    (staffIds.length
      ? await prisma.staffMember.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true },
        })
      : []
    ).map((s) => [s.id, s.name])
  )

  const describe = (h: (typeof history)[number]) => {
    const provider =
      h.metadata && typeof h.metadata === "object" && "provider" in h.metadata
        ? String(h.metadata.provider)
        : null
    const base = actionLabel(h.action)
    return provider ? `${base} : ${networkInfo(provider).label}` : base
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/createurs">
          <ArrowLeft /> Créateurs
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="text-lg">
            {creator.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {creator.name} <CreatorStatusBadge status={creator.status} />
          </h1>
          <p className="text-muted-foreground">
            Inscrit le {longDate.format(creator.createdAt)}
          </p>
        </div>
        <CreatorActions
          creator={{
            id: creator.id,
            name: creator.name,
            status: creator.status,
          }}
          can={{
            suspend: can(member.role, "creators.suspend"),
            export: can(member.role, "creators.export"),
            delete: can(member.role, "creators.delete"),
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>
                  <RevealEmail
                    creatorId={creator.id}
                    masked={displayEmail(creator.email)}
                    hasEmail={!isPlaceholderEmail(creator.email)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">18 ans ou plus</dt>
                <dd>
                  {creator.adultConfirmedAt
                    ? `Confirmé le ${shortDate.format(creator.adultConfirmedAt)}`
                    : "Pas encore confirmé (inscription non terminée)"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Conditions d&apos;utilisation
                </dt>
                <dd>
                  {creator.termsAcceptedAt
                    ? `Version ${creator.termsVersion ?? "?"}, acceptées le ${shortDate.format(creator.termsAcceptedAt)}`
                    : "Pas encore acceptées"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dernière connexion</dt>
                <dd>
                  {lastLogin ? dateTime.format(lastLogin.createdAt) : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Réseaux connectés</CardTitle>
            <CardDescription>
              Les tokens ne sont jamais affichés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {creator.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun réseau connecté.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {creator.accounts.map((account) => {
                  const info = networkInfo(account.providerId)
                  return (
                    <li
                      key={account.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <NetworkLogo
                        logo={info.logo}
                        label={info.label}
                        className="size-5"
                      />
                      <span className="flex-1 font-medium">{info.label}</span>
                      <span className="text-muted-foreground">
                        connecté le {shortDate.format(account.createdAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-4 py-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <BarChart3 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Statistiques et Indice Linkaro</p>
            <p className="text-sm text-muted-foreground">
              Abonnés, taux d&apos;interactions et score par réseau :
              disponibles avec la collecte des statistiques (étape à venir).
            </p>
          </div>
          <Badge variant="outline">À venir</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>
            Extrait du journal d&apos;audit pour ce créateur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {history.map((h) => (
              <li
                key={h.id.toString()}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5"
              >
                <span className="w-40 text-xs text-muted-foreground">
                  {dateTime.format(h.createdAt)}
                </span>
                <span className="min-w-0 flex-1">
                  {describe(h)}
                  {h.reason ? (
                    <span className="block text-xs text-muted-foreground">
                      Motif : {h.reason}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">
                  {h.actorType === "ADMIN"
                    ? (staffNames.get(h.actorId ?? "") ?? "Équipe")
                    : h.actorType === "USER"
                      ? "Créateur"
                      : "Système"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
