// Le build `standalone` de Next.js n'inclut pas les fichiers statiques :
// on copie `.next/static` (et `public/` s'il existe) à côté de server.js.
// Usage : node ../../scripts/copy-standalone-assets.mjs <nom-de-l-app>
import { cpSync, existsSync } from "node:fs"
import path from "node:path"

const app = process.argv[2]
if (!app) {
  console.error("Usage : copy-standalone-assets.mjs <app>")
  process.exit(1)
}

const appDir = process.cwd()
const target = path.join(appDir, ".next/standalone/apps", app)

cpSync(path.join(appDir, ".next/static"), path.join(target, ".next/static"), {
  recursive: true,
})
if (existsSync(path.join(appDir, "public"))) {
  cpSync(path.join(appDir, "public"), path.join(target, "public"), {
    recursive: true,
  })
}
console.info(`[standalone] fichiers statiques copiés pour ${app}`)
