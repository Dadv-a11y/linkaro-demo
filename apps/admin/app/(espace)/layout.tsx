import { can, isStaffRole, STAFF_ROLE_LABELS } from "@linkaro/auth"
import { Button } from "@linkaro/ui/components/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@linkaro/ui/components/sidebar"
import { UserPlus } from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"
import type { ReactNode } from "react"

import { AdminSidebar, type AdminNavGroup } from "@/components/admin-sidebar"
import { SessionCountdown } from "@/components/session-countdown"
import { requireStaff } from "@/lib/auth"
import { countRecentSecurityAlerts } from "@/lib/security-alerts"

/** Espace de l'équipe : barre latérale selon les permissions + contenu. */
export default async function StaffSpaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const { member, expiresAt } = await requireStaff()
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  const allowed = (permission: Parameters<typeof can>[1]) =>
    can(member.role, permission)
  const alerts = allowed("security.read")
    ? await countRecentSecurityAlerts()
    : 0

  // Seules les entrées autorisées pour le rôle apparaissent.
  const nav: AdminNavGroup[] = [
    {
      label: "Pilotage",
      items: [
        { title: "Vue d'ensemble", href: "/", icon: "overview" as const },
        ...(allowed("creators.read")
          ? [
              {
                title: "Créateurs",
                href: "/createurs",
                icon: "creators" as const,
                soon: true,
              },
            ]
          : []),
      ],
    },
    {
      label: "Technique",
      items: [
        ...(allowed("audit.read")
          ? [
              {
                title: "Journal d'audit",
                href: "/audit",
                icon: "audit" as const,
                soon: true,
              },
            ]
          : []),
        ...(allowed("security.read")
          ? [
              {
                title: "Sécurité",
                href: "/securite/evenements",
                icon: "security" as const,
                soon: true,
                count: alerts,
              },
            ]
          : []),
        ...(allowed("logs.read")
          ? [
              {
                title: "Journaux",
                href: "/journaux",
                icon: "logs" as const,
                soon: true,
              },
              {
                title: "Tâches",
                href: "/taches",
                icon: "jobs" as const,
                soon: true,
              },
            ]
          : []),
      ],
    },
    {
      label: "Équipe",
      items: allowed("staff.read")
        ? [
            {
              title: "Membres et invitations",
              href: "/equipe",
              icon: "team" as const,
            },
          ]
        : [],
    },
  ].filter((group) => group.items.length > 0)

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AdminSidebar
        nav={nav}
        member={{
          name: member.name,
          roleLabel: isStaffRole(member.role)
            ? STAFF_ROLE_LABELS[member.role]
            : member.role,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <SessionCountdown expiresAt={expiresAt.toISOString()} />
            {allowed("staff.manage") ? (
              <Button size="sm" asChild>
                <Link href="/equipe#inviter">
                  <UserPlus /> Inviter
                </Link>
              </Button>
            ) : null}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
