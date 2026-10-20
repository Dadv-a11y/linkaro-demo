# 02 — Sécurité et conformité dès la conception

> **Principe :** la sécurité et la protection des données sont prises en compte **dès la première ligne de code**, de façon **proportionnée** au risque réel. On protège fortement ce qui est sensible (comptes, tokens des réseaux sociaux, données personnelles, administration). On évite les dispositifs lourds qui ralentiraient le projet sans bénéfice réel à ce stade.
> **Statut :** octobre 2026. Ce document n'est pas un avis juridique : les points marqués ⚖️ sont **à faire valider par un juriste** camerounais.

---

## 1. Cadre légal applicable

### 1.1 Loi n° 2024/017 du 23 décembre 2024 sur la protection des données à caractère personnel (Cameroun)

Elle s'applique à Linkaro : la plateforme traite les données de personnes résidant au Cameroun. Elle est **applicable depuis le 23 juin 2026** ([Village de la Justice](https://www.village-justice.com/articles/cameroun-comprendre-questions-nouvelle-loi-sur-protection-des-donnees-caractere,52122.html), [OBS-CC](https://obs-cc.org/gouvernance/protection-donnees-personelles/), [Anove](https://www.anove.ai/fr/regulations/cameroon-law-2024-017)).

| Obligation (selon les analyses disponibles) | Ce que Linkaro fait |
|---|---|
| **Base légale**, principalement le **consentement**, libre, spécifique et non ambigu | Consentement explicite à l'inscription (CGU et politique de confidentialité), consentement **séparé** pour chaque réseau connecté, consentement distinct pour la prospection |
| **Information** des personnes : identité du responsable, finalités, catégories de données | Politique de confidentialité claire en FR/EN, et rappel au moment de chaque connexion d'un réseau (« voici ce que Linkaro va lire ») |
| **Minimisation et limitation de la conservation** : effacer dès que la donnée n'est plus nécessaire | Collecte du strict nécessaire (§3), durées de conservation définies (§5), purges automatiques |
| **Droits** : accès, rectification, effacement / oubli, opposition, opposition au profilage, portabilité | Page « Mes données » : export (JSON), modification, suppression du compte, déconnexion d'un réseau avec effacement de ses données |
| **Profilage** : droit d'opposition | L'Indice Linkaro est un profilage. Il est **expliqué**, désactivable sur le profil public, et jamais utilisé pour une décision automatique contraignante |
| **Sécurité et responsabilité** (*accountability*) | Mesures du §4, journal d'audit, registre des traitements |
| **Notification des violations** de données à l'Autorité et aux personnes concernées | Procédure d'incident (§7). Le délai légal n'est pas précisé dans les analyses consultées : on applique « sans délai », avec un objectif interne de 72 h ⚖️ |
| **Transferts hors du Cameroun** soumis à **déclaration ou autorisation préalable** de l'Autorité. Un transfert vers un pays sans protection équivalente est sanctionné pénalement | ⚠️ **Point de décision**, voir §1.4 |
| **Formalités préalables** (autorisation de certains traitements) | ⚖️ À vérifier avec le juriste dès que l'Autorité publie ses procédures |
| Sanctions : amendes administratives de 1 à 100 M FCFA, jusqu'à 1 milliard FCFA pour une personne morale au pénal | — |

