import type { SignInProvider } from "@linkaro/auth"
import { LinkaroMark } from "@linkaro/ui/components/linkaro-logo"
import {
  FacebookLogo,
  GoogleLogo,
  InstagramLogo,
  TikTokLogo,
} from "@linkaro/ui/components/social-logos"
import { cn } from "@linkaro/ui/lib/utils"

/** Logo officiel du réseau (ou pictogramme Linkaro pour le compte de test). */
export function ProviderLogo({
  logo,
  className,
}: {
  logo: SignInProvider["logo"]
  className?: string
}) {
  const props = { className: cn("size-5 shrink-0", className) }
  switch (logo) {
    case "tiktok":
      return <TikTokLogo {...props} />
    case "instagram":
      return <InstagramLogo {...props} />
    case "facebook":
      return <FacebookLogo {...props} />
    case "google":
      return <GoogleLogo {...props} />
    default:
      return (
        <LinkaroMark {...props} className={cn(props.className, "text-brand")} />
      )
  }
}
