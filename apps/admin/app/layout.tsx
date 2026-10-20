import { Geist, Geist_Mono } from "next/font/google"

import "@linkaro/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@linkaro/ui/lib/utils"
import type { Metadata } from "next"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Linkaro — Administration",
  description: "Pilotage et supervision technique de Linkaro.",
}

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
