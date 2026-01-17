import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../components/AdminLayout';

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('kolo_token');

// Helper pour les requêtes API
const apiRequest = async (endpoint, options = {}) => {
  const url = new URL(`${API_URL}${endpoint}`);
  
  // Ajouter les paramètres de query si présents
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erreur serveur');
  }
  return data;
};

// Labels pour les actions
const ACTION_CONFIG = {
  'CREATE_CAMPAIGN': { label: 'Création campagne', color: 'green', icon: '➕' },
  'UPDATE_CAMPAIGN': { label: 'Modification campagne', color: 'blue', icon: '✏️' },
  'UPDATE_CAMPAIGN_STATUS': { label: 'Changement statut', color: 'yellow', icon: '🔄' },
  'DELETE_CAMPAIGN': { label: 'Suppression campagne', color: 'red', icon: '🗑️' },
  'PERFORM_DRAW': { label: 'Tirage au sort', color: 'purple', icon: '🎲' },
  'UPDATE_TRANSACTION': { label: 'Modification transaction', color: 'blue', icon: '💳' },
  'SYNC_TRANSACTION': { label: 'Sync PayDRC', color: 'cyan', icon: '🔄' },
  'BULK_SYNC_TRANSACTIONS': { label: 'Sync globale', color: 'cyan', icon: '🔄' },
  'UPDATE_DELIVERY': { label: 'Mise à jour livraison', color: 'orange', icon: '📦' },
  'CREATE_PROMO': { label: 'Création code promo', color: 'green', icon: '🎁' },
  'UPDATE_USER': { label: 'Modification utilisateur', color: 'blue', icon: '👤' },
  'LOGIN': { label: 'Connexion admin', color: 'gray', icon: '🔐' },
  'LOGOUT': { label: 'Déconnexion admin', color: 'gray', icon: '🚪' },
};

const ENTITY_LABELS = {
  'campaign': 'Campagne',
  'user': 'Utilisateur',
  'ticket': 'Ticket',
  'purchase': 'Transaction',
  'draw': 'Tirage',
  'promo': 'Code promo',
};

const AdminLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    date_start: '',
    date_end: '',
  });
  const [expandedLog, setExpandedLog] = useState(null);

  // Charger les logs
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('/admin/logs', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          action: filters.action,
          entity_type: filters.entity_type,
          date_start: filters.date_start,
          date_end: filters.date_end,
        },
      });

      if (response.success) {
        setLogs(response.data?.logs || []);
        setPagination(prev => ({
          ...prev,
          total: response.data?.pagination?.total || 0,
          totalPages: response.data?.pagination?.totalPages || 0,
        }));
      }
    } catch (err) {
      console.error('Erreur chargement logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      action: '',
      entity_type: '',
      date_start: '',
      date_end: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Changer un filtre
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Obtenir les infos d'une action
  const getActionInfo = (action) => {
    return ACTION_CONFIG[action] || { label: action, color: 'gray', icon: '📋' };
  };

  // Classes de couleur
  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      cyan: 'bg-cyan-100 text-cyan-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return colors[color] || colors.gray;
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Formater les détails JSON de manière lisible
  const formatDetails = (details) => {
    if (!details) return null;
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return parsed;
    } catch {
      return { raw: String(details) };
    }
  };

  // Rendre les détails de manière lisible
  const renderDetailValue = (key, value) => {
    if (value === null || value === undefined) return <span className="text-gray-400">-</span>;
    if (typeof value === 'boolean') return value ? '✅ Oui' : '❌ Non';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((v, i) => (
          <span key={i} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-gray-700 rounded text-xs">
            {typeof v === 'object' ? JSON.stringify(v) : v}
          </span>
        ));
      }
      return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    // Format currency
    if (key.includes('amount') || key.includes('price') || key.includes('revenue')) {
      return `$${parseFloat(value).toFixed(2)}`;
    }
    // Format status
    if (key === 'status' || key === 'payment_status') {
      const statusColors = {
        'completed': 'bg-green-600',
        'pending': 'bg-yellow-600',
        'failed': 'bg-red-600',
        'open': 'bg-green-600',
        'closed': 'bg-gray-600',
      };
      return (
        <span className={`px-2 py-0.5 rounded text-white text-xs ${statusColors[value] || 'bg-gray-600'}`}>
          {value}
        </span>
      );
    }
    return String(value);
  };

  // Labels français pour les clés
  const getKeyLabel = (key) => {
    const labels = {
      'campaign_id': 'Campagne ID',
      'title': 'Titre',
      'status': 'Statut',
      'old_status': 'Ancien statut',
      'new_status': 'Nouveau statut',
      'winners_count': 'Nombre gagnants',
      'total_participants': 'Participants totaux',
      'winners': 'Gagnants',
      'ticket_number': 'Numéro ticket',
      'user_name': 'Utilisateur',
      'user_email': 'Email',
      'prize_name': 'Prix',
      'transaction_id': 'ID Transaction',
      'amount': 'Montant',
      'payment_status': 'Statut paiement',
      'payment_method': 'Mode paiement',
      'synced': 'Synchronisés',
      'updated': 'Mis à jour',
      'errors': 'Erreurs',
      'code': 'Code',
      'discount_percent': 'Remise %',
      'influencer_name': 'Influenceur',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Stats rapides
  const stats = {
    total: pagination.total,
    creates: logs.filter(l => l.action?.includes('CREATE')).length,
    updates: logs.filter(l => l.action?.includes('UPDATE') || l.action?.includes('SYNC')).length,
    draws: logs.filter(l => l.action?.includes('DRAW')).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Journal d'activité</h1>
            <p className="text-gray-600 mt-1">Historique des actions administratives</p>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              loading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total des logs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-green-600">Créations</p>
            <p className="text-2xl font-bold text-green-700">{stats.creates}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <p className="text-sm text-blue-600">Modifications</p>
            <p className="text-2xl font-bold text-blue-700">{stats.updates}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <p className="text-sm text-purple-600">Tirages</p>
            <p className="text-2xl font-bold text-purple-700">{stats.draws}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les actions</option>
                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'entité</label>
              <select
                value={filters.entity_type}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les types</option>
                {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="datetime-local"
                value={filters.date_start}
                onChange={(e) => handleFilterChange('date_start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="datetime-local"
                value={filters.date_end}
                onChange={(e) => handleFilterChange('date_end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Table des logs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Chargement des logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xl text-gray-600">Aucun log trouvé</p>
              <p className="text-gray-400 mt-2">Les logs apparaîtront ici lorsque des actions seront effectuées</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entité</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => {
                      const actionInfo = getActionInfo(log.action);
                      const isExpanded = expandedLog === log.id;

                      return (
                        <React.Fragment key={log.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(log.created_at)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{log.admin_name || 'Système'}</div>
                              <div className="text-xs text-gray-500">{log.admin_email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${getColorClasses(actionInfo.color)}`}>
                                <span className="mr-1">{actionInfo.icon}</span>
                                {actionInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-700">
                                {ENTITY_LABELS[log.entity_type] || log.entity_type || '-'}
                              </span>
                              {log.entity_id && (
                                <span className="ml-2 text-xs text-gray-400">#{log.entity_id}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                              {log.ip_address || '-'}
                            </td>
                            <td className="px-6 py-4">
                              {log.details && (
                                <button
                                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  {isExpanded ? '▼ Masquer' : '▶ Voir détails'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && log.details && (
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(formatDetails(log.details) || {}).map(([key, value]) => (
                                      <div key={key} className="bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                          {getKeyLabel(key)}
                                        </p>
                                        <div className="text-green-400 font-medium">
                                          {renderDetailValue(key, value)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                  {log.user_agent && (
                                    <div>
                                      <span className="font-medium">Navigateur:</span> {log.user_agent.split(' ')[0]}
                                    </div>
                                  )}
                                  {log.ip_address && (
                                    <div>
                                      <span className="font-medium">IP:</span> {log.ip_address}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">ID Log:</span> #{log.id}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Affichage {(pagination.page - 1) * pagination.limit + 1} à{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} logs
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Précédent
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Page {pagination.page} / {pagination.totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLogsPage;
