/**
 * Traductions des statuts et labels de la plateforme KOLO
 * Ce fichier centralise toutes les traductions anglais -> français
 * pour un affichage cohérent en français sans modifier la structure backend
 */

// Statuts des tickets
export const ticketStatusLabels = {
  'active': 'Actif',
  'won': 'Gagnant',
  'winner': 'Gagnant',
  'lost': 'Perdu',
  'expired': 'Expiré',
  'pending': 'En attente',
  'cancelled': 'Annulé',
  'used': 'Utilisé',
  'refunded': 'Remboursé'
};

// Statuts des paiements
export const paymentStatusLabels = {
  'pending': 'En attente',
  'completed': 'Effectué',
  'failed': 'Échoué',
  'cancelled': 'Annulé',
  'refunded': 'Remboursé',
  'processing': 'En cours',
  'success': 'Réussi',
  'error': 'Erreur'
};

// Statuts des campagnes
export const campaignStatusLabels = {
  'draft': 'Brouillon',
  'open': 'Ouvert',
  'closed': 'Fermé',
  'completed': 'Terminé',
  'cancelled': 'Annulé',
  'drawn': 'Tiré',
  'pending': 'En attente'
};

// Statuts de livraison
export const deliveryStatusLabels = {
  'pending': 'En attente',
  'contacted': 'Contacté',
  'shipped': 'Expédié',
  'delivered': 'Livré',
  'claimed': 'Réclamé',
  'processing': 'En cours'
};

// Types de transactions
export const transactionTypeLabels = {
  'deposit': 'Rechargement',
  'purchase': 'Achat',
  'refund': 'Remboursement',
  'bonus': 'Bonus',
  'withdrawal': 'Retrait',
  'transfer': 'Transfert'
};

// Catégories de prix
export const prizeCategoryLabels = {
  'main': 'Principal',
  'bonus': 'Bonus',
  'secondary': 'Secondaire',
  'consolation': 'Consolation'
};

// Modes de sélection
export const selectionModeLabels = {
  'automatic': 'Automatique',
  'manual': 'Manuel'
};

// Méthodes de paiement
export const paymentMethodLabels = {
  'wallet': 'Portefeuille KOLO',
  'mobile_money': 'Mobile Money',
  'mpesa': 'M-Pesa',
  'orange_money': 'Orange Money',
  'airtel_money': 'Airtel Money',
  'card': 'Carte bancaire',
  'PayDRC-Vodacom M-Pesa': 'Vodacom M-Pesa',
  'PayDRC-Orange Money': 'Orange Money',
  'PayDRC-Airtel Money': 'Airtel Money'
};

// Rôles utilisateur
export const userRoleLabels = {
  'admin': 'Administrateur',
  'user': 'Utilisateur',
  'moderator': 'Modérateur'
};

/**
 * Fonction utilitaire pour traduire un statut
 * @param {string} status - Le statut en anglais
 * @param {string} type - Le type de statut ('ticket', 'payment', 'campaign', 'delivery', 'transaction')
 * @returns {string} - Le statut traduit en français
 */
export const translateStatus = (status, type = 'ticket') => {
  if (!status) return 'N/A';
  
  const normalizedStatus = status.toLowerCase().trim();
  
  switch (type) {
    case 'ticket':
      return ticketStatusLabels[normalizedStatus] || status;
    case 'payment':
      return paymentStatusLabels[normalizedStatus] || status;
    case 'campaign':
      return campaignStatusLabels[normalizedStatus] || status;
    case 'delivery':
      return deliveryStatusLabels[normalizedStatus] || status;
    case 'transaction':
      return transactionTypeLabels[normalizedStatus] || status;
    case 'prize':
      return prizeCategoryLabels[normalizedStatus] || status;
    default:
      // Chercher dans tous les dictionnaires
      return ticketStatusLabels[normalizedStatus] ||
             paymentStatusLabels[normalizedStatus] ||
             campaignStatusLabels[normalizedStatus] ||
             deliveryStatusLabels[normalizedStatus] ||
             transactionTypeLabels[normalizedStatus] ||
             status;
  }
};

