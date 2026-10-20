import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  // Les paquets du monorepo sont fournis en TypeScript : on les embarque.
  noExternal: [/^@linkaro\//],
  // Certaines dépendances CommonJS (pg) appellent require() sur des modules Node :
  // on fournit un require compatible dans le bundle ESM.
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  clean: true,
  sourcemap: true,
})
