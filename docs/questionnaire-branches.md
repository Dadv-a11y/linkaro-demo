# Questionnaire de cadrage v2 — carte des branchements

Fichier : [`Linkaro _ questionnaire de cadrage.html`](../Linkaro%20_%20questionnaire%20de%20cadrage.html)

## Principes
- **Bilingue FR / EN** : bouton en haut à droite. La langue du navigateur est utilisée par défaut. Les réponses sont stockées par **code**, donc changer de langue en cours de route ne perd rien.
- **Une réponse ne compte que si sa question est visible.** Si on revient en arrière et qu'on change une réponse « parente » (par exemple *Avez-vous déjà collaboré ?* passe de *Oui* à *Non*), toutes les réponses qui en dépendaient sont **ignorées automatiquement**, à l'écran comme dans l'envoi.
- **Les sections sans question visible sont sautées.** La progression (« Section x sur y ») se recalcule selon le parcours.
- **Questions « la plus importante »** : leurs options sont **les réponses choisies juste avant**. Il n'y a donc pas de liste répétée. Si une seule option a été choisie, la question n'est pas posée et la réponse est **déduite** (`"deduit": true` dans l'envoi).
- Les options exclusives (« Aucun », « Tout cela »…) décochent les autres. Les limites « jusqu'à N réponses » désactivent les options en trop.
- Les anciennes questions en double ont été fusionnées :
  - « Comment gérez-vous vos collaborations ? » et « Où se passent les échanges ? » sont devenues **d5**.
  - « Difficultés » (avec collab) et « Hésitations » (sans collab) sont séparées par profil : **c8** et **b1**.

## Arbre des conditions

| Section | Question | Affichée si |
|---|---|---|
| 1. Vous | p1 âge, p2 pays, a1 plateformes, a3 abonnés, a4 activité, a5 thèmes (max 3), a6 revenus, a7 audience | toujours |
| | **a2** plateforme principale (options = a1) | a1 a **≥ 2** réponses (sinon déduite) |
| 2. Collaborations | c1 a déjà collaboré ? | toujours |
| | c2 nombre / 12 mois, c3 origine, c4 contrepartie, c6 qui gère, c8 difficultés (max 3) | c1 = *Oui* (plusieurs fois ou 1-2 fois) |
| | c5 moyens de paiement | c1 = Oui **et** c4 contient *argent* |
| | c7 commission du manager | c6 = *manager* ou *agence* |
| | c9 ce qui bloque | c1 = *Non* |
| 3. Accords et paiements | d1 contrat, d5 canaux d'échange, d6 bilan après publication | c1 = Oui |
| | d2 acompte, d3 problèmes de paiement | c1 = Oui **et** payé en argent |
| | d4 fréquence des problèmes | d3 contient un problème (pas « Aucun ») |
| | *Section entière* | sautée si c1 = Non |
| 4. Comptes et stats | s1 type de compte Instagram | a1 contient Instagram |
| | s2 Facebook profil ou Page | a1 contient Facebook |
| | s3 type de compte TikTok | a1 contient TikTok |
| | s4 consulte ses stats, s5 connaît son taux d'engagement, s7 accepte de connecter ses comptes | toujours |
| | s6 ce que demandent les marques | c1 = Oui |
| | s8 pourquoi refuser la connexion | s7 = *Non* |
| 5. Tarifs | t1 réaction à « envoyez vos tarifs », t3 facteurs de prix (max 4) | toujours |
| | t2 prix habituel d'une vidéo (FCFA) | payé en argent **et** t1 ∈ {grille, au cas par cas, demande le budget} |
| | t4 tarifs justes ? | payé en argent |
| 6. Problème principal | b1 hésitations face à une offre (max 3) | c1 = Non |
| | b2 tâche chronophage, b3 problème principal (libre) | toujours |
| 7. Linkaro | f1 fonctions utiles (max 4) | toujours |
| | **f2** la plus importante (options = f1) | f1 a ≥ 2 réponses (sinon déduite) |
| 8. Échanges | e1 expérience préférée | toujours |
| | e2 canal de l'assistant | e1 ∈ {aide pendant l'échange, transfert, au choix} |
| | e3 réaction au message type | e1 ≠ *échanges séparés* |
| 9. Documents | g1 documents | toujours |
| | g2 niveau d'aide | g1 ≠ *Aucun* |
| 10. Opportunités | o1, o2 (max 4) | toujours |
| 11. Rôle | r1 rôle, r2 négociation en son nom, r4 modèle de paiement | toujours |
| | r3 situations de représentation | r2 ∈ {oui, avec approbation, certaines} |
| | r5 montant d'abonnement (FCFA) | r4 = abonnement |
| | r6 commission acceptable | r4 = commission |
| 12. Vision | v1–v4 libres, v5 recontact | toujours |
| | v6 WhatsApp / e-mail | v5 = Oui |

## Nouvelles questions issues de la recherche
- **Profil et légal** : âge (p1, majorité à 21 ans au Cameroun), pays (p2), localisation de l'audience (a7).
- **Paiements** : moyens (c5), acompte (d2), problèmes (d3) et leur fréquence (d4), contrat (d1).
- **Intermédiaires** : manager ou agence (c6) et commission (c7).
- **Faisabilité technique** : type de compte Instagram, Facebook, TikTok (s1–s3), accord pour connecter les comptes (s7, s8).
- **Engagement** : connaissance du taux d'engagement (s5), ce que demandent les marques (s6), facteurs de prix (t3). Voir [04-score-engagement.md](recherche/04-score-engagement.md).
- **Modèle économique** : modèle de paiement (r4), montant (r5), commission (r6).

## Format de l'envoi (JSON)

```json
{
  "version": 2,
  "langue": "fr",
  "envoye_le": "2026-10-13T12:00:00.000Z",
  "empreinte_ip_ua_sha256": "…",
  "reponses": {
    "c4": { "question": "Qu'avez-vous reçu en échange ?", "code": ["argent", "produits"], "reponse": ["Un paiement en argent", "Des produits ou services offerts"] },
    "a2": { "question": "Laquelle est votre plateforme principale ?", "code": "tiktok", "reponse": "TikTok", "deduit": true },
    "p2": { "question": "Dans quel pays vivez-vous ?", "code": "autre", "reponse": "Autre", "autre": "Bénin" }
  }
}
```

Les libellés sont toujours envoyés **en français**, même si le répondant a choisi l'anglais, pour une analyse homogène. `langue` indique la langue utilisée. Les brouillons locaux utilisent de nouvelles clés (`lk2_…`) : les anciens brouillons de la v1 ne se mélangent pas à la v2.
