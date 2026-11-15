# 03 — Inscription sans mot de passe et collecte des données (étude)

> **Question du porteur de projet :**
> 1. Faut-il vraiment une inscription par e-mail et mot de passe, alors qu'on veut que le créateur déclare le moins possible ? Ne peut-on pas l'inscrire directement **en connectant ses réseaux sociaux** et récupérer ses informations au passage ?
> 2. Pour les réseaux sans API, peut-on développer une **extension de navigateur** qui lit le tableau de bord du créateur, par capture d'écran ou par lecture du HTML, avec son autorisation ?
>
> **Statut :** décisions prises le 20 octobre 2026 (voir §6).

---

## 1. Réponse courte

| Idée | Recommandation |
|---|---|
| Supprimer l'e-mail + mot de passe | ✅ **Oui.** Aucun mot de passe pour les créateurs. L'inscription **est** la connexion d'un réseau : « Continuer avec TikTok / Instagram / Facebook / Google ». |
| Ne rien faire déclarer du tout | ⚠️ **Presque.** Les réseaux ne fournissent pas tout. Il reste à demander **la confirmation d'avoir 18 ans ou plus** (obligation légale) et un **moyen de récupération et de contact** (numéro WhatsApp), qui peut être facultatif au départ. |
| Extension de navigateur qui lit les tableaux de bord | ❌ **Déconseillé** : contraire aux conditions des plateformes (précédent judiciaire), risque de perdre nos accès API officiels, risque de sécurité élevé, et peu utilisable sur mobile. |
| Récupérer les statistiques des réseaux sans API | ✅ **Autrement** : le créateur **envoie une capture d'écran** de ses statistiques, prise dans l'app du réseau, et Linkaro en extrait les chiffres. Cela marche sur mobile et respecte les conditions des plateformes. |

---

## 2. L'inscription par les réseaux sociaux (sans mot de passe)

### 2.1 Le parcours proposé

```
1. « Bienvenue sur Linkaro. Commence par connecter le réseau où tu publies le plus. »
   [ Continuer avec TikTok ] [ Continuer avec Instagram ] [ Continuer avec Facebook ] [ Continuer avec Google / YouTube ]
        │
        ▼ (une seule autorisation = compte créé + réseau connecté + statistiques importées)
2. Profil pré-rempli : nom, photo, @pseudo, abonnés, engagement… (rien à saisir)
3. Une seule question obligatoire : ☐ « J'ai 18 ans ou plus » (+ acceptation des conditions)
   Pays déduit de l'indicatif ou de l'IP, simplement confirmé.
4. « Ajoute tes autres réseaux » (chaque connexion enrichit le même compte)
5. Facultatif, proposé au bon moment : numéro WhatsApp, pour recevoir les opportunités
   et pouvoir récupérer son compte.
```

Techniquement, Better Auth gère ce schéma : la connexion sociale crée le compte, et `linkSocial` rattache d'autres réseaux au **même** compte. Google et Facebook sont intégrés nativement ; TikTok et Instagram passent par son module OAuth générique ([Better Auth — OAuth](https://www.better-auth.com/docs/concepts/oauth)).

### 2.2 Ce que chaque réseau fournit réellement à l'inscription

| Réseau | Nom, photo, pseudo | E-mail | Date de naissance | Statistiques |
|---|---|---|---|---|
| **TikTok** | ✅ | ❌ | ❌ | ✅ abonnés, likes, vidéos |
| **Instagram** (compte pro) | ✅ | ❌ | ❌ | ✅ insights complets |
| **Facebook** | ✅ | ✅ si le créateur l'accepte | ⚠️ permission spéciale soumise à revue, à vérifier | Pages uniquement |
| **Google / YouTube** | ✅ | ✅ | ❌ (pas sans permission sensible) | ✅ chaîne YouTube |

**Conséquence :** on obtient l'identité et les statistiques sans rien demander, mais **pas l'âge**. Or la loi impose de vérifier qu'un utilisateur a 18 ans ou plus (voir [02-securite-et-conformite.md](02-securite-et-conformite.md)). Une case à cocher « J'ai 18 ans ou plus » est le minimum légal raisonnable. C'est la seule déclaration réellement obligatoire.

### 2.3 Pourquoi garder un moyen de récupération (sans mot de passe)

Si le compte Linkaro ne tient **qu'à un seul réseau**, le créateur perd l'accès à Linkaro dans trois cas :
- il perd son compte TikTok (piratage, suspension) ;
- le réseau révoque l'accès de Linkaro ;
- le réseau est en panne.

