import {
  FacebookLogo,
  GoogleLogo,
  InstagramLogo,
  TikTokLogo,
} from "@linkaro/ui/components/social-logos"
import { FlaskConical } from "lucide-react"

export type NetworkLogoName =
  "tiktok" | "instagram" | "facebook" | "google" | "dev"

/** Logo d'un réseau (le fournisseur simulé de développement a une icône neutre). */
export function NetworkLogo({
  logo,
  label,
  className = "size-4",
}: {
  logo: NetworkLogoName
  label: string
  className?: string
}) {
  switch (logo) {
    case "tiktok":
      return <TikTokLogo className={className} title={label} />
    case "instagram":
      return <InstagramLogo className={className} title={label} />
    case "facebook":
      return <FacebookLogo className={className} title={label} />
    case "google":
      return <GoogleLogo className={className} title={label} />
    default:
      return (
        <FlaskConical
          className={`${className} text-muted-foreground`}
          aria-label={label}
          role="img"
        />
      )
  }
}
