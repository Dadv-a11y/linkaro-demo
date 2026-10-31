// Prépare les livrables d'une release à partir des builds déjà faits (`pnpm build`) :
//   release/linkaro-web-<version>.tar.gz      application créateurs (Next.js autonome)
//   release/linkaro-admin-<version>.tar.gz    administration (Next.js autonome)
//   release/linkaro-worker-<version>.tar.gz   tâches de fond + outil de migrations
//   release/SHA256SUMS.txt
// Chaque archive se décompresse directement dans le dossier de l'application du serveur :
// aucune installation (npm, pnpm) n'est nécessaire, toutes les dépendances sont incluses.
//
// Usage : node scripts/package-release.mjs <version>        (ex. v0.1.0 ou v0.1.0-test.1)
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const out = path.join(root, "release")
const staging = path.join(out, ".staging")

const version = process.argv[2]
if (!version || !/^v?\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error(
    "Usage : package-release.mjs <version>  (ex. v0.1.0 ou v0.1.0-test.1)"
  )
  process.exit(1)
}

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim()
  } catch {
    return "inconnu"
  }
}
const commit = process.env.GITHUB_SHA ?? git("rev-parse", "HEAD")

function need(file) {
  if (!existsSync(file)) {
    console.error(
      `Fichier manquant : ${path.relative(root, file)} — lancer « pnpm build » d'abord.`
    )
    process.exit(1)
  }
}

/** Refuse tout fichier de configuration ou de secret qui se serait glissé dans une archive. */
function assertNoSecrets(dir) {
  const forbidden = /^(\.env(\..+)?|.*\.pem|.*\.key|id_rsa.*)$/
  const allowed = new Set([".env.example"])
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.isSymbolicLink())
        walk(path.join(current, entry.name))
      else if (forbidden.test(entry.name) && !allowed.has(entry.name)) {
        // Les fichiers .pem/.key de certificats publics dans node_modules (ex. cacert) sont tolérés.
        if (current.includes(`${path.sep}node_modules${path.sep}`)) continue
        console.error(
          `Fichier sensible dans l'archive : ${path.join(current, entry.name)}`
        )
        process.exit(1)
      }
    }
  }
  walk(dir)
}

const sizeOf = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(1)} Mo`

function writeCommon(dir, name, instructions) {
  cpSync(
    path.join(import.meta.dirname, "release/env.production.example"),
    path.join(dir, ".env.example")
  )
  writeFileSync(
    path.join(dir, "VERSION"),
    `${name} ${version}\ncommit ${commit}\nconstruit le ${new Date().toISOString()}\n`
  )
  writeFileSync(
    path.join(dir, "LISEZMOI.txt"),
    [
      `Linkaro — ${name} ${version}`,
      "",
      ...instructions,
      "",
      "Variables d'environnement : voir .env.example (à saisir dans cPanel, jamais dans Git).",
      "Guide complet : docs/deploiement/cpanel.md dans le dépôt.",
      "",
    ].join("\n")
  )
}

/** package.json minimal : requis ou apprécié par l'interface cPanel, et lance les commandes avec le .env. */
function writePackageJson(dir, name, scripts, main) {
  writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: `linkaro-${name}`,
        version: version.replace(/^v/, ""),
        private: true,
        ...(main ? { main } : {}),
        scripts,
        engines: { node: ">=22.12.0" },
      },
      null,
      2
    )}\n`
  )
}

function archive(name, dir) {
  assertNoSecrets(dir)
  const file = path.join(out, `linkaro-${name}-${version}.tar.gz`)
  // Les liens symboliques de pnpm sont conservés (cp -a / tar) : les dépendances restent résolubles.
  execFileSync("tar", ["-czf", file, "-C", dir, "."])
  console.info(`✔ ${path.basename(file)} (${sizeOf(file)})`)
  return file
}

/** Application Next.js autonome : serveur + dépendances + fichiers statiques. */
function packageNextApp(app, defaultPort) {
  const appDir = path.join(root, "apps", app)
  const standalone = path.join(appDir, ".next/standalone")
  need(path.join(standalone, "apps", app, "server.js"))
  // Fichiers servis tels quels par le navigateur (CSS, JS, polices) : indispensables.
  need(path.join(standalone, "apps", app, ".next/static"))

  const dir = path.join(staging, `linkaro-${app}`)
  mkdirSync(dir, { recursive: true })
  execFileSync("cp", ["-a", standalone, path.join(dir, "standalone")])

  writeFileSync(
    path.join(dir, "app.js"),
    [
      "// Point d'entrée à indiquer comme « Application startup file » dans cPanel (Setup Node.js App).",
      "// Le serveur Next.js autonome et toutes ses dépendances sont dans ./standalone.",
      'process.env.NODE_ENV = "production"',
      `process.env.PORT = process.env.PORT || "${defaultPort}"`,
      "// Écoute locale uniquement : c'est le proxy de l'hébergeur qui reçoit le trafic public.",
      'process.env.HOSTNAME = process.env.LINKARO_HOSTNAME || "127.0.0.1"',
      `require("./standalone/apps/${app}/server.js")`,
      "",
    ].join("\n")
  )
  writePackageJson(dir, app, { start: "node app.js" }, "app.js")
  writeCommon(dir, app, [
    "Installation (cPanel → Setup Node.js App) :",
    "  1. Créer l'application : Node.js 22, mode Production, Application root = ce dossier.",
    "  2. Application startup file : app.js",
    "  3. Saisir les variables d'environnement (voir .env.example), puis Restart.",
    "  Ne pas lancer « Run NPM Install » : les dépendances sont déjà incluses.",
  ])
  return archive(app, dir)
}

function packageWorker() {
  const dist = path.join(root, "apps/worker/dist")
  need(path.join(dist, "index.mjs"))
  need(path.join(dist, "migrate.mjs"))
  const migrations = path.join(root, "packages/db/prisma/migrations")
  need(migrations)

  const dir = path.join(staging, "linkaro-worker")
  mkdirSync(dir, { recursive: true })
  // Sans les cartes de débogage (.map) : lourdes et inutiles sur le serveur.
  cpSync(dist, dir, { recursive: true, filter: (src) => !src.endsWith(".map") })
  cpSync(migrations, path.join(dir, "migrations"), { recursive: true })
  const envFile = "node --env-file-if-exists=.env"
  writePackageJson(dir, "worker", {
    start: `${envFile} index.mjs`,
    migrate: `${envFile} migrate.mjs`,
    "admin:create": `${envFile} admin-create.mjs`,
  })
  writeCommon(dir, "worker", [
    "Outils (à lancer depuis ce dossier, avec un fichier .env à côté, copié depuis .env.example) :",
    "  1. Base de données, à relancer à chaque nouvelle version :  npm run migrate",
    "  2. Premier superadmin (une seule fois) :  npm run admin:create -- --email prenom@exemple.com",
    "     Le lien d'invitation s'affiche une seule fois : le copier tout de suite.",
    "  3. Tâches de fond :  npm start",
    "Sans npm : node --env-file=.env migrate.mjs",
  ])
  return archive("worker", dir)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

const files = [
  packageNextApp("web", 3000),
  packageNextApp("admin", 3001),
  packageWorker(),
]
rmSync(staging, { recursive: true, force: true })

const sums = files
  .map(
    (file) =>
      `${createHash("sha256").update(readFileSync(file)).digest("hex")}  ${path.basename(file)}`
  )
  .join("\n")
writeFileSync(path.join(out, "SHA256SUMS.txt"), `${sums}\n`)
console.info(`\nRelease ${version} prête dans ${path.relative(root, out)}/`)
