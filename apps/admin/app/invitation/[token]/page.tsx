import {
  findPendingInvitation,
  isStaffRole,
  STAFF_ROLE_LABELS,
} from "@linkaro/auth"
import { Button } from "@linkaro/ui/components/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import Link from "next/link"

import { AdminAuthShell } from "@/components/admin-auth-shell"

import { AcceptInvitationForm } from "./accept-form"
import { InvitationToken } from "./schema"

export const metadata = { title: "Invitation — Linkaro Admin" }

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Douala",
})

export default async function InvitationPage({
  params,
}: PageProps<"/invitation/[token]">) {
  const { token } = await params
  const parsed = InvitationToken.safeParse(token)
  const invitation = parsed.success
    ? await findPendingInvitation(parsed.data)
    : null

  return (
    <AdminAuthShell>
      {invitation && parsed.success ? (
        <AcceptInvitationForm
          token={parsed.data}
          email={invitation.email}
          role={
            isStaffRole(invitation.role)
              ? STAFF_ROLE_LABELS[invitation.role]
              : invitation.role
          }
          expiresAt={dateFormat.format(invitation.expiresAt)}
        />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation non valable</CardTitle>
            <CardDescription>
              Ce lien a expiré, a déjà été utilisé ou a été révoqué. Demande une
              nouvelle invitation à un superadmin.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/connexion">Aller à la connexion</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </AdminAuthShell>
  )
}
