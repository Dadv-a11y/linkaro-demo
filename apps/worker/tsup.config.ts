import { defineConfig } from "tsup"

export default defineConfig({
  // Trois programmes : les tâches de fond, l'application des migrations et la création
  // du premier superadmin (sur le serveur, il n'y a ni dépôt ni pnpm pour les lancer).
  entry: {
    index: "src/index.ts",
    migrate: "src/cli/migrate.ts",
    "admin-create": "../../packages/auth/src/cli/admin-create.ts",
  },
  format: ["esm"],
  // .mjs : reconnu comme module ES sans package.json à côté (hébergement mutualisé compris).
  outExtension: () => ({ js: ".mjs" }),
  platform: "node",
  target: "node22",
  // Tout est embarqué (paquets du monorepo en TypeScript, pg, zod…) : le dossier `dist`
  // se copie tel quel sur un serveur, sans `npm install` ni pnpm. Seules les
  // dépendances listées dans `dependencies` restent externes ; il n'y en a aucune.
  noExternal: [/^@linkaro\//],
  // Certaines dépendances CommonJS (pg) appellent require() sur des modules Node :
  // on fournit un require compatible dans le bundle ESM.
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  clean: true,
  sourcemap: true,
})
