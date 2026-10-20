# Linkaro

Plateforme qui aide les créateurs de contenu africains à développer et gérer leurs collaborations avec les marques.

- Recherche et cadrage : [`docs/recherche/`](docs/recherche/README.md)
- Architecture et stack : [`docs/architecture/01-stack-technique.md`](docs/architecture/01-stack-technique.md)
- Sécurité et conformité (loi n° 2024/017) : [`docs/architecture/02-securite-et-conformite.md`](docs/architecture/02-securite-et-conformite.md), signalement des failles : [`SECURITY.md`](SECURITY.md)
- Questionnaire de cadrage : `Linkaro _ questionnaire de cadrage.html` ([carte des branchements](docs/questionnaire-branches.md))

## Structure

| Dossier                                                | Rôle                                          |
| ------------------------------------------------------ | --------------------------------------------- |
| `apps/web`                                             | Application des créateurs (port 3000)         |
| `apps/admin`                                           | Pilotage et supervision technique (port 3001) |
| `apps/worker`                                          | Tâches de fond                                |
| `packages/db`                                          | Schéma Prisma, migrations, client PostgreSQL  |
| `packages/env`                                         | Variables d'environnement validées (Zod)      |
| `packages/ui`                                          | Composants shadcn/ui partagés et styles       |
| `packages/eslint-config`, `packages/typescript-config` | Configurations partagées                      |

## Démarrer en local

Prérequis : Node.js 22, pnpm 10, PostgreSQL 16+.

```bash
# 1. Base de données locale : deux rôles (migrations / application)
sudo -u postgres psql -v migrator_password="'linkaro_migrator_dev'" \
  -v app_password="'linkaro_app_dev'" -v database=linkaro_dev \
  -f packages/db/scripts/setup-roles.sql
# En développement, Prisma crée une base temporaire pour vérifier les migrations :
sudo -u postgres psql -c "ALTER ROLE linkaro_migrator CREATEDB;"

# 2. Configuration (puis renseigner le secret d'authentification)
cp .env.example .env
echo "CREATOR_AUTH_SECRET=$(openssl rand -base64 48)" >> .env
echo "STAFF_AUTH_SECRET=$(openssl rand -base64 48)" >> .env

# 3. Dépendances (génère aussi le client Prisma) et migrations
pnpm install
pnpm db:deploy

# 4. Lancer les applications
pnpm dev          # web + admin + worker
pnpm dev:web      # uniquement l'app créateurs
```

Se connecter sans clés de réseaux sociaux : avec `ENABLE_DEV_OAUTH=true` (déjà dans `.env.example`), la page <http://localhost:3000/connexion> propose « Continuer avec Compte de test », un fournisseur OAuth simulé qui propose des créateurs fictifs. Il est interdit en production.

Accéder à l'administration (<http://localhost:3001>) : créer le premier superadmin avec `pnpm admin:create --email prenom@exemple.com`. La commande affiche une seule fois un lien d'invitation (valable 48 h). Ensuite, la connexion se fait par lien magique, puis avec la double authentification (application TOTP). Les autres membres sont invités depuis la page « Membres et invitations ».

E-mails : sans `SMTP_HOST` en développement, ils ne partent pas mais sont écrits dans `.dev-mails/` (exclu de Git). En production, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` et `MAIL_FROM` sont obligatoires.

Vérifier que tout fonctionne : <http://localhost:3000/api/health> et <http://localhost:3001/api/health> doivent répondre `"status": "ok"`.

## Commandes utiles

| Commande                                             | Effet                                               |
| ---------------------------------------------------- | --------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Contrôles qualité                                   |
| `pnpm build`                                         | Build de production (Next.js `standalone` + worker) |
| `pnpm db:migrate`                                    | Créer et appliquer une migration en développement   |
| `pnpm db:deploy`                                     | Appliquer les migrations en production              |
| `pnpm db:studio`                                     | Explorer la base dans le navigateur                 |
| `pnpm admin:create --email <adresse>`                | Inviter le premier superadmin (refusé s'il existe)  |
| `pnpm journal:verify`                                | Vérifier la chaîne du journal d'audit               |

## Production (VPS, sans Docker)

Après `pnpm build`, chaque application démarre avec `pnpm --filter <app> start`. Cette commande lance le serveur autonome `.next/standalone/apps/<app>/server.js`, avec les variables du `.env` racine. Les processus seront gérés par PM2 derrière Caddy (configuration à venir).
