import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@linkaro/ui/components/sidebar"
import { cookies } from "next/headers"
import type { ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { requireCreator } from "@/lib/auth"

/** Espace créateur : barre latérale (repliable, tiroir sur mobile) + contenu. */
export default async function CreatorSpaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const { creator } = await requireCreator()
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar creator={{ name: creator.name, image: creator.image }} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 flex-col p-4 sm:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
