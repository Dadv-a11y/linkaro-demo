/**
 * Création du premier superadmin (à lancer sur le serveur, accès SSH requis) :
 *
 *   pnpm admin:create --email awa@exemple.com
 *
 * Refuse de s'exécuter s'il existe déjà un superadmin actif : les membres
 * suivants sont invités depuis le dashboard. Le lien d'invitation est affiché
 * une seule fois ici et n'est envoyé nulle part.
 */
import os from "node:os"
import { parseArgs } from "node:util"

import { prisma } from "@linkaro/db"

import {
  createStaffInvitation,
  StaffInvitationError,
} from "../staff-invitations"

const { values } = parseArgs({ options: { email: { type: "string" } } })

async function main() {
  if (!values.email) {
    console.error("Usage : pnpm admin:create --email <adresse>")
    return 1
  }
  const superadmins = await prisma.staffMember.count({
    where: { role: "superadmin", status: "active" },
  })
  if (superadmins > 0) {
    console.error(
      "Un superadmin actif existe déjà : invite les nouveaux membres depuis le dashboard (Équipe)."
    )
    return 1
  }
  // Trace de qui a lancé le script, et depuis quelle machine.
  const operator = `${os.userInfo().username}@${os.hostname()}`
  const invitation = await createStaffInvitation(
    {
      email: values.email,
      role: "superadmin",
      reason: "Création du premier superadmin (script serveur)",
    },
    { kind: "system", description: `cli:admin-create (${operator})` }
  )
  console.info(
    [
      "",
      "Invitation superadmin créée.",
      `Lien (valable jusqu'au ${invitation.expiresAt.toLocaleString("fr-FR")}, usage unique) :`,
      "",
      `  ${invitation.url}`,
      "",
      "Ce lien n'est affiché qu'une fois. Ouvre-le, puis connecte-toi avec le lien reçu par e-mail",
      "et active la double authentification.",
      "",
    ].join("\n")
  )
  return 0
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof StaffInvitationError ? error.message : error)
    return 1
  })
  .then(async (code) => {
    await prisma.$disconnect()
    process.exit(code)
  })
