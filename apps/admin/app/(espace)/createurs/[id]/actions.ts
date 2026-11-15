"use server"

import {
  CreatorAdminError,
  deleteCreator,
  exportCreatorData,
  reactivateCreator,
  revealCreatorEmail,
  suspendCreator,
} from "@linkaro/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireStaff } from "@/lib/auth"
import { getRequestContext, logger } from "@/lib/observability"

import { CreatorIdParam, DeleteInput, ReasonInput } from "./schema"

export type ActionState = {
  status: "idle" | "done" | "error"
  message?: string
}

/** Erreurs métier affichées telles quelles ; les autres sont journalisées. */
function failure(error: unknown): ActionState {
  if (error instanceof CreatorAdminError) {
    return { status: "error", message: error.message }
  }
  logger.error({ err: error }, "Action sur un créateur impossible")
  return { status: "error", message: "Une erreur est survenue. Réessaie." }
}

export async function suspendAction(
  creatorId: string,
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { member } = await requireStaff("creators.suspend")
  const parsed = ReasonInput.safeParse({ reason: formData.get("reason") })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message }
  }
  try {
    await suspendCreator(
      {
        actorId: member.id,
        creatorId: CreatorIdParam.parse(creatorId),
        reason: parsed.data.reason,
      },
      await getRequestContext()
    )
  } catch (error) {
    return failure(error)
  }
  revalidatePath(`/createurs/${creatorId}`)
  return { status: "done" }
}

export async function reactivateAction(
  creatorId: string,
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { member } = await requireStaff("creators.suspend")
  const parsed = ReasonInput.safeParse({ reason: formData.get("reason") })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message }
  }
  try {
    await reactivateCreator(
      {
        actorId: member.id,
        creatorId: CreatorIdParam.parse(creatorId),
        reason: parsed.data.reason,
      },
      await getRequestContext()
    )
  } catch (error) {
    return failure(error)
  }
  revalidatePath(`/createurs/${creatorId}`)
  return { status: "done" }
}

export async function deleteAction(
  creatorId: string,
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { member } = await requireStaff("creators.delete")
  const parsed = DeleteInput.safeParse({
    reason: formData.get("reason"),
    confirmName: formData.get("confirmName"),
  })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message }
  }
  try {
    await deleteCreator(
      {
        actorId: member.id,
        creatorId: CreatorIdParam.parse(creatorId),
        ...parsed.data,
      },
      await getRequestContext()
    )
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/createurs")
  redirect("/createurs?supprime=1")
}

/** Export JSON (droit d'accès) : renvoyé au navigateur qui le télécharge. */
export async function exportAction(
  creatorId: string
): Promise<{ json: string } | { error: string }> {
  const { member } = await requireStaff("creators.export")
  try {
    const data = await exportCreatorData(
      { actorId: member.id, creatorId: CreatorIdParam.parse(creatorId) },
      await getRequestContext()
    )
    return { json: JSON.stringify(data, null, 2) }
  } catch (error) {
    const state = failure(error)
    return { error: state.message ?? "Export impossible." }
  }
}

/** E-mail complet, à la demande (consultation journalisée). */
export async function revealEmailAction(
  creatorId: string
): Promise<{ email: string | null } | { error: string }> {
  const { member } = await requireStaff("creators.read")
  try {
    const email = await revealCreatorEmail(
      { actorId: member.id, creatorId: CreatorIdParam.parse(creatorId) },
      await getRequestContext()
    )
    revalidatePath(`/createurs/${creatorId}`)
    return { email }
  } catch (error) {
    const state = failure(error)
    return { error: state.message ?? "Affichage impossible." }
  }
}
