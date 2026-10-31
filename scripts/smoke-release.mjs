// Vérifie les archives de release comme le ferait un serveur : décompression dans un
// dossier vide (hors du dépôt, donc sans accès à ses node_modules), migrations, démarrage
// des applications en production, santé, fichiers statiques, puis démarrage du worker.
//
// Usage : SMOKE_DATABASE_URL=postgresql://… node scripts/smoke-release.mjs [dossier-release]
import { execFileSync, spawn } from "node:child_process"
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const releaseDir = path.resolve(process.argv[2] ?? path.join(root, "release"))
const databaseUrl = process.env.SMOKE_DATABASE_URL
if (!databaseUrl) {
  console.error(
    "Renseigne SMOKE_DATABASE_URL (base jetable où appliquer les migrations)."
  )
  process.exit(1)
}

const work = mkdtempSync(path.join(os.tmpdir(), "linkaro-smoke-"))
const children = new Set()
let failed = false

function fail(message) {
  failed = true
  console.error(`✘ ${message}`)
}
const ok = (message) => console.info(`✔ ${message}`)

function archiveFor(name) {
  const file = readdirSync(releaseDir).find(
    (f) => f.startsWith(`linkaro-${name}-`) && f.endsWith(".tar.gz")
  )
  if (!file) throw new Error(`Archive ${name} introuvable dans ${releaseDir}`)
  return path.join(releaseDir, file)
}

function extract(name) {
  const dir = path.join(work, name)
  mkdirSync(dir)
  execFileSync("tar", ["-xzf", archiveFor(name), "-C", dir])
  return dir
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on("error", reject)
  })
}

// Environnement minimal et explicite : rien ne vient du poste de développement.
const baseEnv = {
  PATH: process.env.PATH,
  HOME: work,
  DATABASE_URL: databaseUrl,
  DATABASE_MIGRATION_URL: databaseUrl,
  WEB_URL: "https://app.linkaro-smoke.test",
  ADMIN_URL: "https://admin.linkaro-smoke.test",
  CREATOR_AUTH_SECRET: "smoke-createurs-".padEnd(48, "c"),
  STAFF_AUTH_SECRET: "smoke-equipe-".padEnd(48, "s"),
  TRUSTED_PROXY_HOPS: "1",
  ENABLE_DEV_OAUTH: "false",
  SMTP_HOST: "localhost",
  SMTP_PORT: "25",
  LOG_LEVEL: "info",
}

function start(cwd, args, env) {
  const child = spawn("node", args, {
    cwd,
    env: { ...baseEnv, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let output = ""
  child.stdout.on("data", (chunk) => (output += chunk))
  child.stderr.on("data", (chunk) => (output += chunk))
  children.add(child)
  return { child, output: () => output }
}

async function waitFor(check, timeoutMs, label) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    try {
      const result = await check()
      if (result) return result
    } catch {
      // pas encore prêt
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Délai dépassé : ${label}`)
}

let invitationPath = null

async function checkNextApp(name) {
  const dir = extract(name)
  const port = await freePort()
  const server = start(dir, ["app.js"], { PORT: String(port) })
  try {
    const base = `http://127.0.0.1:${port}`
    const health = await waitFor(
      async () => {
        const response = await fetch(`${base}/api/health`)
        return response.ok ? response.json() : null
      },
      60_000,
      `${name} ne répond pas sur /api/health`
    )
    if (health.status !== "ok" || health.database !== "ok")
      throw new Error(`${name} : santé anormale ${JSON.stringify(health)}`)
    ok(`${name} démarre en production, base de données jointe`)

    const page = await fetch(`${base}/connexion`)
    const html = await page.text()
    if (!page.ok) throw new Error(`${name} : /connexion répond ${page.status}`)
    if (!page.headers.get("content-security-policy"))
      throw new Error(`${name} : en-tête CSP absent`)
    const assets = [
      ...new Set(
        [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map(
          (m) => m[1]
        )
      ),
    ]
    if (
      !assets.some((a) => a.endsWith(".css")) ||
      !assets.some((a) => a.endsWith(".js"))
    ) {
      throw new Error(
        `${name} : la page ne référence ni CSS ni JavaScript statiques`
      )
    }
    for (const asset of assets) {
      const response = await fetch(`${base}${asset}`)
      const size = (await response.arrayBuffer()).byteLength
      if (!response.ok || size === 0)
        throw new Error(
          `${name} : fichier statique introuvable ${asset} (${response.status})`
        )
    }
    ok(
      `${name} sert ses ${assets.length} fichiers statiques (CSS, JS, polices)`
    )

    if (name === "admin" && invitationPath) {
      const invitation = await fetch(`${base}${invitationPath}`)
      if (
        !invitation.ok ||
        !(await invitation.text()).includes("Rejoindre l&#x27;équipe Linkaro")
      ) {
        throw new Error(
          "admin : le lien d'invitation du premier superadmin ne s'ouvre pas"
        )
      }
      ok("admin : le lien d'invitation du premier superadmin s'ouvre")
    }
  } catch (error) {
    fail(
      `${error.message}\n--- journal ${name} ---\n${server.output().slice(-1500)}`
    )
  } finally {
    server.child.kill("SIGTERM")
  }
}

async function checkWorker() {
  const dir = extract("worker")
  try {
    execFileSync("node", ["migrate.mjs"], {
      cwd: dir,
      env: baseEnv,
      encoding: "utf8",
      stdio: "pipe",
    })
    ok("worker : migrations appliquées sur la base")
  } catch (error) {
    fail(`migrations : ${error.stderr || error.message}`)
    return
  }
  try {
    const created = execFileSync(
      "node",
      ["admin-create.mjs", "--email", "premier@linkaro-smoke.test"],
      {
        cwd: dir,
        env: baseEnv,
        encoding: "utf8",
        stdio: "pipe",
      }
    )
    invitationPath =
      created.match(/https?:\/\/\S+(\/invitation\/[\w-]+)/)?.[1] ?? null
    if (!invitationPath)
      throw new Error(`lien d'invitation introuvable dans : ${created}`)
    ok("worker : premier superadmin invité (admin-create)")
  } catch (error) {
    fail(`admin-create : ${error.stderr || error.message}`)
    return
  }
  const worker = start(dir, ["index.mjs"], {})
  try {
    await waitFor(
      () => worker.output().includes("Journal d'audit intègre"),
      20_000,
      "le worker ne démarre pas"
    )
    ok("worker démarre, base jointe, journal d'audit vérifié")
  } catch (error) {
    fail(
      `${error.message}\n--- journal worker ---\n${worker.output().slice(-1500)}`
    )
  } finally {
    worker.child.kill("SIGTERM")
  }
}

try {
  // Les migrations d'abord : les applications interrogent la base.
  await checkWorker()
  await checkNextApp("web")
  await checkNextApp("admin")
} catch (error) {
  fail(error.message)
} finally {
  for (const child of children) child.kill("SIGKILL")
  rmSync(work, { recursive: true, force: true })
}
if (failed) process.exit(1)
console.info("\nToutes les vérifications de la release sont passées.")
