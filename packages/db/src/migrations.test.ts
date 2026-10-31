import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Garde-fou : les migrations doivent rester exécutables sur PostgreSQL 10
 * (version installée sur le serveur de test). Ce test repère les syntaxes
 * introduites après la version 10 ; la CI rejoue en plus les migrations sur un
 * vrai PostgreSQL 10.
 */
const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../prisma/migrations")

const TOO_RECENT: { pattern: RegExp; why: string }[] = [
  {
    pattern: /EXECUTE\s+FUNCTION/i,
    why: "PG 11 : écrire EXECUTE PROCEDURE dans CREATE TRIGGER",
  },
  { pattern: /CREATE\s+PROCEDURE|\bCALL\s+\w/i, why: "PG 11 : procédures" },
  {
    pattern: /ALTER\s+TYPE[^;]*ADD\s+VALUE/i,
    why: "PG < 12 : ADD VALUE interdit dans une transaction (Prisma en ouvre une)",
  },
  { pattern: /\bINCLUDE\s*\(/i, why: "PG 11 : index couvrants (INCLUDE)" },
  {
    pattern: /PARTITION\s+BY\s+HASH|PARTITION\s+OF\s+[^;]*DEFAULT/i,
    why: "PG 11 : partitionnement par hachage ou partition par défaut",
  },
  {
    pattern: /GENERATED\s+ALWAYS\s+AS\s*\([^)]*\)\s*STORED/i,
    why: "PG 12 : colonnes générées",
  },
  {
    pattern: /\bMATERIALIZED\b[^;]*\bAS\b\s*\(|\bAS\s+(NOT\s+)?MATERIALIZED\b/i,
    why: "PG 12 : MATERIALIZED dans une requête WITH",
  },
  {
    pattern: /REINDEX[^;]*CONCURRENTLY/i,
    why: "PG 12 : REINDEX CONCURRENTLY",
  },
  {
    pattern: /gen_random_uuid\s*\(/i,
    why: "PG 13 : gen_random_uuid() (PG 10 exige l'extension pgcrypto)",
  },
  { pattern: /NULLS\s+NOT\s+DISTINCT/i, why: "PG 15" },
  { pattern: /jsonb_path_|@@\s*'\$/i, why: "PG 12 : chemins SQL/JSON" },
  { pattern: /\bMERGE\s+INTO\b/i, why: "PG 15 : MERGE" },
]

const files = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    name: entry.name,
    sql: readFileSync(
      path.join(MIGRATIONS_DIR, entry.name, "migration.sql"),
      "utf8"
    ),
  }))

describe("migrations compatibles PostgreSQL 10", () => {
  it("trouve les migrations", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const { name, sql } of files) {
    it(`${name} n'utilise aucune syntaxe postérieure à PostgreSQL 10`, () => {
      // Les commentaires SQL ne comptent pas.
      const code = sql.replace(/--.*$/gm, "")
      const found = TOO_RECENT.filter(({ pattern }) => pattern.test(code)).map(
        ({ why }) => why
      )
      expect(found).toEqual([])
    })
  }
})
