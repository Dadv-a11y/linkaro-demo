import { Geist_Mono, Inter } from "next/font/google"

import "@linkaro/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@linkaro/ui/lib/utils"
import type { Metadata } from "next"
import { headers } from "next/headers"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Linkaro — Administration",
  description: "Pilotage et supervision technique de Linkaro.",
}

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Nonce de la CSP, posé par proxy.ts : requis par le script de thème en ligne.
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