/**
 * Fonction pour obtenir la classe CSS de badge selon le statut
 * @param {string} status - Le statut
 * @param {boolean} isDark - Mode sombre activé
 * @returns {object} - Classes CSS pour le badge
 */
export const getStatusBadgeClasses = (status, isDark = false) => {
  const normalizedStatus = (status || '').toLowerCase();
  
  const statusColors = {
    // Succès/Positif
    'active': { bg: isDark ? 'bg-green-900/30' : 'bg-green-100', text: isDark ? 'text-green-400' : 'text-green-700' },
    'won': { bg: isDark ? 'bg-amber-900/30' : 'bg-amber-100', text: isDark ? 'text-amber-400' : 'text-amber-700' },
    'winner': { bg: isDark ? 'bg-amber-900/30' : 'bg-amber-100', text: isDark ? 'text-amber-400' : 'text-amber-700' },
    'completed': { bg: isDark ? 'bg-green-900/30' : 'bg-green-100', text: isDark ? 'text-green-400' : 'text-green-700' },
    'delivered': { bg: isDark ? 'bg-green-900/30' : 'bg-green-100', text: isDark ? 'text-green-400' : 'text-green-700' },
    'claimed': { bg: isDark ? 'bg-purple-900/30' : 'bg-purple-100', text: isDark ? 'text-purple-400' : 'text-purple-700' },
    'open': { bg: isDark ? 'bg-green-900/30' : 'bg-green-100', text: isDark ? 'text-green-400' : 'text-green-700' },
    
    // En cours/Attente
    'pending': { bg: isDark ? 'bg-yellow-900/30' : 'bg-yellow-100', text: isDark ? 'text-yellow-400' : 'text-yellow-700' },
    'processing': { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-100', text: isDark ? 'text-blue-400' : 'text-blue-700' },
    'contacted': { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-100', text: isDark ? 'text-blue-400' : 'text-blue-700' },
    'shipped': { bg: isDark ? 'bg-cyan-900/30' : 'bg-cyan-100', text: isDark ? 'text-cyan-400' : 'text-cyan-700' },
    
    // Échec/Négatif
    'failed': { bg: isDark ? 'bg-red-900/30' : 'bg-red-100', text: isDark ? 'text-red-400' : 'text-red-700' },
    'cancelled': { bg: isDark ? 'bg-gray-700' : 'bg-gray-100', text: isDark ? 'text-gray-400' : 'text-gray-600' },
    'lost': { bg: isDark ? 'bg-gray-700' : 'bg-gray-100', text: isDark ? 'text-gray-400' : 'text-gray-600' },
    'expired': { bg: isDark ? 'bg-gray-700' : 'bg-gray-100', text: isDark ? 'text-gray-400' : 'text-gray-600' },
    'closed': { bg: isDark ? 'bg-gray-700' : 'bg-gray-100', text: isDark ? 'text-gray-400' : 'text-gray-600' },
    
    // Neutre
    'draft': { bg: isDark ? 'bg-slate-700' : 'bg-slate-100', text: isDark ? 'text-slate-400' : 'text-slate-600' },
  };
  
  return statusColors[normalizedStatus] || { 
    bg: isDark ? 'bg-gray-700' : 'bg-gray-100', 
    text: isDark ? 'text-gray-400' : 'text-gray-600' 
  };
};

export default {
  ticketStatusLabels,
  paymentStatusLabels,
  campaignStatusLabels,
  deliveryStatusLabels,
  transactionTypeLabels,
  prizeCategoryLabels,
  selectionModeLabels,
  paymentMethodLabels,
  userRoleLabels,
  translateStatus,
  getStatusBadgeClasses
};
