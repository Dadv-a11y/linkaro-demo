"use client"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@linkaro/ui/components/toggle-group"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

export function PeriodPicker({ value }: { value: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  return (
    <ToggleGroup
      type="single"
      value={value}
      variant="outline"
      aria-label="Période"
      aria-busy={pending}
      onValueChange={(next) => {
        if (next)
          startTransition(() => router.replace(`${pathname}?periode=${next}`))
      }}
    >
      <ToggleGroupItem value="7">7 jours</ToggleGroupItem>
      <ToggleGroupItem value="30">30 jours</ToggleGroupItem>
      <ToggleGroupItem value="90">90 jours</ToggleGroupItem>
    </ToggleGroup>
  )
}
