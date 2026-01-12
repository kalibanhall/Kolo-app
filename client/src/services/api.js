// Service API centralisé pour KOLO
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Gestion du token JWT
export const getToken = () => localStorage.getItem('kolo_token');
export const setToken = (token) => localStorage.setItem('kolo_token', token);
export const removeToken = () => localStorage.removeItem('kolo_token');

// Headers avec JWT
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Helper pour les requêtes
const request = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: getHeaders(options.includeAuth !== false),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Une erreur est survenue');
    }

    return data;
  } catch (error) {
    // Ne pas logger les erreurs 401 "No token provided" - c'est normal au démarrage
    if (error.message !== 'No token provided') {
      console.error('API Error:', error);
    }
    throw error;
  }
};

// ======================
// 🔐 AUTHENTIFICATION
// ======================

export const authAPI = {
  // Inscription
  register: async (userData) => {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false,
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  // Connexion
  login: async (email, password) => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      includeAuth: false,
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },

  // Vérifier le token
  verify: async () => {
    return await request('/auth/verify');
  },

  // Déconnexion
  logout: () => {
    removeToken();
  },

  // Authentification Google
  googleAuth: async (googleData) => {
    const response = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
      includeAuth: false,
    });
    
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  },
};

// ======================
// 🎯 CAMPAGNES
// ======================

