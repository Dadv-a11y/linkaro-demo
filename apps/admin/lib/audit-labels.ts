/** Libellés des actions du journal d'audit et des événements de sécurité. */
const LABELS: Record<string, string> = {
  "creator.suspended": "Créateur suspendu",
  "creator.reactivated": "Créateur réactivé",
  "creator.email_viewed": "Fiche consultée, e-mail affiché",
  "creator.exported": "Données exportées",
  "creator.deleted": "Compte créateur supprimé",
  "creator.signup": "Inscription d'un créateur",
  "creator.onboarded": "Inscription créateur terminée",
  "creator.deleted_underage": "Compte supprimé (moins de 18 ans)",
  "auth.login": "Connexion d'un créateur",
  "auth.logout": "Déconnexion d'un créateur",
  "social.connect": "Réseau connecté",
  "social.disconnect": "Réseau déconnecté",
  "staff.invite": "Invitation envoyée",
  "staff.invitation_accepted": "Invitation acceptée",
  "staff.invitation_revoked": "Invitation révoquée",
  "staff.login": "Connexion d'un membre de l'équipe",
  "staff.logout": "Déconnexion d'un membre de l'équipe",
  "staff.second_factor_verified": "Double authentification validée",
  "staff.role_changed": "Rôle modifié",
  "staff.disabled": "Membre désactivé",
  "staff.magic_link_unknown":
    "Lien de connexion demandé pour une adresse inconnue",
  "staff.second_factor_failed": "Code de double authentification erroné",
  "staff.second_factor_bypass_attempt":
    "Tentative de contournement de la double authentification",
  "staff.access_denied": "Accès refusé à une page réservée",
  "auth.error": "Erreur d'authentification",
}

export function actionLabel(action: string): string {
  return LABELS[action] ?? action
}
