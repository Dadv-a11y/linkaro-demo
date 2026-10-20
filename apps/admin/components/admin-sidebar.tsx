"use client"

import { Avatar, AvatarFallback } from "@linkaro/ui/components/avatar"
import { Badge } from "@linkaro/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@linkaro/ui/components/dropdown-menu"
import { LinkaroLogo } from "@linkaro/ui/components/linkaro-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@linkaro/ui/components/sidebar"
import {
  ChevronsUpDown,
  FileClock,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ScrollText,
  ShieldAlert,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"

export type AdminNavGroup = {
  label: string
  items: {
    title: string
    href: string
    icon: AdminNavIcon
    soon?: boolean
    count?: number
  }[]
}

/** Icônes passées par nom : le serveur ne peut pas transmettre de composant. */
const ICONS = {
  overview: LayoutDashboard,
  creators: Users,
  audit: FileClock,
  security: ShieldAlert,
  logs: ScrollText,
  jobs: ListChecks,
  team: UsersRound,
} satisfies Record<string, LucideIcon>
export type AdminNavIcon = keyof typeof ICONS

export function AdminSidebar({
  nav,
  member,
}: {
  nav: AdminNavGroup[]
  member: { name: string; roleLabel: string }
}) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link
          href="/"
          aria-label="Linkaro, vue d'ensemble"
          className="flex items-center gap-2"
        >
          <LinkaroLogo size="sm" />
          <Badge variant="secondary">Équipe</Badge>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon]
                  return (
                    <SidebarMenuItem key={item.href}>
                      {item.soon ? (
                        <SidebarMenuButton
                          disabled
                          aria-disabled
                          className="opacity-60"
                        >
                          <Icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                        >
                          <Link href={item.href}>
                            <Icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                      {item.count ? (
                        <SidebarMenuBadge className="rounded-full bg-destructive/15 px-1.5 text-destructive">
                          {item.count}
                        </SidebarMenuBadge>
                      ) : item.soon ? (
                        <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">
                          Bientôt
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarFallback>
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex flex-1 flex-col truncate text-left leading-tight">
                    <span className="truncate font-medium">{member.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {member.roleLabel}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem
                  onSelect={async () => {
                    await authClient.signOut()
                    router.replace("/connexion")
                  }}
                >
                  <LogOut />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
