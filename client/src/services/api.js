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
};

// ======================
// 🎯 CAMPAGNES
// ======================

export const campaignsAPI = {
  // Obtenir la campagne active
  getCurrent: async () => {
    return await request('/campaigns/current', { includeAuth: false });
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
};

// ======================
// 🎫 TICKETS
// ======================

export const ticketsAPI = {
  // Acheter des tickets
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
};

// ======================
// 👨‍💼 ADMIN
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
    // Map frontend field names to backend expected names
    const payload = {
      campaign_id: drawData.campaignId,
      bonus_winners_count: drawData.bonusWinners,
      draw_method: drawData.drawMethod || 'automatic'
    };

    // Add manual ticket number if manual draw
    if (drawData.drawMethod === 'manual' && drawData.manualTicketNumber) {
      payload.manual_ticket_number = drawData.manualTicketNumber;
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

// Export par défaut
export default {
  auth: authAPI,
  campaigns: campaignsAPI,
  tickets: ticketsAPI,
  payments: paymentsAPI,
  admin: adminAPI,
  notifications: notificationsAPI,
};
