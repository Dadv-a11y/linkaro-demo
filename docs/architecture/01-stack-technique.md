# 01 — Stack technique de Linkaro (proposition à valider)

> **Statut :** validée, octobre 2026. Sécurité et conformité : voir [02-securite-et-conformite.md](02-securite-et-conformite.md). Les versions indiquées sont les dernières versions **stables** publiées sur npm à cette date.
> **Décisions déjà prises par le porteur de projet :**
> - Next.js, PostgreSQL et Prisma ;
> - Zod pour la validation et Pino pour les journaux ;
> - Better Auth pour l'authentification ;
> - un monorepo, avec shadcn/ui comme base de **tous** les composants ;
> - un hébergement sur VPS, **sans Docker pour l'instant** ;
> - l'observabilité intégrée à l'application.

---

## 1. Vue d'ensemble

```
                         ┌───────────────────────────── VPS ─────────────────────────────┐
 Créateurs / marques ──► │  Caddy (HTTPS auto)                                            │
   linkaro.app           │    ├─► apps/web    (Next.js, port 3000)  ─┐                    │
 Équipe Linkaro ───────► │    └─► apps/admin  (Next.js, port 3001)  ─┼─► PostgreSQL 16+   │
   admin.linkaro.app     │                                          │     (données,      │
   (accès restreint)     │  worker (pg-boss) : synchro des stats ───┘      sessions,      │
                         │  PM2 : lance et relance les 3 processus         audit, jobs)   │
                         │  Pino → fichiers JSON (rotation)                               │
                         └────────────────────────────────────────────────────────────────┘
                                  │ erreurs                  │ API externes
                                  ▼                          ▼
                              Sentry (SaaS)        TikTok · Instagram · YouTube · Facebook
                                                   Google OAuth · SMS/WhatsApp OTP · e-mail
```

**Pourquoi deux applications Next.js séparées (`web` et `admin`) ?**
- **Sécurité :** l'administration vit sur un sous-domaine à part. On peut la restreindre (liste d'IP, double authentification obligatoire) sans toucher à l'app publique. Une faille dans l'une n'expose pas directement l'autre.
- **Clarté :** l'app créateur doit rester légère pour les connexions mobiles. Le back-office peut être plus lourd (tableaux, graphiques) sans pénaliser les créateurs.
- Les deux partagent la **même base**, la **même config d'authentification**, les **mêmes schémas Zod** et les **mêmes composants shadcn**, via les paquets du monorepo.

---

## 2. Choix détaillés

### 2.1 Fondations

| Besoin | Choix | Version | Pourquoi |
|---|---|---|---|
| Runtime | Node.js LTS | 22.x | Version LTS, supportée par toutes les dépendances |
| Gestionnaire de paquets / monorepo | **pnpm workspaces + Turborepo** | pnpm 10, turbo 2 | Standard des monorepos Next.js. Builds et tests en cache. shadcn/ui supporte officiellement ce montage |
| Framework | **Next.js** (App Router, Server Components, Server Actions) | 16.4 | Décision du porteur de projet |
| UI | **React** | 19.3 | Fourni avec Next 16 |
| Langage | **TypeScript** strict | 5.x | Typage de bout en bout (Prisma → Zod → UI) |

### 2.2 Données et validation

| Besoin | Choix | Version | Pourquoi |
|---|---|---|---|
| Base de données | **PostgreSQL** | 16+ | Décision. Gère aussi les sessions, l'audit et la file de tâches : **un seul service à maintenir** sur le VPS |
| ORM | **Prisma** | 7.x (la 8 est encore en *release candidate*) | Décision. Migrations versionnées, client typé |
| Validation | **Zod** | 4.x | Décision. **Les mêmes schémas** valident les formulaires (client), les Server Actions et les réponses des API externes |
| Variables d'environnement | `@t3-oss/env-nextjs` (sur Zod) | — | L'app **refuse de démarrer** si une variable est absente ou invalide, ce qui évite des pannes silencieuses |
| Chiffrement des tokens OAuth | `node:crypto` (AES-256-GCM) | natif | Les tokens TikTok, Instagram et Google donnent accès aux comptes des créateurs. Ils sont **chiffrés en base**, avec une clé dans l'environnement |

