import { Badge } from "@linkaro/ui/components/badge"

export function CreatorStatusBadge({ status }: { status: string }) {
  return status === "suspended" ? (
    <Badge variant="destructive">Suspendu</Badge>
  ) : (
    <Badge variant="secondary">Actif</Badge>
  )
}
