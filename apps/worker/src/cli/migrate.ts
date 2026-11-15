/**
 * Applique les migrations SQL sans la CLI Prisma (hébergement sans accès au
 * terminal, serveur de test). Compatible avec `prisma migrate deploy` : mêmes
 * dossiers, même table `_prisma_migrations`, même somme de contrôle.
 *
 * Usage : node migrate.mjs [dossier-des-migrations]
 * Connexion : DATABASE_MIGRATION_URL, sinon DATABASE_URL (rôle propriétaire du schéma).
 */
import { createHash, randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import pg from "pg"
import { z } from "zod"

// Variables lues directement : appliquer le schéma n'exige pas le reste de la configuration.
const ConnectionUrl = z
  .string({ error: "valeur manquante" })
  .min(1, "valeur manquante")
  .refine((value) => /^postgres(ql)?:\/\//.test(value), {
    message: "L'URL doit commencer par postgresql://",
  })

const lockKey = 7_421_001 // verrou applicatif : une seule exécution à la fois

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id                  VARCHAR(36) PRIMARY KEY NOT NULL,
  checksum            VARCHAR(64) NOT NULL,
  finished_at         TIMESTAMPTZ,
  migration_name      VARCHAR(255) NOT NULL,
  logs                TEXT,
  rolled_back_at      TIMESTAMPTZ,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
)`

type Applied = {
  migration_name: string
  checksum: string
  finished_at: Date | null
}

async function main() {
  const url = ConnectionUrl.safeParse(
    process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL
  )
  if (!url.success) {
    throw new Error(
      "Renseigne DATABASE_MIGRATION_URL (ou DATABASE_URL) : " +
        (url.error.issues[0]?.message ?? "valeur manquante")
    )
  }
  const dir = path.resolve(
    process.argv[2] ?? path.join(import.meta.dirname, "migrations")
  )
  const migrations = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8")
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      }
    })
  if (migrations.length === 0) throw new Error(`Aucune migration dans ${dir}`)

  // `?schema=` est une option de Prisma, inconnue de pg : on la retire.
  const connection = new URL(url.data)
  const schema = connection.searchParams.get("schema") ?? "public"
  connection.searchParams.delete("schema")
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema))
    throw new Error("Nom de schéma invalide")

  const client = new pg.Client({ connectionString: connection.toString() })
  await client.connect()
  try {
    await client.query("SELECT pg_advisory_lock($1)", [lockKey])
    await client.query(`SET search_path TO "${schema}"`)
    await client.query(MIGRATIONS_TABLE)

    const { rows } = await client.query<Applied>(
      `SELECT migration_name, checksum, finished_at FROM "_prisma_migrations"
       WHERE rolled_back_at IS NULL`
    )
    const known = new Map(rows.map((row) => [row.migration_name, row]))

    let applied = 0
    for (const migration of migrations) {
      const previous = known.get(migration.name)
      if (previous) {
        if (!previous.finished_at) {
          throw new Error(
            `La migration ${migration.name} est restée inachevée : à examiner avant de continuer.`
          )
        }
        if (previous.checksum !== migration.checksum) {
          throw new Error(
            `La migration ${migration.name} a été modifiée après son application : refus d'avancer.`
          )
        }
        console.info(`= ${migration.name} (déjà appliquée)`)
        continue
      }
      // Tout ou rien : en cas d'erreur, rien n'est enregistré et on peut recommencer.
      await client.query("BEGIN")
      try {
        await client.query(migration.sql)
        await client.query(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
           VALUES ($1, $2, now(), $3, now(), 1)`,
          [randomUUID(), migration.checksum, migration.name]
        )
        await client.query("COMMIT")
      } catch (error) {
        await client.query("ROLLBACK")
        throw new Error(
          `Échec de la migration ${migration.name} : ${error instanceof Error ? error.message : String(error)}`
        )
      }
      console.info(`+ ${migration.name} appliquée`)
      applied += 1
    }
    console.info(
      applied === 0
        ? "Base de données déjà à jour."
        : `${applied} migration(s) appliquée(s).`
    )
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [lockKey])
      .catch(() => undefined)
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