### 2.3 Authentification et autorisations

| Besoin | Choix | Pourquoi |
|---|---|---|
| Authentification | **Better Auth** (1.7) + adaptateur Prisma | Décision. Les utilisateurs et sessions restent **dans notre PostgreSQL** |
| Connexion par téléphone + code | Plugin `phoneNumber` de Better Auth | Le mode de connexion le plus naturel pour les créateurs camerounais (voir recherche 02) |
| Connexion Google | Provider social Google | Utile aussi pour lier ensuite YouTube |
| E-mail + mot de passe | Natif | Pour l'équipe interne et les marques |
| Rôles | Plugin `admin` + contrôle d'accès | Rôles : `creator`, `brand` (plus tard), `support`, `ops`, `tech`, `superadmin` |
| Double authentification | Plugin `twoFactor` | **Obligatoire pour tout compte d'administration** |
| Limitation de débit | Rate limit Better Auth, stocké en base | Protège la connexion et l'envoi de codes contre la force brute et les abus (les SMS coûtent de l'argent) |

> ⚠️ L'envoi des codes par **SMS ou WhatsApp** demande un fournisseur : Twilio, Africa's Talking, Orange SMS API, ou WhatsApp Cloud API. **C'est à choisir** (coût par SMS au Cameroun, fiabilité). En développement, les codes s'affichent dans les journaux.

### 2.4 Interface

| Besoin | Choix | Pourquoi |
|---|---|---|
| Composants | **shadcn/ui**, dans un paquet partagé `packages/ui` | Décision. **Règle : tout nouveau composant est construit à partir des composants shadcn** (composition et variantes), jamais à partir de zéro |
| Styles | **Tailwind CSS** 4 | Requis par shadcn/ui |
| Icônes | lucide-react | Icônes par défaut de shadcn |
| Formulaires | react-hook-form + `@hookform/resolvers/zod` | Le composant `Form` de shadcn repose dessus. Validation par les schémas Zod partagés |
| Tableaux (admin) | TanStack Table | Base du composant *Data Table* de shadcn : tri, filtres, pagination |
| Graphiques (dashboards) | Recharts, via le composant *Chart* de shadcn | Cohérent avec le design system |
| Bilinguisme FR/EN | **next-intl** (4.x) | Le Cameroun a deux langues officielles. Messages traduits, formats de dates, de nombres et de FCFA |
| Thème clair / sombre | next-themes | Fourni par la doc shadcn |

### 2.5 Tâches de fond

| Besoin | Choix | Pourquoi |
|---|---|---|
| File de tâches | **pg-boss** (12.x) | Fonctionne **dans PostgreSQL** : pas de Redis à installer sur le VPS. Couvre la synchronisation périodique des statistiques, le rafraîchissement des tokens, les relances et le calcul de l'Indice Linkaro |
| Processus worker | Script Node du monorepo (`apps/worker`) | Séparé du serveur web : une synchro lente ne ralentit pas l'app |

### 2.6 Observabilité, traçabilité et sécurité

C'est le cœur du « dashboard technique ». **Trois niveaux complémentaires :**

| Niveau | Outil | Ce qu'on y trouve | Où le consulter |
|---|---|---|---|
| **1. Journal d'audit** (qui a fait quoi) | Table `AuditLog` en PostgreSQL, **en ajout seul** | Chaque action sensible : qui (utilisateur, rôle), quoi (action, objet, valeurs **avant / après**), quand, d'où (IP, pays, appareil), identifiant de requête, résultat | Dashboard admin → « Audit » |
| **2. Journal de sécurité** | Table `SecurityEvent` | Connexions réussies et échouées, codes OTP erronés, blocages par limite de débit, changements de rôle, tokens révoqués, accès refusés | Dashboard admin → « Sécurité » |
| **3. Journaux techniques** | **Pino** (10.x) → fichiers JSON avec rotation (`pino-roll`) | Toutes les requêtes, appels aux API externes, durées, erreurs, avec masquage automatique des secrets (`redact` : tokens, mots de passe, numéros de téléphone) | Fichiers sur le VPS + recherche dans le dashboard (les dernières 24–72 h sont indexées en base) |
| Erreurs applicatives | **Sentry** (`@sentry/nextjs`, offre gratuite au départ) | Trace complète de chaque plantage, lien vers l'utilisateur et la requête | Sentry + lien depuis le dashboard |

