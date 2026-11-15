# Déploiement de test sur cPanel (LWS)

Ce guide installe Linkaro sur un hébergement cPanel **uniquement pour des tests** : trois dossiers, deux sous-domaines, aucune installation de paquets sur le serveur.

> **Ce qui est vérifié automatiquement** (à chaque release, voir §1) : les archives sont décompressées dans un dossier vide, les migrations sont appliquées sur PostgreSQL 10, web et admin démarrent en production, servent leurs fichiers CSS/JS/polices, et le lien d'invitation du premier superadmin s'ouvre.
> **Ce qui ne peut pas l'être** : l'interface cPanel / CloudLinux de LWS elle-même (noms exacts des boutons, Passenger). Les étapes §3 à §5 sont à confirmer à la première installation ; en cas d'écart, noter le message d'erreur et le corriger ici.

## 1. Créer une release

```bash
git tag v0.1.0-test.1          # tag « spécial » : v + numéro de version
git push origin v0.1.0-test.1
```

- `v0.1.0` : release. `v0.1.0-test.1` (avec un tiret) : **pré-release**.
- Le workflow `.github/workflows/release.yml` se déclenche, et fait dans l'ordre : lint, types, tests (sur PostgreSQL 10), build, empaquetage, **démarrage réel des archives**, publication. Si une étape échoue, rien n'est publié.
- Résultat sur <https://github.com/dadv-a11y/linkaro-demo/releases> :

| Archive | Contenu |
|---|---|
| `linkaro-web-<version>.tar.gz` | Application créateurs : serveur Next.js, dépendances, fichiers statiques |
| `linkaro-admin-<version>.tar.gz` | Administration : idem |
| `linkaro-worker-<version>.tar.gz` | Tâches de fond + outils : `migrate.mjs` (base de données) et `admin-create.mjs` (premier superadmin) + les migrations SQL |
| `SHA256SUMS.txt` | Empreintes pour vérifier un téléchargement |

