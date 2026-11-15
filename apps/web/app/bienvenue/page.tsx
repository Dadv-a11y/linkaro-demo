import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@linkaro/ui/components/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth-shell"
import { requireCreator } from "@/lib/auth"

import { OnboardingForm } from "./onboarding-form"

export const metadata = { title: "Bienvenue — Linkaro" }

export default async function WelcomePage() {
  const { creator } = await requireCreator({ onboarded: false })
  if (creator.adultConfirmedAt) redirect("/tableau-de-bord")

  return (
    <AuthShell>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="mb-2 size-16">
            {creator.image ? <AvatarImage src={creator.image} alt="" /> : null}
            <AvatarFallback>
              {creator.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">
            Bienvenue, {creator.name} !
          </CardTitle>
          <CardDescription>
            Ton compte est créé. Une dernière étape avant d&apos;accéder à ton
            espace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </AuthShell>
  )
}