### 1.2 Autres textes à prendre en compte
- **Loi n° 2010/012 sur la cybersécurité et la cybercriminalité** : sécurité des systèmes d'information. Elle peut imposer des obligations de conservation de certaines traces de connexion ⚖️ (durée à confirmer).
- **Loi n° 2023/009 sur la protection des enfants en ligne** : Linkaro est **réservé aux 18 ans et plus** (contrôle de la date de naissance à l'inscription). La majorité civile camerounaise (21 ans) concerne la **signature des contrats**, pas l'inscription ⚖️.
- **Conditions des plateformes** (Meta, TikTok, Google). Elles imposent notamment :
  - une **URL de suppression des données** ;
  - l'effacement des données d'un réseau quand le créateur révoque l'accès ;
  - pour Google, la politique **« Limited Use »** : les données YouTube ne servent qu'à la fonction pour laquelle l'utilisateur les a confiées, sans revente ni publicité.

  Les respecter est **obligatoire pour passer les App Reviews**.
- **Expansion régionale** (Nigeria, Sénégal, Côte d'Ivoire…) : chaque pays a sa loi sur les données (par exemple le *Nigeria Data Protection Act 2023*). Les mesures ci-dessous couvrent l'essentiel des exigences communes.

### 1.3 Ce que cela impose au produit (règles de conception)
1. **Pas de collecte « au cas où ».** Chaque champ a une finalité écrite dans le registre des traitements.
2. **Consentement granulaire et traçable** : date, version des CGU acceptées et périmètre, inscrits au journal d'audit.
3. **Révocation = effacement.** Déconnecter un réseau supprime ses tokens et ses statistiques privées (démographie). Les statistiques publiques déjà affichées dans le media kit peuvent être conservées si le créateur le choisit.
4. **Suppression de compte réelle**, après un délai de grâce de 30 jours. Les traces d'audit sont conservées, mais **pseudonymisées**.

### 1.4 ⚠️ Décision à prendre : où héberger les données ?

Un VPS chez un hébergeur **hors du Cameroun** (Hetzner, OVH, Contabo…), ou un service comme **Sentry** (États-Unis ou UE), constitue un **transfert de données personnelles hors du Cameroun**, soumis à une démarche préalable auprès de l'Autorité.

| Option | Conséquence |
|---|---|
| **A. VPS hébergé au Cameroun** (Camtel, datacenters locaux, opérateurs) | Pas de transfert pour les données principales. Coût et fiabilité à comparer |
| **B. VPS à l'étranger** (UE recommandée : protection jugée élevée) | Faire la **déclaration ou demande d'autorisation** de transfert auprès de l'Autorité ⚖️, et la mentionner dans la politique de confidentialité |
| Dans tous les cas, pour Sentry | Configurer **sans données personnelles** (pas d'IP, pas d'e-mail ni de téléphone, identifiant utilisateur pseudonymisé) et choisir la région UE. Ou héberger GlitchTip soi-même plus tard |

Rien n'est bloquant pour le développement. **Ce choix doit être fait avant la mise en ligne publique.**

---

## 2. Référentiel de sécurité retenu

Plutôt que d'inventer nos propres règles, on suit un référentiel reconnu, **à un niveau proportionné** :
- **OWASP Top 10** : les 10 risques web majeurs, couverts systématiquement.
- **OWASP ASVS** (*Application Security Verification Standard*) :
  - **niveau 1** pour toute l'application ;
  - **niveau 2** pour l'**authentification**, les **sessions**, l'**administration** et le **stockage des tokens OAuth**.

Les règles de code qui en découlent sont résumées dans `AGENTS.md` et vérifiées en revue.

---

## 3. Classification des données

| Niveau | Exemples | Protection |
|---|---|---|
| **Public** | Pseudo, bio, liens et statistiques publiques choisis pour le media kit | Affichable sur le profil public, avec l'accord du créateur |
| **Interne** | Catégories de contenu, préférences, statut des collaborations | Accessible au créateur et, si besoin, au support (action auditée) |
| **Confidentiel** | Téléphone, e-mail, date de naissance, statistiques privées (démographie de l'audience), montants des deals, IP | Jamais dans les journaux en clair (masquage). Accès support limité et audité. Export et effacement sur demande |
| **Secret** | Tokens OAuth des réseaux, secrets d'API, mots de passe, codes OTP | **Chiffrés au repos** (AES-256-GCM) ou **hachés** (mots de passe : algorithme lent, géré par Better Auth ; codes OTP). Jamais renvoyés au navigateur ni journalisés |

---

## 4. Mesures de sécurité

### 4.1 Déjà en place (socle)

| Mesure | Détail | Où |
|---|---|---|
| **CSP stricte avec nonce** | Seuls nos scripts et ceux portant le nonce de la requête s'exécutent : bloque l'essentiel des injections de script (XSS). Pas de `eval` en production | `packages/security`, `apps/*/proxy.ts` |
| **En-têtes de sécurité** | HSTS (HTTPS forcé, en production), anti-iframe (`X-Frame-Options`, `frame-ancestors`), `nosniff`, `Referrer-Policy`, `Permissions-Policy` (caméra, micro, géolocalisation désactivés), `Cross-Origin-Opener-Policy`. En-tête `X-Powered-By` supprimé. Admin non indexable | `next.config.ts` |
| **Identifiant de requête** | Généré par le serveur à chaque requête. **Celui envoyé par le client est ignoré** (il pourrait être forgé pour brouiller une enquête) | `proxy.ts` |
| **Variables d'environnement validées** | L'app refuse de démarrer si une variable manque ou est invalide. **HTTPS obligatoire** pour les URLs publiques en production | `packages/env` |
| **Secrets hors du code** | `.env` exclu de Git. Seul `.env.example`, sans secret réel, est commité | `.gitignore` |
| **Build sans secrets** | Le build n'a besoin ni de la base ni d'aucun secret | `packages/db` (client paresseux) |
| **Route de santé sobre** | Ne révèle ni version, ni message d'erreur interne | `/api/health` |
| **CI de sécurité** | À chaque push : audit des dépendances (échec si vulnérabilité haute ou critique), **recherche de secrets** dans tout l'historique Git (gitleaks, binaire vérifié par somme de contrôle), tests | `.github/workflows/ci.yml` |
| **Mises à jour automatiques** | Dependabot propose chaque semaine les mises à jour de sécurité | `.github/dependabot.yml` |
| **Vulnérabilités acceptées documentées** | Exception justifiée et datée, revue à chaque mise à jour (aujourd'hui : un outil de lint, jamais livré) | `pnpm-workspace.yaml` |
| **CI à droits minimaux** | Le workflow n'a que la lecture du dépôt | `permissions: contents: read` |
| **Rôles PostgreSQL séparés** | `linkaro_migrator` (propriétaire, migrations uniquement) et `linkaro_app` (web, admin, worker : lecture/écriture des données, aucune création ni modification de table) | `packages/db/scripts/setup-roles.sql` |
| **Journal d'audit infalsifiable** | Ajout seul : le rôle applicatif n'a pas les droits UPDATE, DELETE ni TRUNCATE. Un déclencheur bloque toute modification et toute suppression de moins de 12 mois, **même pour le propriétaire**. Chaque ligne contient l'empreinte SHA-256 de la précédente. Écritures concurrentes sérialisées par un verrou | `packages/db` (migration `traceabilite`), `packages/observability/src/audit.ts` |
| **Vérification d'intégrité** | Le worker vérifie la chaîne à chaque démarrage. En cas de rupture : journal `fatal` et événement de sécurité `CRITICAL`. Vérification manuelle : `pnpm journal:verify` (code de sortie 1 si altéré) | `apps/worker` |
| **Purge encadrée** | Seule la fonction `linkaro_purge_expired_journals()` peut supprimer, et uniquement les lignes de plus de 12 mois | migration `traceabilite` |
| **Journal des événements de sécurité** | Table protégée de la même façon. Identifiant de connexion toujours masqué | `recordSecurityEvent()` |
| **Journaux techniques masqués** | Pino en JSON : chemins sensibles masqués, et toute clé sensible, même imbriquée, nettoyée (téléphones et e-mails partiellement). Secrets écrits en clair dans les messages (`password=…`, `?code=…`) masqués, y compris dans la sortie console de Next.js | `packages/observability` |
| **Journal d'accès sans paramètres** | Chaque requête est journalisée avec son identifiant, sa méthode et son chemin, **sans la query string** (codes OAuth, tokens) | `apps/*/proxy.ts` |
| **Capture centralisée des erreurs** | Toute erreur serveur non gérée (page, API, Server Action, proxy) est journalisée avec l'identifiant de requête | `apps/*/instrumentation.ts` |
| **IP réelle fiable** | `X-Forwarded-For` n'est lu que pour le nombre de proxys de confiance déclaré (`TRUSTED_PROXY_HOPS`). Une IP injectée par le client est ignorée | `getClientIp()` |

### 4.2 Prévues, étape par étape

| Étape | Mesures |
|---|---|
| **2. Journaux et audit** | ✅ Fait (voir §4.1). Reste : consultation dans le dashboard technique (étape admin) et purge planifiée par le worker (pg-boss) |
| **3. Authentification** | ✅ **Créateurs, fait** : aucun mot de passe (inscription par connexion d'un réseau). Sessions en cookie `httpOnly`, `SameSite=Lax` et `Secure` en production. **Tokens OAuth chiffrés** (XChaCha20-Poly1305). PKCE et `state` sur chaque flux. Pas de rattachement automatique par e-mail (anti-prise de contrôle). Limitation de débit stockée en base, par IP réelle (10 tentatives par minute sur la connexion). Majorité confirmée et conditions horodatées. Moins de 18 ans : suppression immédiate. Audit de chaque inscription, connexion, déconnexion et (dé)connexion de réseau. Fournisseur simulé **refusé en production**, et le serveur refuse de démarrer si on l'active. ✅ **Équipe, fait** : annuaire séparé des créateurs, aucune page d'inscription. Premier superadmin par `pnpm admin:create`, les autres par invitation (jeton à usage unique, seule son empreinte SHA-256 est stockée, 48 h). Connexion par lien magique (10 min, envoyé uniquement aux membres actifs, même réponse pour toute adresse). **Double authentification TOTP obligatoire** (QR code généré côté serveur, codes de secours), gestion du second facteur bloquée tant que la session n'est pas validée par un code (événement critique sinon). Session de 8 h non prolongeable, déconnexion après 30 min d'inactivité, cookies `SameSite=Strict`, 5 tentatives par minute sur le lien et les codes. Rôles à moindre privilège (superadmin, pilotage, support, technique) relus en base à chaque requête ; une page non autorisée affiche une **404** (son existence n'est pas révélée) et inscrit un événement de sécurité. Changement de rôle et désactivation avec motif, dernier superadmin protégé, sessions révoquées. Tout est inscrit au journal d'audit |
| **4. Connexion des réseaux** | Flux OAuth avec `state` et **PKCE**. Tokens **chiffrés** (AES-256-GCM, clé hors base). Lecture seule, avec le **minimum de permissions**. Révocation = effacement. Réponses des API externes **validées par Zod**. Délais d'expiration et réessais bornés |
| **Toutes les étapes** | Toute entrée validée par Zod. Autorisation vérifiée **côté serveur** à chaque action (un créateur n'accède qu'à ses données). Requêtes via Prisma (pas de SQL concaténé). Tests automatiques des règles d'accès |
| **Mise en production** | HTTPS (Caddy), pare-feu (SSH, 80, 443 uniquement), connexion SSH par clé seulement, PostgreSQL non exposé sur Internet, **sauvegardes chiffrées** quotidiennes hors du VPS **avec test de restauration**, mises à jour de sécurité automatiques de l'OS, admin restreinte (double authentification et, si possible, liste d'IP). Le dossier de build `.next/` contient des clés générées par Next.js (chiffrement des Server Actions) : il est copié directement sur le serveur, **jamais publié** ni partagé |

### 4.3 Volontairement reporté (pour ne pas être « trop agressif »)

| Mesure | Pourquoi pas maintenant | Quand la reconsidérer |
|---|---|---|
| Test d'intrusion externe | Coûteux, peu utile avant que le produit existe | Avant le lancement public, ou à l'ouverture des paiements |
| WAF / protection anti-DDoS dédiée | La limitation de débit applicative suffit au départ | En cas d'attaque constatée, ou au-delà de quelques milliers d'utilisateurs actifs |
| SIEM, centre de supervision 24/7 | Disproportionné. Le dashboard technique et les alertes couvrent le besoin | Croissance de l'équipe, ou exigence d'un partenaire |
| Chiffrement de **toutes** les colonnes | Complexifie recherches et index. Seuls les secrets sont chiffrés en colonne, le disque et les sauvegardes sont chiffrés | Si des données de santé ou de paiement sont un jour stockées |
| Certification (ISO 27001…) | Hors de portée d'un démarrage | Demande de grands comptes ou de marques |
| Clés matérielles (HSM / KMS) | Clé de chiffrement dans l'environnement serveur, avec accès restreint | Volume important ou exigence réglementaire |

---

## 5. Durées de conservation proposées ⚖️

| Donnée | Durée | Ensuite |
|---|---|---|
| Compte créateur actif | Tant que le compte existe | — |
| Compte supprimé | 30 jours (délai de grâce pour annuler) | Effacement définitif ; audit pseudonymisé |
| Tokens d'un réseau | Jusqu'à la déconnexion ou la révocation | Effacement immédiat |
| Statistiques privées (démographie) | 13 mois glissants | Purge automatique |
| Codes OTP | 10 minutes | Effacement |
| Journaux techniques (Pino) | 90 jours | Suppression |
| Journal d'audit et événements de sécurité | 12 mois | Archive chiffrée, puis suppression selon les obligations légales |
| Réponses au questionnaire | Durée de l'étude | Anonymisation |

---

## 6. Organisation et responsabilités
- **Responsable de traitement :** l'entité juridique Linkaro, une fois créée.
- **Référent « données personnelles »** : une personne nommée, interlocutrice de l'Autorité et des utilisateurs (adresse dédiée, par exemple `privacy@…`). La loi peut exiger un délégué selon le volume ⚖️.
- **Registre des traitements** : tenu dans `docs/conformite/registre-des-traitements.md` (à créer avec la fonctionnalité 1).
- **Signalement des failles de sécurité** : voir [`SECURITY.md`](../../SECURITY.md).

---

## 7. Gestion d'un incident de sécurité

1. **Détecter** : alertes du dashboard technique, erreurs Sentry, signalement externe.
2. **Contenir** : révoquer les sessions ou tokens concernés, bloquer l'IP ou le compte, couper la fonctionnalité si nécessaire. Toutes ces actions sont auditées.
3. **Enquêter** : chronologie unifiée par `requestId`, utilisateur ou IP (dashboard technique).
4. **Notifier** : l'Autorité de protection des données et les personnes concernées si des données personnelles sont touchées, **sans délai** (objectif : 72 h) ⚖️.
5. **Corriger, puis tirer les leçons** : correctif, test de non-régression, mise à jour de ce document.

---

## 8. Checklist avant la mise en ligne publique
- [ ] Choix d'hébergement fait (§1.4) et démarche de transfert effectuée si nécessaire ⚖️
- [ ] Politique de confidentialité et CGU publiées (FR/EN), validées par un juriste ⚖️
- [ ] Registre des traitements à jour
- [ ] Formalités auprès de l'Autorité accomplies ⚖️
- [ ] Sentry configuré sans données personnelles
- [ ] Double authentification active pour tous les comptes admin
- [ ] Sauvegardes chiffrées avec restauration testée
- [ ] URL de suppression des données déclarée chez Meta, TikTok et Google
- [ ] Revue de sécurité de la fonctionnalité (checklist ASVS) faite
