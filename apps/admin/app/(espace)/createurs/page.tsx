import { prisma, type Prisma } from "@linkaro/db"
import { Avatar, AvatarFallback } from "@linkaro/ui/components/avatar"
import { Button } from "@linkaro/ui/components/button"
import { Card, CardContent } from "@linkaro/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@linkaro/ui/components/table"
import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { CreatorStatusBadge } from "@/components/creator-status-badge"
import { NetworkLogo } from "@/components/network-logo"
import { requireStaff } from "@/lib/auth"
import { displayEmail, networkInfo } from "@/lib/creators"

import { CreatorFilters } from "./filters"
import { CreatorListQuery } from "./schema"

export const metadata = { title: "Créateurs — Linkaro Admin" }

const PAGE_SIZE = 20
const number = new Intl.NumberFormat("fr-FR")
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Africa/Douala",
})

export default async function CreatorsPage({
  searchParams,
}: PageProps<"/createurs">) {
  await requireStaff("creators.read")
  const raw = await searchParams
  const query = CreatorListQuery.parse(raw)

  const where: Prisma.CreatorWhereInput = {
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.statut ? { status: query.statut } : {}),
    ...(query.reseau
      ? { accounts: { some: { providerId: query.reseau } } }
      : {}),
    ...(query.inscription === "terminee"
      ? { adultConfirmedAt: { not: null } }
      : query.inscription === "en-attente"
        ? { adultConfirmedAt: null }
        : {}),
  }

  const [total, filtered, creators, providers] = await Promise.all([
    prisma.creator.count(),
    prisma.creator.count({ where }),
    prisma.creator.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        adultConfirmedAt: true,
        createdAt: true,
        accounts: {
          select: { id: true, providerId: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.creatorAccount.findMany({
      distinct: ["providerId"],
      select: { providerId: true },
    }),
  ])

  const first = filtered === 0 ? 0 : (query.page - 1) * PAGE_SIZE + 1
  const last = Math.min(query.page * PAGE_SIZE, filtered)
  const pageHref = (page: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string" && key !== "page") params.set(key, value)
    }
    params.set("page", String(page))
    return `/createurs?${params.toString()}`
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Créateurs</h1>
        <p className="text-muted-foreground">
          {number.format(total)} créateur{total > 1 ? "s" : ""} inscrit
          {total > 1 ? "s" : ""}.
        </p>
      </div>

      {raw.supprime === "1" ? (
        <Alert>
          <AlertDescription>
            Le compte a été supprimé définitivement.
          </AlertDescription>
        </Alert>
      ) : null}

      <CreatorFilters
        networks={providers.map((p) => ({
          id: p.providerId,
          label: networkInfo(p.providerId).label,
        }))}
      />

      <Card className="py-0">
        <CardContent className="px-0">
          {creators.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Aucun créateur ne correspond à ces critères.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Créateur</TableHead>
                  <TableHead>Réseaux</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Inscription
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Inscrit le
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {creators.map((c) => (
                  <TableRow key={c.id} className="relative">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {c.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate font-medium">
                            {/* Toute la ligne est cliquable (lien étendu). */}
                            <Link
                              href={`/createurs/${c.id}`}
                              className="after:absolute after:inset-0"
                            >
                              {c.name}
                            </Link>
                            {c.status === "suspended" ? (
                              <span className="sm:hidden">
                                <CreatorStatusBadge status={c.status} />
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {displayEmail(c.email)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {c.accounts.map((a) => {
                          const info = networkInfo(a.providerId)
                          return (
                            <NetworkLogo
                              key={a.id}
                              logo={info.logo}
                              label={info.label}
                            />
                          )
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.adultConfirmedAt ? (
                        "Terminée"
                      ) : (
                        <span className="text-muted-foreground">
                          En attente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <CreatorStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {dateFormat.format(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {first} à {last} sur {number.format(filtered)}
        </span>
        <div className="flex gap-2">
          {query.page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(query.page - 1)}>
                <ChevronLeft /> Précédent
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft /> Précédent
            </Button>
          )}
          {last < filtered ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(query.page + 1)}>
                Suivant <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Suivant <ChevronRight />
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
