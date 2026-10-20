import { can } from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"

import { requireStaff } from "@/lib/auth"
import { countRecentSecurityAlerts } from "@/lib/security-alerts"

export const metadata = { title: "Vue d'ensemble — Linkaro Admin" }

const number = new Intl.NumberFormat("fr-FR")
const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Douala",
})

/** Libellés des actions du journal d'audit et des événements de sécurité. */
const LABELS: Record<string, string> = {
  "creator.signup": "Inscription d'un créateur",
  "creator.onboarded": "Inscription créateur terminée",
  "creator.deleted_underage": "Compte supprimé (moins de 18 ans)",
  "auth.login": "Connexion d'un créateur",
  "auth.logout": "Déconnexion d'un créateur",
  "social.connect": "Réseau connecté",
  "social.disconnect": "Réseau déconnecté",
  "staff.invite": "Invitation envoyée",
  "staff.invitation_accepted": "Invitation acceptée",
  "staff.invitation_revoked": "Invitation révoquée",
  "staff.login": "Connexion d'un membre de l'équipe",
  "staff.logout": "Déconnexion d'un membre de l'équipe",
  "staff.second_factor_verified": "Double authentification validée",
  "staff.role_changed": "Rôle modifié",
  "staff.disabled": "Membre désactivé",
  "staff.magic_link_unknown":
    "Lien de connexion demandé pour une adresse inconnue",
  "staff.second_factor_failed": "Code de double authentification erroné",
  "staff.second_factor_bypass_attempt":
    "Tentative de contournement de la double authentification",
  "staff.access_denied": "Accès refusé à une page réservée",
  "auth.error": "Erreur d'authentification",
}

type ActivityItem = {
  key: string
  at: Date
  label: string
  who: string
  tone: "info" | "warn" | "critical"
}

export default async function OverviewPage() {
  const { member } = await requireStaff()
  const allowed = (permission: Parameters<typeof can>[1]) =>
    can(member.role, permission)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [metrics, alerts, audit, events] = await Promise.all([
    allowed("metrics.read")
      ? Promise.all([
          prisma.creator.count(),
          prisma.creator.count({ where: { createdAt: { gte: weekAgo } } }),
          prisma.creatorAccount.count(),
          prisma.creator.count({ where: { adultConfirmedAt: { not: null } } }),
        ])
      : null,
    allowed("security.read") ? countRecentSecurityAlerts() : null,
    allowed("audit.read")
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            createdAt: true,
            action: true,
            actorType: true,
            actorId: true,
          },
        })
      : [],
    allowed("security.read")
      ? prisma.securityEvent.findMany({
          where: { severity: { in: ["WARNING", "CRITICAL"] } },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, createdAt: true, type: true, severity: true },
        })
      : [],
  ])

  // Noms des membres de l'équipe cités (jamais d'information sur les créateurs).
  const staffIds = [
    ...new Set(
      audit
        .filter((a) => a.actorType === "ADMIN" && a.actorId)
        .map((a) => a.actorId!)
    ),
  ]
  const staff = staffIds.length
    ? await prisma.staffMember.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      })
    : []
  const staffName = new Map(staff.map((s) => [s.id, s.name]))

  const activity: ActivityItem[] = [
    ...audit.map((a) => ({
      key: `a${a.id}`,
      at: a.createdAt,
      label: LABELS[a.action] ?? a.action,
      who:
        a.actorType === "ADMIN"
          ? (staffName.get(a.actorId ?? "") ?? "Équipe")
          : a.actorType === "USER"
            ? "Créateur"
            : "Système",
      tone: "info" as const,
    })),
    ...events.map((e) => ({
      key: `s${e.id}`,
      at: e.createdAt,
      label: LABELS[e.type] ?? e.type,
      who: "—",
      tone:
        e.severity === "CRITICAL" ? ("critical" as const) : ("warn" as const),
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8)

  const kpis = [
    ...(metrics
      ? [
          {
            label: "Créateurs inscrits",
            value: number.format(metrics[0]),
            hint: `+${number.format(metrics[1])} cette semaine`,
          },
          {
            label: "Réseaux connectés",
            value: number.format(metrics[2]),
            hint: metrics[0]
              ? `${(metrics[2] / metrics[0]).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par créateur`
              : "—",
          },
          {
            label: "Inscriptions terminées",
            value: metrics[0]
              ? `${Math.round((metrics[3] / metrics[0]) * 100)} %`
              : "—",
            hint: "« 18 ans ou plus » confirmé",
          },
        ]
      : []),
    ...(alerts !== null
      ? [
          {
            label: "Alertes de sécurité",
            value: number.format(alerts),
            hint: "dernières 24 h",
            alert: alerts > 0,
          },
        ]
      : []),
  ]

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Vue d&apos;ensemble
        </h1>
        <p className="text-muted-foreground">
          Bonjour {member.name.split(" ")[0]}. État de la plateforme et activité
          récente.
        </p>
      </div>

      {kpis.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card
              key={k.label}
              className={"alert" in k && k.alert ? "border-destructive/40" : ""}
            >
              <CardHeader className="pb-2">
                <CardDescription>{k.label}</CardDescription>
                <CardTitle
                  className={`text-3xl ${"alert" in k && k.alert ? "text-destructive" : ""}`}
                >
                  {k.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {k.hint}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {allowed("audit.read") || allowed("security.read") ? (
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Extrait du journal d&apos;audit et des événements de sécurité.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune activité pour l&apos;instant.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {activity.map((item) => (
                  <li key={item.key} className="flex items-center gap-4 py-2.5">
                    <span className="w-12 font-mono text-xs text-muted-foreground">
                      {time.format(item.at)}
                    </span>
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${
                        item.tone === "critical"
                          ? "bg-destructive"
                          : item.tone === "warn"
                            ? "bg-amber-500"
                            : "bg-brand-2"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-muted-foreground">{item.who}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
