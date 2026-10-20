import { AdminAuthShell } from "@/components/admin-auth-shell"
import { requireSecondFactorStep } from "@/lib/auth"

import { VerifyForm } from "./verify-form"

export const metadata = { title: "Double authentification — Linkaro Admin" }

export default async function VerifyPage() {
  await requireSecondFactorStep("verify-second-factor")
  return (
    <AdminAuthShell>
      <VerifyForm />
    </AdminAuthShell>
  )
}
