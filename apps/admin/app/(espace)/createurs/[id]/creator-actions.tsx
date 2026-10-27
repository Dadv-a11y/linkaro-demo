"use client"

import { Alert, AlertDescription } from "@linkaro/ui/components/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@linkaro/ui/components/alert-dialog"
import { Button } from "@linkaro/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@linkaro/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@linkaro/ui/components/dropdown-menu"
import { Input } from "@linkaro/ui/components/input"
import { Label } from "@linkaro/ui/components/label"
import { Textarea } from "@linkaro/ui/components/textarea"
import {
  Download,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react"
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"

import {
  deleteAction,
  exportAction,
  reactivateAction,
  suspendAction,
  type ActionState,
} from "./actions"

type Props = {
  creator: { id: string; name: string; status: string }
  can: { suspend: boolean; export: boolean; delete: boolean }
}

const idle: ActionState = { status: "idle" }

export function CreatorActions({ creator, can }: Props) {
  const [dialog, setDialog] = useState<"status" | "delete" | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, startExport] = useTransition()
  const suspended = creator.status === "suspended"

  function download() {
    setExportError(null)
    startExport(async () => {
      const result = await exportAction(creator.id)
      if ("error" in result) {
        setExportError(result.error)
        return
      }
      const url = URL.createObjectURL(
        new Blob([result.json], { type: "application/json" })
      )
      const link = document.createElement("a")
      link.href = url
      link.download = `linkaro-createur-${creator.id}.json`
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  if (!can.suspend && !can.export && !can.delete) return null

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {can.export ? (
          <Button variant="outline" onClick={download} disabled={exporting}>
            <Download /> Exporter les données
          </Button>
        ) : null}
        {can.suspend ? (
          <Button variant="outline" onClick={() => setDialog("status")}>
            {suspended ? <PlayCircle /> : <PauseCircle />}
            {suspended ? "Réactiver" : "Suspendre"}
          </Button>
        ) : null}
        {can.delete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Plus d'actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                className="whitespace-nowrap"
                onSelect={() => setDialog("delete")}
              >
                <Trash2 /> Supprimer définitivement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {exportError ? (
        <p className="text-sm text-destructive">{exportError}</p>
      ) : null}

      {can.suspend ? (
        <StatusDialog
          creator={creator}
          open={dialog === "status"}
          onOpenChange={(open) => setDialog(open ? "status" : null)}
        />
      ) : null}
      {can.delete ? (
        <DeleteDialog
          creator={creator}
          open={dialog === "delete"}
          onOpenChange={(open) => setDialog(open ? "delete" : null)}
        />
      ) : null}
    </div>
  )
}

function StatusDialog({
  creator,
  open,
  onOpenChange,
}: {
  creator: Props["creator"]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const suspended = creator.status === "suspended"
  const [state, formAction, pending] = useActionState(
    (suspended ? reactivateAction : suspendAction).bind(null, creator.id),
    idle
  )
  // Fermeture une seule fois, à l'arrivée du résultat : l'état « done » reste
  // ensuite en place et ne doit pas refermer une autre fenêtre ouverte plus tard.
  const closeRef = useRef(onOpenChange)
  useEffect(() => {
    closeRef.current = onOpenChange
  })
  useEffect(() => {
    if (state.status === "done") closeRef.current(false)
  }, [state])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {suspended ? "Réactiver" : "Suspendre"} {creator.name} ?
            </DialogTitle>
            <DialogDescription>
              {suspended
                ? "Le créateur pourra de nouveau se connecter."
                : "Ses sessions sont fermées immédiatement et il ne peut plus se connecter. Ses données sont conservées ; tu pourras le réactiver."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status-reason">
              Motif (inscrit au journal d&apos;audit)
            </Label>
            <Textarea
              id="status-reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder={
                suspended
                  ? "Ex. : vérification d'identité terminée"
                  : "Ex. : signalement d'usurpation d'identité en cours d'examen"
              }
            />
          </div>
          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant={suspended ? "default" : "destructive"}
              disabled={pending}
            >
              {suspended ? "Réactiver" : "Suspendre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  creator,
  open,
  onOpenChange,
}: {
  creator: Props["creator"]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [state, formAction, pending] = useActionState(
    deleteAction.bind(null, creator.id),
    idle
  )
  const [confirm, setConfirm] = useState("")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer définitivement ce compte ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Droit à l&apos;effacement. Le compte, les réseaux connectés et
              leurs tokens sont supprimés. Seule la trace de la suppression est
              conservée au journal d&apos;audit. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-reason">Motif</Label>
            <Textarea
              id="delete-reason"
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Ex. : demande du créateur reçue le 20 octobre par e-mail"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm">
              Pour confirmer, saisis{" "}
              <span className="font-mono">{creator.name}</span>
            </Label>
            <Input
              id="delete-confirm"
              name="confirmName"
              autoComplete="off"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || confirm.trim() !== creator.name.trim()}
            >
              Supprimer définitivement
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
