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
- **Sécurité dès la conception** (référentiel OWASP ASVS niveau 1, niveau 2 pour l'authentification, les sessions, l'admin et les tokens). Détails : `docs/architecture/02-securite-et-conformite.md`.
  - Autorisation vérifiée **côté serveur** à chaque Server Action et route : un utilisateur n'accède qu'à ses propres données, et le rôle est revérifié pour l'admin.
  - Jamais de secret (token, mot de passe, code OTP), ni de téléphone ou d'e-mail en clair, dans les journaux, les erreurs renvoyées au client ou Sentry.
  - Tokens OAuth chiffrés au repos. Mots de passe et codes OTP hachés. Rien de tout cela n'est renvoyé au navigateur.
  - Pas de SQL concaténé : passer par Prisma (ou `$queryRaw` avec des paramètres liés).
  - Pas de `dangerouslySetInnerHTML`, ni de script externe sans l'ajouter explicitement à la CSP (`packages/security`).
  - Toute action sensible (connexion, changement de rôle, export, suppression, action admin) est inscrite au journal d'audit.
- **Données personnelles** (loi camerounaise n° 2024/017) : ne collecter que le nécessaire, avec une finalité notée dans le registre des traitements. Respecter les durées de conservation. Déconnecter un réseau efface ses tokens et ses statistiques privées.
- **Avant de commiter :** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` et `pnpm build` doivent passer.
