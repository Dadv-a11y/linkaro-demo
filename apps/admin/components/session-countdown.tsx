"use client"

import { Badge } from "@linkaro/ui/components/badge"
import { Activity } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/** Temps restant avant déconnexion (inactivité ou durée maximale de la session). */
export function SessionCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter()
  const end = new Date(expiresAt).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const minutes = Math.max(0, Math.ceil((end - now) / 60_000))
  useEffect(() => {
    // Échéance atteinte : le serveur renverra vers la connexion.
    if (minutes === 0) router.refresh()
  }, [minutes, router])

  return (
    <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
      <Activity className="size-3 text-brand" />
      Session : {minutes} min avant déconnexion
    </Badge>
  )
}