export const campaignsAPI = {
  // Obtenir la campagne active (première)
  getCurrent: async () => {
    return await request('/campaigns/current', { includeAuth: false });
  },

  // Obtenir toutes les campagnes actives (pour slider)
  getActive: async () => {
    return await request('/campaigns/active', { includeAuth: false });
  },

  // Obtenir une campagne par ID
  getById: async (campaignId) => {
    return await request(`/campaigns/${campaignId}`, { includeAuth: false });
  },

  // Obtenir toutes les campagnes (Admin)
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/campaigns${queryString ? `?${queryString}` : ''}`);
  },

  // Créer une campagne (Admin)
  create: async (campaignData) => {
    return await request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  },

  // Mettre à jour une campagne (Admin)
  update: async (campaignId, campaignData) => {
    return await request(`/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(campaignData),
    });
  },

  // Supprimer une campagne (Admin)
  delete: async (campaignId) => {
    return await request(`/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  },

  // Mettre à jour le statut (Admin)
  updateStatus: async (campaignId, status) => {
    return await request(`/campaigns/${campaignId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Obtenir les numéros disponibles pour une campagne
  getAvailableNumbers: async (campaignId) => {
    return await request(`/campaigns/${campaignId}/available-numbers`, { includeAuth: false });
  },
};

// ======================
// 🎫 TICKETS
// ======================

export const ticketsAPI = {
  // Initier un achat et obtenir l'URL de paiement de l'agrégateur
  initiatePurchase: async (purchaseData) => {
    return await request('/tickets/initiate-purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  // Acheter des tickets (ancienne méthode, fallback)
  purchase: async (purchaseData) => {
    return await request('/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  // Obtenir les tickets d'un utilisateur
  getUserTickets: async (userId) => {
    return await request(`/tickets/user/${userId}`);
  },

  // Obtenir tous les tickets (Admin)
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/tickets${queryString ? `?${queryString}` : ''}`);
  },

  // Valider un numéro de ticket
  validate: async (ticketNumber) => {
    return await request(`/tickets/validate/${ticketNumber}`, {
      includeAuth: false,
    });
  },
};

// ======================
// 💳 PAIEMENTS
// ======================

export const paymentsAPI = {
  // Obtenir le statut d'un paiement
  getStatus: async (purchaseId) => {
    return await request(`/payments/status/${purchaseId}`);
  },

  // Historique des paiements d'un utilisateur
  getUserPayments: async (userId) => {
    return await request(`/payments/user/${userId}`);
  },

  // Simuler un paiement (pour test)
  simulate: async (purchaseId) => {
    return await request(`/payments/simulate/${purchaseId}`, {
      method: 'POST',
    });
  },

  // Obtenir les factures de l'utilisateur
  getInvoices: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/payments/invoices${queryString ? `?${queryString}` : ''}`);
  },

  // Obtenir une facture spécifique
  getInvoice: async (invoiceId) => {
    return await request(`/payments/invoices/${invoiceId}`);
  },

  // ========================================
  // 💰 PayDRC (MOKO Afrika) - Mobile Money
  // ========================================

  // Initier un paiement PayDRC pour achat de tickets
  initiatePayDRC: async (purchaseData) => {
    return await request('/payments/paydrc/initiate', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  // Vérifier le statut d'un paiement PayDRC
  checkPayDRCStatus: async (reference) => {
    return await request(`/payments/paydrc/status/${reference}`);
  },
};

// ======================
// 💰 WALLET (PORTEFEUILLE)
// ======================

export const walletAPI = {
  // Obtenir le portefeuille de l'utilisateur
  getWallet: async () => {
    return await request('/wallet/me');
  },

  // Obtenir l'historique des transactions
  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/wallet/transactions${queryString ? `?${queryString}` : ''}`);
  },

  // Initier un dépôt via PayDRC (MOKO Afrika)
  initiateDeposit: async (depositData) => {
    return await request('/wallet/deposit/paydrc', {
      method: 'POST',
      body: JSON.stringify(depositData),
    });
  },

  // Ancienne méthode de dépôt (placeholder)
  initiateDepositLegacy: async (amount) => {
    return await request('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  // Vérifier le statut d'un dépôt PayDRC
  checkDepositStatus: async (reference) => {
    return await request(`/wallet/deposit/status/${reference}`);
  },

  // Acheter avec le solde du portefeuille
  purchase: async (purchaseData) => {
    return await request('/wallet/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  // Simuler un dépôt (dev uniquement)
  simulateDeposit: async (reference) => {
    return await request('/wallet/simulate-deposit', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
  },
};

// ======================
// �👨‍💼 ADMIN
// ======================

export const adminAPI = {
  // Obtenir les statistiques du dashboard
  getStats: async () => {
    return await request('/admin/stats');
  },

  // Obtenir la liste des participants
  getParticipants: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/admin/participants${queryString ? `?${queryString}` : ''}`);
  },

  // Obtenir toutes les campagnes
  getCampaigns: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/campaigns${queryString ? `?${queryString}` : ''}`);
  },

  // Effectuer un tirage
  performDraw: async (drawData) => {
    // drawData already has snake_case field names from frontend
    const payload = {
      campaign_id: drawData.campaign_id,
      bonus_winners_count: drawData.bonus_winners_count || 0,
      draw_method: drawData.draw_method || 'automatic'
    };

    // Add manual ticket number if manual draw
    if (drawData.draw_method === 'manual' && drawData.manual_ticket_number) {
      payload.manual_ticket_number = drawData.manual_ticket_number;
    }

    return await request('/admin/draw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Obtenir tous les tirages
  getDraws: async () => {
    return await request('/admin/draws');
  },

  // Obtenir les logs d'audit
  getLogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/admin/logs${queryString ? `?${queryString}` : ''}`);
  },

  // Obtenir les résultats des tirages
  getDraws: async () => {
    return await request('/admin/draws');
  },

  // Obtenir les tickets d'une campagne
  getCampaignTickets: async (campaignId, params = {}) => {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 100,
      ...(params.search && { search: params.search })
    }).toString();
    return await request(`/admin/campaigns/${campaignId}/tickets?${queryString}`);
  },

  // Obtenir les analytics (vraies données)
  getAnalytics: async () => {
    return await request('/admin/analytics');
  },

  // Obtenir toutes les transactions
  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/admin/transactions${queryString ? `?${queryString}` : ''}`);
  },

  // Mettre à jour le statut d'une transaction
  updateTransaction: async (transactionId, data) => {
    return await request(`/admin/transactions/${transactionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ======================
// 🔔 NOTIFICATIONS
// ======================

export const notificationsAPI = {
  // Obtenir toutes les notifications de l'utilisateur
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await request(`/notifications${queryString ? `?${queryString}` : ''}`);
  },

  // Obtenir uniquement les non-lues
  getUnread: async () => {
    return await request('/notifications?unread=true');
  },

  // Marquer une notification comme lue
  markAsRead: async (notificationId) => {
    return await request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  // Marquer toutes comme lues
  markAllAsRead: async () => {
    return await request('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  // Supprimer une notification
  delete: async (notificationId) => {
    return await request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// 👤 UTILISATEURS
// ======================

export const usersAPI = {
  // Obtenir le profil utilisateur
  getProfile: async (userId) => {
    return await request(`/users/profile/${userId}`);
  },

  // Mettre à jour le profil utilisateur
  updateProfile: async (userId, profileData) => {
    return await request(`/users/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Sauvegarder le token FCM
  saveFcmToken: async (fcmToken) => {
    return await request('/users/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcm_token: fcmToken }),
    });
  },
};

// ======================
// 🎁 CODES PROMO
// ======================

export const promosAPI = {
  // Valider un code promo
  validate: async (code) => {
    return await request('/promos/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  // Calculer la remise
  calculate: async (code, amount) => {
    return await request('/promos/calculate', {
      method: 'POST',
      body: JSON.stringify({ code, amount }),
    });
  },

  // Admin: Liste des codes promo
  getAll: async () => {
    return await request('/promos/admin');
  },

  // Admin: Créer un code promo
  create: async (promoData) => {
    return await request('/promos/admin', {
      method: 'POST',
      body: JSON.stringify(promoData),
    });
  },

  // Admin: Mettre à jour un code promo
  update: async (id, promoData) => {
    return await request(`/promos/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(promoData),
    });
  },

  // Admin: Supprimer un code promo
  delete: async (id) => {
    return await request(`/promos/admin/${id}`, {
      method: 'DELETE',
    });
  },

  // Admin: Statistiques d'utilisation
  getUsage: async (id) => {
    return await request(`/promos/admin/${id}/usage`);
  },
};

// Export par défaut
export default {
  auth: authAPI,
  campaigns: campaignsAPI,
  tickets: ticketsAPI,
  payments: paymentsAPI,
  admin: adminAPI,
  notifications: notificationsAPI,
  users: usersAPI,
  promos: promosAPI,
};