Il faut donc **au moins deux moyens d'accès** :
- **deux réseaux connectés** (proposé naturellement à l'étape 4) ;
- **ou un numéro de téléphone** vérifié par code SMS ou WhatsApp, qui sert aussi à recevoir les opportunités.

On le présente comme un avantage (« pour ne jamais perdre ton compte et recevoir les offres »), pas comme une formalité.

### 2.4 Contrainte de calendrier : les validations des plateformes

| Réseau | Connexion ouverte à tous… |
|---|---|
| **Google** (nom, e-mail) | Immédiatement : pas de revue pour les informations de base. Les données YouTube demandent la vérification Google |
| **Facebook** (nom, e-mail) | Immédiatement : Meta indique que `public_profile` et `email` ne demandent pas de revue ([Meta — Login Review](https://developers.facebook.com/docs/facebook-login/guides/permissions/review)) |
| **TikTok** | Après la revue de l'app TikTok (en sandbox : 10 comptes de test) |
| **Instagram** | Après l'App Review Meta et la vérification d'entreprise |

👉 Tant que les revues TikTok et Instagram ne sont pas obtenues, les vrais créateurs ne pourront s'inscrire **que par Google, Facebook ou téléphone**. Le parcours doit donc fonctionner avec n'importe quel premier réseau, et c'est une raison de plus de lancer les revues tôt.

### 2.5 L'équipe Linkaro (administration)

Voir la section 5 : aucun compte ouvert librement, uniquement un premier administrateur créé par script, puis des invitations.

---

## 3. L'extension de navigateur qui lit les tableaux de bord

### 3.1 Pourquoi c'est déconseillé

1. **Conditions des plateformes et précédent judiciaire.** Les conditions de Meta interdisent la collecte automatisée sans autorisation. Dans l'affaire **Meta c. BrandTotal**, une entreprise collectait des données Facebook et Instagram **via une extension de navigateur installée par des utilisateurs consentants**. Le tribunal a jugé l'interdiction de Meta applicable malgré ce consentement (2022). L'affaire s'est conclue par une interdiction définitive de collecter et le paiement d'une somme à Meta ([TechCrunch](https://techcrunch.com/2022/10/03/meta-settles-lawsuit-for-significant-sum-against-businesses-scraping-facebook-and-instagram-data/), [Meitar](https://meitar.com/media/taking-a-swipe-at-scraping-practical-takeaways-from-hiq-v-linkedin-and-meta-v-brandtotal/)). **Le consentement du créateur ne suffit pas.**
2. **Risque pour tout le projet.** Meta ou TikTok peuvent **révoquer nos accès API officiels** s'ils détectent cette pratique. Linkaro perdrait alors sa fonctionnalité centrale.
3. **Sécurité.** Une extension qui lit les pages des réseaux du créateur voit ses sessions connectées. Ce serait une cible de choix pour un attaquant, à l'opposé de notre approche de sécurité dès la conception. Les magasins d'extensions examinent aussi de près ces permissions.
4. **Peu utilisable par nos créateurs.** Chrome pour Android **ne prend pas en charge les extensions** ([How-To Geek via Yahoo Tech](https://tech.yahoo.com/articles/extensions-coming-chrome-android-not-210220710.html)). Surtout, les créateurs consultent leurs statistiques **dans les applications mobiles** TikTok ou Instagram, pas dans un navigateur.
5. **Fragile.** Chaque changement d'interface d'un réseau casse l'extraction, ce qui demande une maintenance permanente.

### 3.2 L'alternative proposée : l'import par capture d'écran

Le créateur ouvre les statistiques **dans l'app** du réseau, fait une **capture d'écran** et l'envoie à Linkaro (depuis le site, ou plus tard par WhatsApp au bot Linkaro). Linkaro en extrait les chiffres : abonnés, vues, portée, répartition de l'audience.

| Avantage | Détail |
|---|---|
| Conforme | Le créateur partage **ses propres données**, aucun accès automatisé à la plateforme |
| Mobile | Une capture d'écran se fait sur tous les téléphones |
| Couvre les trous des API | Profils Facebook personnels, Snapchat, démographie TikTok… |
| Simple pour le créateur | Une image à la place d'un formulaire |

**Limite : une capture peut être retouchée.** Ces chiffres ont donc un niveau de confiance intermédiaire, et des contrôles de cohérence s'appliquent : comparaison avec les données publiques ou connectées, date de la capture, valeurs plausibles.

**Les trois niveaux de confiance affichés sur le profil :**

| Niveau | Source | Badge |
|---|---|---|
| Déclaré | Saisi à la main | `Déclaré` |
| Capture | Extrait d'une capture d'écran envoyée par le créateur | `Capture du JJ/MM` |
| Vérifié | Lu par l'API officielle après connexion du compte | `Vérifié ✓` |

**Choix technique pour l'extraction, à décider :**
- une **IA de vision**, qui reconnaît directement les écrans de statistiques des différentes apps, quelle que soit la langue ;
- ou un **OCR open source** (reconnaissance de texte) avec des règles par écran, gratuit mais plus fragile.

Dans les deux cas, l'image est **supprimée après extraction** (minimisation des données) et le créateur **valide les chiffres extraits** avant leur publication.

---

## 4. Impact sur l'étape 3 (authentification)

| Prévu initialement | Nouvelle proposition |
|---|---|
| E-mail + mot de passe | ❌ Supprimé |
| Téléphone + code | ✅ Conservé comme **moyen de récupération et de contact**, et comme inscription de secours |
| Google | ✅ Inscription et connexion (et YouTube) |
| Facebook, TikTok, Instagram | ✅ **Inscription = connexion du réseau**, en un seul geste |
| Admin | Google + double authentification obligatoire |
| Âge | Case « J'ai 18 ans ou plus » à la fin de l'inscription |

L'inscription et la fonctionnalité 1 (connexion des réseaux) **fusionnent** : c'est plus simple pour le créateur et pour le code.

---

## 5. Accès de l'équipe Linkaro (administration)

> Proposition du porteur de projet : **un premier administrateur créé par un script**, puis **tous les autres invités depuis le dashboard**. Il n'existe donc **aucune page d'inscription** à l'administration.

### 5.1 Principe

```
Serveur (accès SSH)                Dashboard admin                     Nouvel administrateur
───────────────────                ───────────────                     ─────────────────────
pnpm admin:create                  Superadmin : « Inviter »            Ouvre le lien (usage unique, 48 h)
  --email awa@…                      e-mail + rôle + motif               │
  │                                  │                                  ▼
  ▼                                  ▼                                Se connecte avec le compte
Lien d'invitation affiché          Lien envoyé par e-mail               correspondant à l'e-mail invité
UNE SEULE FOIS dans le terminal    (ou copié et transmis à la main)     │
(rien n'est envoyé par le réseau)                                       ▼
                                                                      Active la double authentification
                                                                      (obligatoire avant tout accès)
```

**La confiance de départ repose sur l'accès au serveur** : seul quelqu'un qui peut se connecter en SSH au VPS peut créer le premier administrateur. C'est le point d'ancrage le plus solide disponible.

### 5.2 Règles de sécurité proposées

| Sujet | Règle |
|---|---|
| **Script de démarrage** (`admin:create`) | Crée un **superadmin**, uniquement s'il n'en existe aucun : le script refuse sinon, pour qu'on ne puisse pas s'en servir comme porte dérobée. Le lien est affiché une seule fois. L'action est inscrite à l'audit (acteur : système, machine, date) |
| **Invitation** | Lien à **usage unique**, valable **48 h**, lié à l'**adresse e-mail invitée**. Seule l'empreinte du jeton est stockée en base, jamais le jeton lui-même. Révocable tant qu'elle n'est pas acceptée |
| **Connexion** | Sans mot de passe (méthode à choisir, §5.4), **toujours suivie de la double authentification** (application d'authentification ou passkey) |
| **Page de connexion** | Il reste un écran de connexion pour **revenir** (« Se connecter »), mais **aucun bouton d'inscription**. Une personne non invitée ne peut rien créer |
| **Rôles** | `superadmin` (gère l'équipe), `ops` (pilotage, clients), `support` (fiches clients, actions de support), `tech` (journaux, audit, enquêtes). Chacun ne voit que ce dont il a besoin |
| **Garde-fous** | Personne ne modifie son propre rôle. Le dernier superadmin ne peut pas être retiré. Tout changement de rôle exige un **motif**, inscrit à l'audit |
| **Sessions** | Plus courtes que pour les créateurs : fin après 30 min d'inactivité et 8 h au maximum. Nouvelle double authentification exigée avant une action sensible (inviter, changer un rôle, exporter) |
| **Départ d'un membre** | Désactivation immédiate et **révocation de toutes ses sessions** |
| **Perte de la double authentification** | Un autre superadmin la réinitialise (avec motif, audité). Si le seul superadmin est bloqué : script de secours `admin:recover` sur le serveur, lui aussi audité |

### 5.3 Isolation entre créateurs et équipe

**Recommandation : deux annuaires de comptes séparés.** Les tables `staff_*` pour l'équipe sont distinctes des comptes créateurs, avec des cookies différents sur `admin.` et sur le site public.
- Un bug ou une faille côté créateurs **ne peut pas** transformer un compte créateur en administrateur.
- Better Auth permet deux configurations indépendantes dans le même projet, avec des noms de tables différents.

L'alternative, une seule table d'utilisateurs avec un champ « rôle », est plus simple. Mais une erreur de vérification de rôle suffirait alors à ouvrir l'administration.

### 5.4 Méthode de connexion de l'équipe (à choisir)

| Option | Pour | Contre |
|---|---|---|
| **Google + double authentification** | Aucun service d'e-mail à configurer. Google garantit que l'adresse est vérifiée | Chaque membre doit avoir un compte Google |
| **Lien magique par e-mail + double authentification** | Fonctionne avec n'importe quelle adresse | Demande un fournisseur d'e-mails dès maintenant |
| **Passkey uniquement** (empreinte, Face ID, clé de sécurité) | Le plus sûr, résiste à l'hameçonnage | Moins familier, perte d'appareil à gérer |

---

## 6. Décisions du porteur de projet (20 octobre 2026)

| Sujet | Décision |
|---|---|
| Inscription des créateurs | **Sans mot de passe** : connecter un premier réseau crée le compte. Seule question obligatoire : « J'ai 18 ans ou plus » (et l'acceptation des conditions) |
| Numéro WhatsApp | **Proposé après l'inscription**, avec insistance tant qu'un seul réseau est connecté. Il sert à récupérer le compte et à recevoir les opportunités |
| Accès de l'équipe | Premier superadmin **créé par script**, puis **invitations** depuis le dashboard, sans page d'inscription |
| Connexion de l'équipe | **Lien magique par e-mail + double authentification obligatoire**. En développement, le lien s'affiche dans les journaux. Le fournisseur d'e-mails de production reste à choisir (Brevo, Resend ou SMTP) |
| Comptes équipe / créateurs | **Annuaires séparés** (tables et cookies distincts) |
| Réseaux sans API | Le porteur de projet souhaite à terme une **extension qui lit le HTML** des tableaux de bord, l'import par capture d'écran restant une option secondaire. **Reporté à une phase ultérieure** |

### 6.1 Conditions posées pour l'extension (phase ultérieure)

Les risques décrits au §3.1 restent valables. Avant tout développement de l'extension :
1. **Avis juridique** sur les conditions de chaque plateforme visée (Meta, TikTok, Snapchat…). On ne cible que celles qui ne l'interdisent pas, ou on obtient leur accord.
2. **Pas de concurrence avec nos accès officiels.** L'extension ne sert que pour les réseaux et les données **sans API**, pour ne pas mettre en danger les autorisations obtenues ailleurs.
3. **Lecture à la demande uniquement.** Le créateur ouvre lui-même sa page de statistiques et clique sur « Envoyer à Linkaro ». Pas de navigation automatique ni de collecte en arrière-plan.
4. **Moindre privilège.** L'extension n'a accès qu'aux pages de statistiques concernées. Elle ne lit **jamais les cookies ni les sessions** et n'envoie que les chiffres extraits, pas le HTML complet.
5. **Ordinateur d'abord.** Sur mobile, seul Firefox pour Android accepte les extensions. L'import par capture reste la solution mobile.
6. Les chiffres ainsi obtenus portent un niveau de confiance distinct (« Extension du JJ/MM »), au même titre que les captures.

### 6.2 Propriété des comptes et vérification d'identité (ajout du 20 octobre 2026)

**Propriété d'un réseau.**
- **Réseau connecté par OAuth** : c'est une preuve forte. On ne peut autoriser Linkaro sur un compte qu'en y étant connecté. Ces réseaux portent le badge `Vérifié`.
- **Réseau déclaré** (lien collé, phase ultérieure) : ce n'est pas une preuve. La vérification se fera par **code de contrôle**, placé temporairement dans la bio du compte ou envoyé depuis ce compte. En attendant, le badge reste `Déclaré`.

**Identité de la personne (CNI ou autre pièce).** C'est une donnée hautement sensible au sens de la loi n° 2024/017. Elle sera demandée **uniquement quand elle devient nécessaire**, pas à l'inscription :
- avant un paiement passant par Linkaro ;
- avant la signature d'un contrat via Linkaro ;
- pour obtenir un badge « identité vérifiée » visible des marques.

Principes :
- consentement explicite au moment de la demande ;
- demande par le canal choisi par le créateur (WhatsApp, SMS ou e-mail) ;
- recours possible à un prestataire spécialisé (KYC) ;
- **seul le résultat de la vérification est conservé** (vérifié ou non, date, méthode), pas la pièce ;
- comparaison du nom de la pièce avec les noms des comptes connectés.

À cadrer avec un juriste avant la mise en place.

**E-mails.** Envoi par **Nodemailer** via un serveur **SMTP**, décision du porteur de projet. Ils servent aux liens magiques de l'équipe, puis aux notifications. En développement, les e-mails s'affichent dans les journaux.
