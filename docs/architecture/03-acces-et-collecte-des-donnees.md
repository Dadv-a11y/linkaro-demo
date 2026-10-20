# 03 — Inscription sans mot de passe et collecte des données (étude)

> **Question du porteur de projet :**
> 1. Faut-il vraiment une inscription par e-mail et mot de passe, alors qu'on veut que le créateur déclare le moins possible ? Ne peut-on pas l'inscrire directement **en connectant ses réseaux sociaux** et récupérer ses informations au passage ?
> 2. Pour les réseaux sans API, peut-on développer une **extension de navigateur** qui lit le tableau de bord du créateur, par capture d'écran ou par lecture du HTML, avec son autorisation ?
>
> **Statut :** étude et recommandation, octobre 2026, à valider.

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

Pas de mot de passe non plus : connexion **Google** (compte de l'équipe) **+ double authentification obligatoire** (application d'authentification ou passkey). C'est le niveau ASVS 2 prévu pour l'admin.

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