Chaque archive est **autonome** : pas de `npm install`, pas de pnpm. Les fichiers publics (`public/` s'il existe, `.next/static`) y sont inclus.

## 2. Préparer le serveur

1. **Sous-domaines** (cPanel → *Domaines*), par exemple `app.<votre-domaine>` et `admin.<votre-domaine>`. Activer le certificat SSL (AutoSSL) : l'HTTPS est obligatoire.
2. **Base PostgreSQL** (cPanel → *PostgreSQL Databases*) : créer la base et un utilisateur, puis lui donner **tous les privilèges**. Noter le nom complet (souvent préfixé par l'identifiant cPanel).
3. **Node.js 22 minimum** : Linkaro exige Node ≥ 22.12. Vérifier que la version 22 est proposée dans *Setup Node.js App*. Sinon, la demander à LWS : rien ne démarrera avec une version plus ancienne.

## 3. Installer les applications

Pour **web**, puis pour **admin** :

1. cPanel → *Setup Node.js App* → *Create Application* : Node.js **22**, mode **Production**, *Application root* = `linkaro/web` (ou `linkaro/admin`), *Application URL* = le sous-domaine, *Application startup file* = `app.js`.
2. *File Manager* : envoyer l'archive dans ce dossier, puis **Extract**. Le dossier contient alors `app.js`, `standalone/`, `.env.example`.
3. Saisir les variables (§4), puis **Restart**.
4. **Ne pas cliquer sur « Run NPM Install »** : les dépendances sont déjà dans `standalone/`.

Pour **worker**, extraire l'archive dans `linkaro/worker` (pas besoin de créer d'application Node.js : il sert d'abord d'outil, §5).

## 4. Variables d'environnement

Deux possibilités, au choix : les saisir dans *Setup Node.js App → Environment variables*, ou créer un fichier `.env` (modèle : `.env.example` fourni dans chaque archive, droits `600`) dans le dossier de l'application. Pour web et admin, ce `.env` se place dans `standalone/apps/web/` (ou `admin`).

| Variable | Valeur pour le test |
|---|---|
| `DATABASE_URL`, `DATABASE_MIGRATION_URL` | `postgresql://UTILISATEUR:MOT_DE_PASSE@localhost:5432/NOM_BASE?schema=public` (même URL : un seul utilisateur) |
| `WEB_URL`, `ADMIN_URL` | `https://app.…` et `https://admin.…` (HTTPS obligatoire) |
| `CREATOR_AUTH_SECRET`, `STAFF_AUTH_SECRET` | 32 caractères minimum, **différents** : `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `TRUSTED_PROXY_HOPS` | `1` (derrière le proxy de l'hébergeur) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Une boîte créée dans cPanel (*E-mails*) : serveur `mail.<domaine>`, port 465, `SMTP_SECURE=true`. **Obligatoire en production** : sans lui, le serveur refuse de démarrer |
| `ENABLE_DEV_OAUTH` | `false` (le fournisseur simulé est **interdit** en production) |
| `GOOGLE_*`, `TIKTOK_*`, `INSTAGRAM_*`, `FACEBOOK_*` | Clés des applications développeur, avec les URI de redirection de `https://app.…` |

> ⚠️ **Conséquence** : sur ce serveur, les créateurs ne peuvent se connecter qu'avec de **vraies clés** de réseaux sociaux, puisque le fournisseur simulé est refusé en production. L'administration, elle, fonctionne sans (lien magique par e-mail + double authentification).

## 5. Base de données et premier superadmin

Depuis le dossier `linkaro/worker`, avec un `.env` à côté (§4) et un terminal (cPanel → *Terminal*) :

```bash
node --env-file=.env migrate.mjs                                  # crée / met à jour les tables
node --env-file=.env admin-create.mjs --email vous@exemple.com    # affiche UNE fois le lien d'invitation
```

Ouvrir le lien (valable 48 h), puis se connecter par lien magique et activer la double authentification. Les autres membres sont invités depuis l'administration.

Sans terminal : les mêmes commandes sont aussi proposées comme scripts (`package.json` fourni), lançables via le bouton *Run JS script* de *Setup Node.js App* ou une tâche *Cron* ponctuelle (à vérifier sur LWS).

## 6. Mettre à jour

1. Créer un nouveau tag (§1).
2. Remplacer le contenu de chaque dossier par la nouvelle archive (garder le `.env` et ne pas écraser la base).
3. Relancer `migrate.mjs` : seules les nouvelles migrations sont appliquées. Une migration déjà appliquée puis modifiée est refusée (protection voulue).
4. **Restart** des applications.

## 7. PostgreSQL 10

- Prisma 7 prend en charge PostgreSQL 9.6 à 18 ([documentation](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)).
- Une syntaxe des migrations n'existait pas en version 10 : `EXECUTE FUNCTION` dans les déclencheurs (apparue en version 11). Elle est remplacée par `EXECUTE PROCEDURE`, équivalente et acceptée partout.
- Un test (`packages/db/src/migrations.test.ts`) refuse désormais toute syntaxe postérieure à la version 10 dans les migrations, et la CI rejoue tests et migrations sur un vrai PostgreSQL 10 (job « Tests et migrations sur PostgreSQL 10 »).
- Les droits du rôle `linkaro_app` sont ignorés s'il n'existe pas (cas du compte unique de l'hébergement mutualisé). Les journaux restent protégés par leurs déclencheurs : modification interdite, suppression interdite avant 12 mois.

## 8. Limites à connaître

- **PostgreSQL 10 n'est plus maintenu** depuis novembre 2022 (plus de correctifs de sécurité) : acceptable pour des tests avec des données fictives, **pas pour de vraies données**. Pour la production, viser PostgreSQL 16 ou plus.
- Données personnelles (loi n° 2024/017) : sur ce serveur de test, n'utiliser que des comptes et des données de test. Le choix d'hébergement définitif (transfert hors du Cameroun) reste à trancher.
- Le **worker** est un processus durable. Sur un hébergement mutualisé, un processus de fond peut être arrêté par l'hébergeur : à ce stade il ne fait que vérifier le journal d'audit au démarrage, donc ce n'est pas bloquant pour les tests.
- Les journaux (Pino) sortent sur la sortie standard : les consulter dans les journaux de l'application Node.js de cPanel. Aucun secret, téléphone ni e-mail n'y figure en clair.

## 9. Dépannage

| Symptôme | Piste |
|---|---|
| Page blanche / erreur 500 au démarrage | Variable manquante ou invalide : le message de démarrage la nomme (journaux de l'application). Cause fréquente : `SMTP_HOST` vide, secret trop court, URL sans `https://` |
| `Cannot find module` | L'archive n'a pas été extraite entièrement (les liens symboliques de `standalone/node_modules` ont été perdus) : extraire avec cPanel *Extract* plutôt qu'en local sous Windows |
| Pas de style (page sans mise en forme) | `standalone/apps/<app>/.next/static` absent : ré-extraire l'archive |
| `migrate.mjs` : « modifiée après son application » | Ne pas modifier les migrations : en créer une nouvelle |
| `migrate.mjs` : erreur de connexion | URL de base (hôte `localhost`, nom complet de la base et de l'utilisateur, privilèges accordés) |
| Le lien magique n'arrive pas | Tester la boîte e-mail depuis cPanel ; vérifier `SMTP_*` et `MAIL_FROM` |
