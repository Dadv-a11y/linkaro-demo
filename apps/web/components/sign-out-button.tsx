"use client"

import { Button } from "@linkaro/ui/components/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await authClient.signOut()
        router.replace("/connexion")
      }}
    >
      Se déconnecter
    </Button>
  )
}
