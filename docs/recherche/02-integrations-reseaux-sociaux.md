# 02 — Faisabilité technique : inscription des créateurs et connexion des réseaux

> **Objectif :** préparer la **feature 1** (inscription et connexion des réseaux sociaux) en sachant ce qu'on peut **réellement** récupérer sur chaque plateforme.
> **Statut :** recherche faite en octobre 2026 sur la documentation officielle quand elle était accessible. Les API changent souvent : **il faudra revérifier chaque point au moment de coder.**

---

## 1. Les 4 niveaux d'intégration (rappel du cadrage, précisé)

| Niveau | Ce que fait le créateur | Ce que Linkaro obtient | Badge affiché |
|---|---|---|---|
| **N0 — Lien déclaré** | Colle l'URL ou le @ de son profil | Le lien, plus les chiffres qu'il saisit lui-même | `Déclaré` |
| **N1 — Données publiques** | Rien de plus | Nom, photo, nombre d'abonnés public… via API publique (YouTube) ou lecture de page | `Public` |
| **N2 — Compte connecté (OAuth)** | Clique « Connecter » et autorise | Statistiques du compte, parfois démographie de l'audience | `Vérifié ✓` |
| **N3 — Actions** | Autorise la publication ou la messagerie | Publier, lire les DM… | Hors MVP |

> ⚠️ **Lire une page publique sans API officielle (scraping)** est contraire aux conditions d'utilisation d'Instagram, TikTok et Facebook, et c'est fragile. On l'**évite**. Pour le N1, on n'utilise que les API officielles publiques (YouTube Data API).

---

## 2. Ce que chaque plateforme permet (N2 — OAuth)

### 2.1 Instagram

