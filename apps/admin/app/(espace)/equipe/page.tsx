import {
  can,
  isStaffRole,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  type StaffRole,
} from "@linkaro/auth"
import { prisma } from "@linkaro/db"
import { Badge } from "@linkaro/ui/components/badge"
import { Button } from "@linkaro/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"

import { requireStaff } from "@/lib/auth"

import { revokeInvitation } from "./actions"
import { InviteForm } from "./invite-form"

export const metadata = { title: "Équipe — Linkaro Admin" }

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  superadmin: "tous les droits, gère l'équipe",
  ops: "indicateurs et créateurs",
  support: "fiches créateurs, suspension",
  tech: "audit, sécurité, journaux",
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Douala",
})

const roleLabel = (role: string) =>
  isStaffRole(role) ? STAFF_ROLE_LABELS[role] : role

export default async function TeamPage() {
  const { member } = await requireStaff("staff.read")
  const canManage = can(member.role, "staff.manage")

  const [members, invitations] = await Promise.all([
    prisma.staffMember.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
      },
    }),
    prisma.staffInvitation.findMany({
      where: {
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        invitedBy: { select: { name: true } },
      },
    }),
  ])

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Membres et invitations
        </h1>
        <p className="text-muted-foreground">
          L&apos;accès à l&apos;administration se fait uniquement sur
          invitation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membres ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {m.name}
                    {m.id === member.id ? (
                      <span className="text-muted-foreground"> (toi)</span>
                    ) : null}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {m.email}
                  </span>
                </span>
                <Badge variant="secondary">{roleLabel(m.role)}</Badge>
                {m.status !== "active" ? (
                  <Badge variant="destructive">Désactivé</Badge>
                ) : m.twoFactorEnabled ? (
                  <Badge variant="outline">
                    Double authentification active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600">
                    Double authentification à activer
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations en attente ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune invitation en attente.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {inv.email}
                    </span>
                    <span className="block text-muted-foreground">
                      Expire le {dateFormat.format(inv.expiresAt)}
                      {inv.invitedBy ? ` · par ${inv.invitedBy.name}` : ""}
                    </span>
                  </span>
                  <Badge variant="secondary">{roleLabel(inv.role)}</Badge>
                  {canManage ? (
                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Révoquer
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card id="inviter" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Inviter un membre</CardTitle>
            <CardDescription>
              La personne reçoit un lien personnel, puis active la double
              authentification à sa première connexion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm
              roles={STAFF_ROLES.map((value) => ({
                value,
                label: STAFF_ROLE_LABELS[value],
                description: ROLE_DESCRIPTIONS[value],
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
