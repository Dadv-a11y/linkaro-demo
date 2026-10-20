import { execFileSync } from "node:child_process"
import path from "node:path"
import pg from "pg"

/**
 * Base de test jetable : créée avec le rôle propriétaire, migrée, puis
 * supprimée à la fin. Sans DATABASE_MIGRATION_URL, les tests d'intégration
 * sont ignorés (les tests unitaires tournent quand même).
 */
export default async function setup() {
  const adminUrl = process.env.DATABASE_MIGRATION_URL
  if (!adminUrl) {
    process.env.LINKARO_TEST_DB = ""
    return
  }
  const name = `linkaro_test_${Date.now()}_${process.pid}`
  const admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE "${name}"`)
  await admin.end()

  const url = new URL(adminUrl)
  url.pathname = `/${name}`
  const dbPackage = path.resolve(import.meta.dirname, "../../db")
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: dbPackage,
    env: { ...process.env, DATABASE_MIGRATION_URL: url.toString() },
    stdio: "pipe",
  })
  process.env.DATABASE_URL = url.toString()
  process.env.LINKARO_TEST_DB = name

  return async () => {
    const client = new pg.Client({ connectionString: adminUrl })
    await client.connect()
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await client.end()
  }
}