**Le fil conducteur : l'identifiant de requête (`requestId`).** Il est créé à l'entrée de chaque requête par le *middleware* (`proxy.ts` dans Next 16). Il est propagé dans les journaux Pino, l'audit, les événements de sécurité, Sentry et les tâches de fond. **Une enquête part d'un utilisateur, d'une IP ou d'un `requestId`** et reconstitue la chronologie complète.

**Garanties d'intégrité du journal d'audit :**
- l'utilisateur PostgreSQL de l'application n'a **pas le droit** de modifier ni de supprimer des lignes d'audit (`REVOKE UPDATE, DELETE`) ;
- chaque ligne contient l'**empreinte (hash) de la ligne précédente** (chaînage). Une suppression ou une modification manuelle devient **détectable** ;
- la durée de conservation est à définir (proposition : 12 mois en base, puis archive).

**Sécurité HTTP :** en-têtes de sécurité (CSP, HSTS…), protection CSRF native de Better Auth et des Server Actions, cookies `httpOnly` / `secure` / `sameSite`.

### 2.7 Qualité

| Besoin | Choix |
|---|---|
| Tests unitaires | **Vitest** (calcul de l'Indice Linkaro, schémas Zod, services) |
| Tests de bout en bout | **Playwright** (inscription, connexion, ajout de réseau) |
| Lint / format | ESLint (config Next) + Prettier |
| Hooks Git | lefthook : lint et vérification de types avant commit |
| CI | GitHub Actions : lint, types, tests, build à chaque push |

### 2.8 Déploiement sans Docker

| Élément | Choix | Rôle |
|---|---|---|
| Processus | **PM2** | Lance `web`, `admin` et `worker`, les relance en cas de crash, redémarre sans interruption |
| Reverse proxy | **Caddy** | HTTPS automatique (Let's Encrypt), routage par sous-domaine |
| Base | PostgreSQL installé sur le VPS | Sauvegardes quotidiennes (`pg_dump`) chiffrées et copiées **hors du VPS** |
| Journaux | Fichiers Pino + `logrotate` | Rotation et compression |
| Build Next.js | `output: "standalone"` | Paquet autonome, léger à copier sur le serveur |

> Tout est prêt pour **passer à Docker plus tard** sans changer le code : il suffira d'ajouter les `Dockerfile`.

**Prérequis côté VPS :** au moins 2 vCPU et 4 Go de RAM, accès SSH, Ubuntu 22.04 ou 24.04, et le droit d'installer Node, PostgreSQL et Caddy.

---

## 3. Structure du monorepo

```
linkaro/
├─ apps/
│  ├─ web/            # Créateurs (inscription, profil, réseaux, collaborations), profils publics, plus tard marques
│  ├─ admin/          # Pilotage (clients, KPIs, support) + technique (audit, sécurité, logs, jobs, intégrations)
│  └─ worker/         # Tâches de fond pg-boss (synchro des stats, tokens, Indice Linkaro)
├─ packages/
│  ├─ db/             # Schéma Prisma, migrations, client, seed
│  ├─ auth/           # Configuration Better Auth partagée (rôles, plugins), helpers de session
│  ├─ validators/     # Schémas Zod partagés (formulaires, API, intégrations)
│  ├─ ui/             # Composants shadcn/ui + composants Linkaro composés à partir d'eux
│  ├─ observability/  # Logger Pino, requestId, audit(), securityEvent(), intégration Sentry
│  ├─ integrations/   # Clients TikTok / Instagram / YouTube / Facebook (OAuth, récupération des stats)
│  ├─ engagement/     # Calcul de l'Indice Linkaro (fonctions pures, testées)
│  ├─ i18n/           # Messages FR/EN partagés
│  └─ config/         # tsconfig, ESLint, Prettier partagés
├─ docs/              # Recherche, architecture, décisions
├─ turbo.json
└─ pnpm-workspace.yaml
```

Les fichiers actuels du dépôt (`index.html` et le questionnaire) seront déplacés dans un dossier `legacy/` ou `public-site/`, sans être modifiés.

---

## 4. Les deux dashboards demandés

### 4.1 Dashboard de pilotage (équipe business et support)
- **Vue d'ensemble :** inscriptions par jour et semaine, taux d'activation (au moins un réseau connecté), répartition par pays, réseau et palier d'abonnés, créateurs actifs.
- **Clients :** liste filtrable (créateurs, plus tard marques), avec une fiche par client : profil, réseaux connectés et leur état, historique d'activité, notes internes.
- **Actions de support :** suspendre ou réactiver un compte, forcer la déconnexion, renvoyer un code. **Chaque action est inscrite dans l'audit**, avec son auteur et un motif obligatoire.
- **Questionnaire de cadrage :** import et visualisation des réponses (étape ultérieure).

### 4.2 Dashboard technique (équipe tech)
- **Audit :** recherche par utilisateur, action, objet, période, IP ou `requestId`. Comparaison avant / après.
- **Sécurité :** échecs de connexion, IP suspectes, pics d'envoi de codes, comptes bloqués. Alertes sur des seuils.
- **Enquête :** saisir un utilisateur, une IP ou un `requestId` → **chronologie unifiée** (requêtes, actions, événements de sécurité, erreurs, tâches de fond).
- **Santé des intégrations :** taux d'erreur par réseau social, tokens expirés ou révoqués, quotas d'API.
- **Tâches de fond :** files pg-boss (en attente, en échec, réessais), relance manuelle.
- **Erreurs :** dernières erreurs Sentry, avec un lien vers le détail.

L'accès est réservé aux rôles `tech` et `superadmin`, avec double authentification. **La consultation elle-même est auditée** (qui a regardé quoi).

---

## 5. Ce qui reste à décider (non bloquant pour démarrer)

| Sujet | Options | Quand |
|---|---|---|
| Fournisseur SMS / WhatsApp pour les codes | Twilio, Africa's Talking, Orange SMS API, WhatsApp Cloud API | Avant la mise en ligne de la connexion par téléphone |
| Fournisseur d'e-mails | Resend, Brevo, SMTP du VPS | Avant les e-mails transactionnels |
| Nom de domaine | `linkaro.app`, `linkaro.africa`… | Avant les App Reviews Meta, TikTok et Google |
| Sentry SaaS ou GlitchTip auto-hébergé | SaaS gratuit au départ | Au déploiement |
| Hébergeur et capacité du VPS | — | Au déploiement |

---

## 6. Ordre de mise en place proposé

1. **Socle du monorepo** : pnpm, Turborepo, TypeScript, ESLint/Prettier, `packages/config`, `packages/ui` (shadcn initialisé), `packages/db` (Prisma + PostgreSQL), variables d'environnement validées.
2. **Observabilité d'abord** : logger Pino, `requestId`, tables `AuditLog` et `SecurityEvent`. Ainsi, **la fonctionnalité 1 est tracée dès sa première ligne**.
3. **Authentification** : Better Auth (téléphone + code, Google, e-mail), rôles, double authentification pour l'admin.
4. **Fonctionnalité 1** : inscription en 3 questions, ajout et connexion des réseaux, profil public (voir [recherche 02](../recherche/02-integrations-reseaux-sociaux.md)).
5. **Admin minimal** : liste des créateurs, audit, sécurité.