| Point | Détail |
|---|---|
| API | **Instagram API with Instagram Login** ([doc](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login)) |
| Comptes supportés | **Uniquement les comptes professionnels (Créateur ou Entreprise)**. Les comptes **personnels ne sont plus supportés** : l'ancienne Basic Display API a été arrêtée fin 2024 |
| Page Facebook requise ? | **Non**, avec Instagram Login |
| Permissions | `instagram_business_basic` (profil, médias), `instagram_business_manage_insights` (statistiques) |
| Statistiques disponibles | Portée, vues, visites du profil, interactions, métriques par média (likes, commentaires, vues), **démographie des abonnés** (top pays/villes, âge, genre) ([insights](https://developers.facebook.com/docs/instagram-platform/insights), [blog Meta mars 2025](https://developers.facebook.com/blog/post/2025/03/24/user-and-media-insights-on-instagram-api-with-instagram-login/)) |
| Limites | Certaines métriques sont indisponibles **sous 100 abonnés**. Historique de **90 jours** pour les métriques de compte |
| Accès | « Standard Access » : seulement les comptes ajoutés comme testeurs. **« Advanced Access » nécessite App Review** (2 à 4 semaines selon des retours tiers) **et la vérification d'entreprise Meta** |

👉 Le créateur doit **passer son compte en mode professionnel** (gratuit, 1 minute dans l'app). Il faut un **tutoriel intégré** à l'onboarding.

### 2.2 TikTok

| Point | Détail |
|---|---|
| API | **Login Kit + Display API** ([scopes](https://developers.tiktok.com/doc/tiktok-api-scopes)) |
| Permissions | `user.info.basic` (nom, avatar), `user.info.profile` (bio, lien, badge vérifié), `user.info.stats` (**abonnés, abonnements, likes, nombre de vidéos**), `video.list` (vidéos publiques, avec vues, likes, commentaires et partages par vidéo) |
| Démographie de l'audience | **Non disponible** via Display API. Elle existe côté TikTok Business / TikTok One, inaccessible ici |
| Comptes | Comptes personnels **et** professionnels |
| Accès | Revue de l'application obligatoire avant la production. Le créateur peut **refuser certaines permissions** : il faut gérer un token sans `user.info.stats` |
| Calcul possible | **Taux d'engagement moyen** sur les N dernières vidéos = (likes + commentaires + partages) / vues |

### 2.3 YouTube

| Point | Détail |
|---|---|
| N1 sans connexion | **YouTube Data API v3** avec une clé API : abonnés (arrondis), vues totales, nombre de vidéos, stats publiques par vidéo. Quota par défaut d'environ 10 000 unités/jour |
| N2 avec OAuth | **YouTube Analytics API**, scope `yt-analytics.readonly` (+ `youtube.readonly`) : vues, durée de visionnage, abonnés gagnés et perdus, **âge, genre, pays des spectateurs** ([doc](https://developers.google.com/youtube/analytics/channel_reports)) |
| Accès | Écran de consentement Google. Les scopes YouTube sont « sensibles » : **vérification de l'app par Google** nécessaire au-delà de la phase de test (une app non vérifiée est limitée à 100 utilisateurs) |
| Avantage | **C'est la plateforme la plus simple et la plus riche** : très bon candidat pour le premier connecteur |

### 2.4 Facebook

| Point | Détail |
|---|---|
| API | Graph API, **Pages** uniquement : `pages_show_list`, `pages_read_engagement`, `read_insights` |
| Profils personnels / mode professionnel | **Aucune API d'insights** trouvée pour les profils, même en mode professionnel. L'endpoint Insights est documenté **pour les Pages seulement** ([doc](https://developers.facebook.com/docs/graph-api/reference/insights)) |
| Limites | Page Insights à partir de **100 mentions J'aime**. Plusieurs métriques de Page sont dépréciées en juin 2026. **Vérification d'entreprise et App Review** obligatoires |
| ⚠️ Risque Cameroun | Facebook est le réseau n°1 au Cameroun, mais **beaucoup de créateurs utilisent un profil, pas une Page**. Pour eux, on reste au niveau `Déclaré` + **capture d'écran des statistiques**. Une vérification manuelle ou par OCR pourra venir plus tard |

### 2.5 Autres réseaux
- **Snapchat, X, LinkedIn, Twitch** : à traiter plus tard en `Déclaré` (lien et chiffres saisis).
- **Agrégateurs tiers** (Phyllo, InsightIQ…) : une seule API pour 20+ plateformes, avec données autorisées par le créateur. On gagne du temps de développement, mais c'est **payant**, on dépend d'un tiers et la couverture africaine n'est pas confirmée. **À garder en plan B** si les App Reviews bloquent.

### 2.6 Synthèse

| | Sans compte pro | Abonnés | Engagement | Démographie | Difficulté d'accès |
|---|---|---|---|---|---|
| YouTube | ✅ | ✅ (N1 public) | ✅ | ✅ (OAuth) | 🟢 Faible |
| TikTok | ✅ | ✅ | ✅ (calculé) | ❌ | 🟡 Moyenne (revue de l'app) |
| Instagram | ❌ **compte pro requis** | ✅ | ✅ | ✅ (≥ 100 abonnés) | 🟠 Élevée (App Review + vérif. entreprise) |
| Facebook Page | — | ✅ | ✅ | partielle | 🟠 Élevée |
| Facebook profil | — | ❌ | ❌ | ❌ | 🔴 Impossible : déclaratif seulement |

---

## 3. Messageries (pour plus tard, mais qui conditionne l'architecture)

| Canal | Ce qui est possible | Ce qui est **impossible** |
|---|---|---|
| **WhatsApp** | Un **numéro Linkaro** sur la WhatsApp Business Platform (Cloud API). Le créateur **transfère** un message de marque au bot Linkaro, qui l'analyse et répond. Réponse gratuite ou peu chère dans la fenêtre de 24 h après le message de l'utilisateur ([tarifs Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)) | **Lire les conversations WhatsApp personnelles du créateur.** Il n'existe aucune API pour ça |
| | ⚠️ Meta restreint les **assistants IA « généralistes »** sur l'API WhatsApp Business depuis 2026. Un assistant **dédié au service Linkaro** devrait être acceptable, mais **c'est à vérifier dans la politique en vigueur** | |
| **Telegram** | Bot API **gratuite**, simple : le créateur transfère un message au bot | Lire ses conversations privées |
| **Messenger / DM Instagram** | Seulement pour une **Page** ou un compte pro qui a autorisé Linkaro (`instagram_business_manage_messages`). App Review obligatoire | DM des profils personnels |

👉 Cela confirme l'**option C/hybride** du cadrage : un **bot de transfert** (Telegram d'abord, puis WhatsApp), plus un copier-coller dans l'app. La « centralisation de tous les messages » n'est pas faisable techniquement.

---

## 4. Proposition pour la feature 1 : inscription et connexion des réseaux

### 4.1 Principes issus de la recherche
- **Mobile d'abord, connexion lente** : la plupart des créateurs utilisent Android avec des données mobiles. Pages légères, pas de gros chargements.
- **Bilingue FR/EN** : le Cameroun a deux langues officielles et le marché régional est mixte (Nigeria, Ghana).
- **Peu de saisie** : on demande le strict minimum, puis le profil se complète progressivement.
- **Transparence des données** : chaque chiffre a une **source** (`déclaré`, `public` ou `vérifié`) et une **date**.
- **Âge** : il faut demander la date de naissance. **Au Cameroun, la majorité est à 21 ans (à confirmer).** Un créateur mineur ne pourra pas signer d'accord ni recevoir de paiement sans représentant légal. Pour le MVP : **réserver l'inscription aux 18 ans et plus** et prévoir un statut « représentant légal » plus tard.

### 4.2 Parcours d'inscription proposé

```
1. Créer un compte
   ├─ Téléphone + code OTP (SMS ou WhatsApp)  ← le plus naturel en Afrique
   ├─ ou Google (OAuth)                        ← utile aussi pour YouTube
   └─ ou e-mail + mot de passe
2. Trois questions seulement
   ├─ Nom de créateur / pseudo (→ URL du profil public)
   ├─ Pays / ville
   └─ Date de naissance (contrôle ≥ 18 ans)
3. « Où publies-tu ? » : choix des réseaux (TikTok, Instagram, Facebook, YouTube, Snapchat, autre)
   Pour chaque réseau :
   ├─ [Connecter]          → OAuth → badge « Vérifié ✓ »
   └─ [Juste ajouter le lien] → badge « Déclaré » (+ saisie facultative des abonnés)
   └─ Instagram : mini-tuto « Passer en compte professionnel » si besoin
4. Profil généré automatiquement (photo, bio, abonnés, engagement) → aperçu du media kit
5. Plus tard, au fil de l'usage : catégories de contenu, prestations proposées, e-mail pro, tarifs
```

### 4.3 Modèle de données minimal (proposition)

```
Creator
  id, display_name, handle (unique, URL), phone, email?, country, city,
  birth_date, locale (fr|en), created_at

SocialAccount
  id, creator_id, platform (tiktok|instagram|facebook|youtube|snapchat|other),
  handle, profile_url,
  connection_level (declared|public|connected),
  external_id?, access_token_enc?, refresh_token_enc?, token_expires_at?, scopes_granted[],
  last_synced_at?, sync_status (ok|expired|revoked|error)

MetricSnapshot                        ← historique, jamais écrasé
  id, social_account_id, captured_at,
  source (declared|public_api|oauth),
  followers, avg_views?, engagement_rate?, posts_count?,
  audience_json? (pays, âges, genre — si disponible)
```

### 4.4 Ordre de développement recommandé

| Étape | Contenu | Dépendances externes |
|---|---|---|
| **1a** | Compte (téléphone/OTP, Google, e-mail), profil minimal, **ajout de liens déclarés** pour tous les réseaux, page profil publique | Fournisseur SMS/OTP |
| **1b** | **YouTube** : stats publiques (clé API), puis OAuth | Projet Google Cloud |
| **1c** | **TikTok** Login Kit (`user.info.*`, `video.list`) | Revue de l'app TikTok |
| **1d** | **Instagram** professionnel (Instagram Login + insights) | App Review Meta + **vérification d'entreprise** |
| **1e** | Facebook Pages | Idem Meta |
| plus tard | Rafraîchissement périodique des stats, captures d'écran pour les profils Facebook | — |

### 4.5 Prérequis administratifs à lancer **dès maintenant** (ils prennent du temps)
1. **Entité légale** pour Linkaro : la vérification d'entreprise Meta la demande (documents officiels).
2. **Nom de domaine et site** avec **politique de confidentialité**, **conditions d'utilisation** et **URL/procédure de suppression des données**. Ils sont exigés par Meta, TikTok et Google.
3. Création des **apps développeur** : Meta for Developers, TikTok for Developers, Google Cloud.
4. Vidéos de démonstration (screencasts) du flux de connexion pour les App Reviews.
5. Vérification de la **loi camerounaise sur les données personnelles** : consentement, hébergement, éventuelle déclaration.

---

## 5. Points à vérifier au moment de coder
- [ ] Liste exacte des métriques Instagram « insights » encore actives (dépréciations fréquentes).
- [ ] Délai et conditions réelles de la revue d'app TikTok pour `user.info.stats`.
- [ ] Scopes YouTube nécessaires (des sources se contredisent sur `youtube.readonly` en plus de `yt-analytics.readonly`).
- [ ] Politique WhatsApp Business sur les assistants IA (pour le bot).
- [ ] Éligibilité de l'entité Linkaro à la vérification d'entreprise Meta depuis le Cameroun.
