"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@linkaro/ui/components/avatar"
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
  FileText,
  Handshake,
  IdCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"

type NavItem = { title: string; href: string; icon: LucideIcon; soon?: boolean }

/** Navigation de l'espace créateur : les entrées « Bientôt » s'activeront au fil des fonctionnalités. */
const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Mon activité",
    items: [
      {
        title: "Tableau de bord",
        href: "/tableau-de-bord",
        icon: LayoutDashboard,
      },
      { title: "Mes réseaux", href: "/reseaux", icon: Share2, soon: true },
      { title: "Media kit", href: "/media-kit", icon: IdCard, soon: true },
    ],
  },
  {
    label: "Marques",
    items: [
      {
        title: "Opportunités",
        href: "/opportunites",
        icon: Sparkles,
        soon: true,
      },
      {
        title: "Collaborations",
        href: "/collaborations",
        icon: Handshake,
        soon: true,
      },
      { title: "Documents", href: "/documents", icon: FileText, soon: true },
    ],
  },
]

export function AppSidebar({
  creator,
}: {
  creator: { name: string; image: string | null }
}) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href="/tableau-de-bord" aria-label="Linkaro, tableau de bord">
          <LinkaroLogo size="sm" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.soon ? (
                      <SidebarMenuButton
                        disabled
                        aria-disabled
                        className="opacity-60"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                    {item.soon ? (
                      <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">
                        Bientôt
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled aria-disabled className="opacity-60">
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
            <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">
              Bientôt
            </SidebarMenuBadge>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    {creator.image ? (
                      <AvatarImage src={creator.image} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {creator.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate font-medium">
                    {creator.name}
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
