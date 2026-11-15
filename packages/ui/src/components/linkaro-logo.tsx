import { cn } from "@linkaro/ui/lib/utils"
import type { SVGProps } from "react"

/** Pictogramme Linkaro (repris du site vitrine). */
export function LinkaroMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path
        d="M25 7.5A12 12 0 1 0 25 24.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <rect
        x="11"
        y="11"
        width="11"
        height="10"
        rx="5"
        transform="rotate(-38 16 16)"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
      />
    </svg>
  )
}

/** Logo complet : pictogramme + LINK + ARO (accent). */
export function LinkaroLogo({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const markSize = { sm: "size-6", md: "size-8", lg: "size-10" }[size]
  const textSize = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-extrabold tracking-wide",
        textSize,
        className
      )}
    >
      <LinkaroMark className={cn("text-brand", markSize)} />
      <span>
        LINK<span className="text-brand">ARO</span>
      </span>
    </span>
  )
}
