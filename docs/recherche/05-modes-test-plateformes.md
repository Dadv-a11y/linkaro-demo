# 05 — Tester les connexions aux réseaux sociaux en développement

> **Question du porteur de projet :** peut-on tester les intégrations (connexion OAuth, récupération des statistiques) **avant** les App Reviews, depuis sa machine locale ou un sous-domaine de test, avec ses propres comptes ?
> **Réponse courte : oui, pour YouTube, TikTok, Instagram et Facebook**, avec quelques contraintes. Snapchat ne fournit de toute façon pas de statistiques.
> **Statut :** recherche d'octobre 2026, sur la documentation officielle quand elle était accessible. À revérifier dans chaque console développeur au moment de la configuration.

---

## 1. Synthèse

| Plateforme | Mode test | Qui peut se connecter | `localhost` accepté ? | Données testables | Limites du mode test |
|---|---|---|---|---|---|
| **YouTube (Google)** | Écran de consentement en statut **« Testing »** | Les **utilisateurs test** ajoutés dans la console Google Cloud | ✅ `http://localhost` autorisé. Les domaines publics doivent être en HTTPS, et les IP brutes sont interdites | Tout : stats publiques et Analytics (âge, genre, pays) | Écran « application non vérifiée » ; **le token de rafraîchissement expire après 7 jours** (il faut se reconnecter) |
| **TikTok** | **Sandbox** (jusqu'à 5 par app) | Jusqu'à **10 « target users »**, qui doivent être **des comptes TikTok que vous possédez** | ❌ Pour le web, les URI de redirection **doivent être en HTTPS** → passer par le sous-domaine de test | Login Kit + Display API : profil, stats (abonnés, likes), vidéos et leurs stats | Pas de revue nécessaire en sandbox. Les comptes cibles peuvent mettre jusqu'à 1 h à apparaître |
| **Instagram** | App Meta en **mode Développement** | Les comptes ayant **un rôle sur l'app** (admin, développeur, testeur). Un testeur Instagram doit **accepter l'invitation** dans son app Instagram | Variable selon le produit : prévoir le sous-domaine HTTPS | Profil, médias, **insights** (portée, vues, démographie) des comptes **professionnels** ayant un rôle | Le compte doit être **professionnel** (créateur ou entreprise). Pas d'App Review ni de vérification d'entreprise en mode dev |
| **Facebook (Pages)** | Même app Meta, mode Développement | Comptes ayant un rôle sur l'app, pour les **Pages qu'ils gèrent** | ✅ `http://localhost` autorisé pour Facebook Login **en mode dev uniquement** | Pages et leurs insights | Les profils personnels restent non accessibles, même en test |
| **Snapchat** | Client ID de **staging** + « Demo users » | Les comptes Snapchat ajoutés comme utilisateurs de démo | À vérifier | **Identité seulement** (nom d'affichage, Bitmoji) : **aucune statistique** | Inutile pour les stats : Snapchat reste un réseau **déclaré** dans Linkaro |

Sources : [TikTok — Add a sandbox](https://developers.tiktok.com/doc/add-a-sandbox), [TikTok — Login Kit for Web](https://developers.tiktok.com/docs/en/login-kit-web), [Meta — App modes](https://developers.facebook.com/docs/development/build-and-test/app-modes), [Google — OAuth 2.0 pour applications web](https://developers.google.com/identity/protocols/oauth2/web-server), [Snap Kit — Developing your app](https://developers.snap.com/snap-kit/developer-portal/developing-your-app).

**À retenir :**
- En mode test, **on ne peut connecter que ses propres comptes ou ceux de personnes ajoutées explicitement** (testeurs, comptes cibles). C'est exactement ce qu'il faut pour valider le fonctionnement.
- **Ouvrir aux vrais créateurs** demandera ensuite les validations : App Review Meta et vérification d'entreprise, revue TikTok, vérification Google.

---

## 2. Le sous-domaine de test : la bonne approche

TikTok (et, en pratique, Instagram) exigent des **URI de redirection en HTTPS**. Votre idée d'utiliser **un sous-domaine de votre domaine actuel** (par exemple `linkaro-dev.votre-domaine.com`) est la bonne. Deux façons de le relier à votre machine :

| Option | Principe | Avantages | Inconvénients |
|---|---|---|---|
| **Cloudflare Tunnel** (recommandé) | Un petit programme (`cloudflared`) sur votre PC ouvre un tunnel sécurisé. Le sous-domaine pointe vers `http://localhost:3000` | Gratuit, HTTPS automatique, **adresse fixe** (à déclarer une seule fois dans chaque console), aucun port à ouvrir | Le domaine doit utiliser les DNS de Cloudflare (gratuit) |
| **ngrok** | Même principe | Très simple à démarrer | Adresse aléatoire en gratuit : il faut la redéclarer à chaque fois. Domaine personnalisé payant |
| **Déployer sur le VPS** | L'app tourne sur le VPS, derrière le sous-domaine | Proche de la production | Moins pratique pour développer au quotidien |

**Il n'est pas possible de déclarer une adresse IP locale** (`192.168.x.x`) : Google interdit les IP brutes, et TikTok comme Meta exigent un domaine en HTTPS pour le web.

---

## 3. Services tiers et comptes de test
- **Il n'existe pas de « comptes de test » fournis** par TikTok, Instagram ou YouTube avec des statistiques réalistes. Meta permettait de créer des « utilisateurs test » Facebook, mais ils n'ont ni vraie audience ni vraies stats. **Le plus fiable est d'utiliser vos propres comptes** et ceux de quelques créateurs volontaires ajoutés comme testeurs (10 sur TikTok).
- **Phyllo / InsightIQ** (agrégateur de données de créateurs) propose un **environnement sandbox** avec des données fictives, accessible après inscription. Le contenu exact de ce sandbox n'a pas pu être vérifié. C'est utile pour voir à quoi ressemblent les données, mais **pas nécessaire** : c'est payant en production et on dépend d'un tiers.
- **Notre propre « fournisseur simulé » (mock)** : le paquet `integrations` aura, à côté de TikTok, Instagram et YouTube, un fournisseur **`mock`** qui produit des profils et des publications réalistes (abonnés, vues, likes, commentaires, partages). Il sera **activé en développement** sans aucune clé. Avantages :
  - toute l'équipe peut développer sans compte développeur ;
  - les tests automatiques (CI) ne dépendent d'aucun service extérieur ;
  - on peut simuler des cas difficiles : token expiré, compte privé, engagement anormal pour tester les alertes de l'Indice Linkaro.

---

## 4. Plan concret pour tester la fonctionnalité 1

| Étape | Action | Qui |
|---|---|---|
| 1 | Développer avec le fournisseur **mock** (aucune clé requise) | Équipe |
| 2 | Créer le sous-domaine de test et le **Cloudflare Tunnel** vers `localhost:3000` | Porteur de projet (je fournis les commandes) |
| 3 | **Google Cloud** : créer le projet, activer YouTube Data API v3 et YouTube Analytics API, mettre l'écran de consentement en *Testing*, ajouter vos adresses Gmail comme utilisateurs test, déclarer `http://localhost:3000/...` et `https://<sous-domaine>/...` comme URI de redirection | Porteur de projet |
| 4 | **TikTok for Developers** : créer l'app, passer en **Sandbox**, ajouter Login Kit + Display API, ajouter vos comptes TikTok comme *target users*, déclarer l'URI `https://<sous-domaine>/...` | Porteur de projet |
| 5 | **Meta for Developers** : créer l'app (type *Business*), ajouter « Instagram API with Instagram Login » (et Facebook Login pour les Pages), ajouter vos comptes comme testeurs, **accepter l'invitation dans l'app Instagram**, passer vos comptes Instagram en **professionnel** | Porteur de projet |
| 6 | Renseigner les identifiants (client ID et secret) dans le `.env` local, tester la connexion réelle de vos comptes | Équipe |

Les étapes 3 à 5 ne demandent **ni société ni nom de domaine définitif**. Elles peuvent se faire dès maintenant, en parallèle du développement.
