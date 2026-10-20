"use client"

import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import { Button } from "@linkaro/ui/components/button"
import { Checkbox } from "@linkaro/ui/components/checkbox"
import { Label } from "@linkaro/ui/components/label"
import Link from "next/link"
import { useActionState } from "react"

import {
  completeOnboarding,
  declareUnderage,
  type OnboardingState,
} from "./actions"

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {}
  )
  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Checkbox id="adult" name="adult" required />
          <Label htmlFor="adult" className="leading-snug">
            J&apos;ai 18 ans ou plus.
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id="terms" name="terms" required />
          <Label htmlFor="terms" className="leading-snug font-normal">
            J&apos;accepte les{" "}
            <Link href="/conditions" className="underline" target="_blank">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </Label>
        </div>
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Un instant…" : "Accéder à mon espace"}
        </Button>
      </form>
      <form action={declareUnderage}>
        <Button
          type="submit"
          variant="link"
          className="px-0 text-muted-foreground"
        >
          J&apos;ai moins de 18 ans
        </Button>
      </form>
    </div>
  )
}
