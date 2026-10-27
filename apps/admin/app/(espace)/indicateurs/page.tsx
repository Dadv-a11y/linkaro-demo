import { prisma } from "@linkaro/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { ArrowRight } from "lucide-react"
import { z } from "zod"

import { requireStaff } from "@/lib/auth"
import { networkInfo } from "@/lib/creators"

import { NetworksCard, SignupsCard } from "./charts"
import { PeriodPicker } from "./period-picker"

export const metadata = { title: "Indicateurs — Linkaro Admin" }

const TIME_ZONE = "Africa/Douala"
const Period = z.enum(["7", "30", "90"]).catch("30")
const number = new Intl.NumberFormat("fr-FR")
const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

/** Jour calendaire (AAAA-MM-JJ) à Douala. */
function localDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date)
}

const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)} %` : "—"

export default async function MetricsPage({
  searchParams,
}: PageProps<"/indicateurs">) {
  await requireStaff("metrics.read")
  const period = Period.parse((await searchParams).periode)
  const days = Number(period)

  // Début de période : minuit (heure de Douala) il y a N-1 jours.
  const today = localDay(new Date())
  const start = new Date(`${today}T00:00:00+01:00`)
  start.setUTCDate(start.getUTCDate() - (days - 1))

  const [perDay, created, onboarded, multiNetwork, networks] =
    await Promise.all([
      prisma.$queryRaw<{ day: string; n: number }[]>`
        SELECT to_char((created_at AT TIME ZONE ${TIME_ZONE})::date, 'YYYY-MM-DD') AS day,
               count(*)::int AS n
        FROM creator
        WHERE created_at >= ${start}
        GROUP BY 1`,
      prisma.creator.count({ where: { createdAt: { gte: start } } }),
      prisma.creator.count({
        where: { createdAt: { gte: start }, adultConfirmedAt: { not: null } },
      }),
      prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM (
          SELECT c.id FROM creator c
          JOIN creator_account a ON a.creator_id = c.id
          WHERE c.created_at >= ${start}
          GROUP BY c.id HAVING count(*) >= 2
        ) t`,
      prisma.creatorAccount.groupBy({
        by: ["providerId"],
        _count: { _all: true },
      }),
    ])

  // Tous les jours de la période, y compris ceux sans inscription.
  const counts = new Map(perDay.map((row) => [row.day, row.n]))
  const signups = Array.from({ length: days }, (_, i) => {
    const date = new Date(`${today}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - (days - 1 - i))
    const key = date.toISOString().slice(0, 10)
    return { day: dayLabel.format(date), inscriptions: counts.get(key) ?? 0 }
  })
  const totalSignups = signups.reduce((sum, d) => sum + d.inscriptions, 0)
  // Sur 90 jours, une barre par semaine : 90 barres quotidiennes seraient illisibles.
  const weekly = days > 30
  const series = weekly
    ? Array.from({ length: Math.ceil(days / 7) }, (_, w) => {
        const chunk = signups.slice(w * 7, w * 7 + 7)
        return {
          day: `Sem. du ${chunk[0]!.day}`,
          inscriptions: chunk.reduce((sum, d) => sum + d.inscriptions, 0),
        }
      })
    : signups
  const multi = multiNetwork[0]?.n ?? 0

  const funnel = [
    {
      label: "Comptes créés",
      value: created,
      hint: "connexion d'un premier réseau",
    },
    {
      label: "Inscription terminée",
      value: onboarded,
      hint: `${percent(onboarded, created)} · « 18 ans ou plus » confirmé`,
    },
    {
      label: "2 réseaux ou plus",
      value: multi,
      hint: `${percent(multi, created)} des comptes créés`,
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Indicateurs</h1>
          <p className="text-muted-foreground">
            Croissance et engagement des créateurs.
          </p>
        </div>
        <PeriodPicker value={period} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parcours d&apos;inscription</CardTitle>
          <CardDescription>
            Créateurs inscrits sur les {days} derniers jours, à chaque étape.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {funnel.map((step, i) => (
            <div key={step.label} className="relative rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{step.label}</p>
              <p className="text-3xl font-semibold">
                {number.format(step.value)}
              </p>
              <p className="text-xs text-muted-foreground">{step.hint}</p>
              {i < funnel.length - 1 ? (
                <ArrowRight
                  aria-hidden
                  className="absolute top-1/2 -right-3.5 hidden size-5 -translate-y-1/2 rounded-full bg-background text-muted-foreground sm:block"
                />
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <SignupsCard
          data={series}
          title={weekly ? "Inscriptions par semaine" : "Inscriptions par jour"}
          firstColumn={weekly ? "Semaine" : "Jour"}
          description={`Nouveaux comptes créateurs, ${days} derniers jours · ${number.format(totalSignups)} au total`}
        />
        <NetworksCard
          data={networks
            .map((n) => ({
              network: networkInfo(n.providerId).label,
              comptes: n._count._all,
            }))
            .sort((a, b) => b.comptes - a.comptes)}
        />
      </div>
    </>
  )
}
