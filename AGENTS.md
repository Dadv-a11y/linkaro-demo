<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Conventions du projet Linkaro

- **Langue :** interface, messages d'erreur, commentaires et documentation en français. L'interface est bilingue FR/EN (next-intl, à venir).
- **Composants :** tout composant d'interface est construit à partir des composants **shadcn/ui** de `packages/ui` (composition et variantes). On ajoute un composant shadcn avec `pnpm dlx shadcn@latest add <composant>` depuis `apps/web` ou `apps/admin`. On ne crée pas de composant de base à partir de zéro.
- **Validation :** toute donnée entrante (formulaires, Server Actions, routes API, réponses des API externes) est validée par un schéma **Zod**.
- **Variables d'environnement :** déclarées et validées dans `packages/env`. Un seul fichier `.env`, à la racine (modèle : `.env.example`).
- **Base de données :** schéma dans `packages/db/prisma/schema.prisma`. On importe toujours `prisma` depuis `@linkaro/db`, jamais un nouveau `PrismaClient`.
- **Traçabilité :** toute action sensible doit être inscrite au journal d'audit, et aucun secret (token, mot de passe, numéro de téléphone complet) ne doit apparaître dans les journaux. Voir `docs/architecture/01-stack-technique.md`.
- **Avant de commiter :** `pnpm lint`, `pnpm typecheck`, `pnpm format:check` et `pnpm build` doivent passer.
