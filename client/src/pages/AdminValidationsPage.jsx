import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const AdminValidationsPage = () => {
  const { isDarkMode } = useTheme();
  const { getAdminLevel } = useAuth();
  const adminLevel = getAdminLevel();

  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadValidations = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') params.status = filter;
      const response = await adminAPI.getValidations(params);
      setValidations(response.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadValidations();
  }, [loadValidations]);

  const handleApprove = async (id) => {
    if (!window.confirm('Approuver et exécuter cette demande ?')) return;
    try {
      setActionLoading(id);
      const response = await adminAPI.approveValidation(id);
      setMessage({ type: 'success', text: response.data?.message || response.message || 'Demande approuvée' });
      await loadValidations();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (validation) => {
    setRejectTarget(validation);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMessage({ type: 'error', text: 'Le motif de rejet est requis' });
      return;
    }
    try {
      setActionLoading(rejectTarget.id);
      await adminAPI.rejectValidation(rejectTarget.id, rejectReason);
      setMessage({ type: 'success', text: 'Demande rejetée' });
      setShowRejectModal(false);
      setRejectTarget(null);
      await loadValidations();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const getActionLabel = (type) => {
    switch (type) {
      case 'create_campaign': return 'Création de campagne';
      case 'edit_campaign': return 'Modification de campagne';
      case 'change_campaign_status': return 'Changement de statut';
      case 'launch_draw': return 'Lancement de tirage';
      case 'create_promo': return 'Création de code promo';
      case 'edit_promo': return 'Modification de code promo';
      case 'create_influencer': return 'Création d\'influenceur';
      default: return type;
    }
  };

  const getActionColor = (type) => {
    switch (type) {
      case 'create_campaign': return 'bg-blue-100 text-blue-700';
      case 'edit_campaign': return 'bg-yellow-100 text-yellow-700';
      case 'change_campaign_status': return 'bg-orange-100 text-orange-700';
      case 'launch_draw': return 'bg-purple-100 text-purple-700';
      case 'create_promo': return 'bg-green-100 text-green-700';
      case 'edit_promo': return 'bg-teal-100 text-teal-700';
      case 'create_influencer': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const getRequiredLevel = (actionType) => {
    if (actionType === 'launch_draw') return 'L3 (Administrateur)';
    return 'L2 (Superviseur)';
  };

  const canApprove = (validation) => {
    if (validation.status !== 'pending') return false;
    if (['create_campaign', 'edit_campaign', 'create_promo', 'create_influencer', 'change_campaign_status', 'edit_promo'].includes(validation.action_type)) return adminLevel >= 2;
    if (validation.action_type === 'launch_draw') return adminLevel >= 3;
    return adminLevel >= 2;
  };

  const pendingCount = validations.filter(v => v.status === 'pending').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex justify-between items-center ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            <p>{message.text}</p>
            <button onClick={() => setMessage(null)} className="font-bold text-lg">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Demandes de Validation
              {pendingCount > 0 && (
                <span className="ml-2 px-2.5 py-1 text-sm bg-orange-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {adminLevel >= 3
                ? 'Approuver les campagnes (L1→L2) et les tirages (L2→L3)'
                : 'Approuver les demandes de campagnes des opérateurs (L1)'}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={`flex gap-1 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'pending', label: 'En attente', count: validations.filter(v => v.status === 'pending').length },
            { id: 'approved', label: 'Approuvées', count: validations.filter(v => v.status === 'approved').length },
            { id: 'rejected', label: 'Rejetées', count: validations.filter(v => v.status === 'rejected').length },
            { id: 'all', label: 'Toutes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  tab.id === 'pending' ? 'bg-orange-100 text-orange-700' : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Validations List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : validations.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Aucune demande {filter !== 'all' ? getStatusLabel(filter).toLowerCase() : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {validations.map((v) => (
              <div key={v.id} className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                {/* Header Row */}
                <div
                  className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer ${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      v.status === 'pending' ? 'bg-orange-500 animate-pulse' : v.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(v.action_type)}`}>
                          {getActionLabel(v.action_type)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(v.status)}`}>
                          {getStatusLabel(v.status)}
                        </span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          → {getRequiredLevel(v.action_type)}
                        </span>
                      </div>
                      <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {v.payload?.title || v.payload?.code || v.payload?.name || 
                          (v.action_type === 'launch_draw' ? `Tirage campagne #${v.entity_id}` : 
                          v.action_type === 'create_promo' || v.action_type === 'edit_promo' ? `Code promo: ${v.payload?.code || '#' + (v.entity_id || 'nouveau')}` :
                          v.action_type === 'create_influencer' ? `Influenceur: ${v.payload?.name || '#' + (v.entity_id || 'nouveau')}` :
                          v.action_type === 'change_campaign_status' ? `Campagne "${v.payload?.title}" → ${v.payload?.new_status}` :
                          `Campagne #${v.entity_id || '(nouvelle)'}`)
                        }
                      </p>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Par {v.requested_by_name} • {new Date(v.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {v.validated_by_name && ` • ${v.status === 'approved' ? 'Approuvé' : 'Rejeté'} par ${v.validated_by_name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canApprove(v) && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(v.id); }}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === v.id ? '...' : 'Approuver'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openRejectModal(v); }}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                    <svg className={`w-5 h-5 transform transition-transform ${expandedId === v.id ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === v.id && (
                  <div className={`px-4 pb-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="pt-4 space-y-3">
                      {v.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-semibold text-red-600 mb-1">Motif du rejet</p>
                          <p className="text-sm text-red-700">{v.rejection_reason}</p>
                        </div>
                      )}

                      {v.payload && (
                        <div>
                          <p className={`text-xs font-semibold uppercase mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Détails de la demande
                          </p>
                          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 text-sm`}>
                            {v.payload.title && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Titre</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.title}</p>
                              </div>
                            )}
                            {v.payload.ticket_price && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Prix ticket</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${v.payload.ticket_price}</p>
                              </div>
                            )}
                            {v.payload.total_tickets && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total tickets</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.total_tickets}</p>
                              </div>
                            )}
                            {v.payload.main_prize && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Prix principal</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.main_prize}</p>
                              </div>
                            )}
                            {v.payload.ticket_prefix && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Préfixe</p>
                                <p className={`font-medium font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.ticket_prefix}</p>
                              </div>
                            )}
                            {v.payload.status && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Statut</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.status}</p>
                              </div>
                            )}
                            {v.payload.draw_method && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Méthode de tirage</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.draw_method === 'automatic' ? 'Automatique' : 'Manuel'}</p>
                              </div>
                            )}
                            {v.payload.bonus_winners_count !== undefined && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Gagnants bonus</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v.payload.bonus_winners_count}</p>
                              </div>
                            )}
                            {v.payload.start_date && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Date début</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(v.payload.start_date).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            )}
                            {v.payload.end_date && (
                              <div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Date fin</p>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(v.payload.end_date).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            )}
                          </div>
                          {v.payload.description && (
                            <div className="mt-3">
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Description</p>
                              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {v.payload.description.length > 200 ? v.payload.description.slice(0, 200) + '...' : v.payload.description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && rejectTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Rejeter la demande
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {getActionLabel(rejectTarget.action_type)} — {rejectTarget.payload?.title || `#${rejectTarget.entity_id}`}
              </p>
            </div>
            <div className="px-6 py-4">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Motif du rejet *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi cette demande est rejetée..."
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
              />
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
                className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectTarget.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === rejectTarget.id ? 'Traitement...' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminValidationsPage;
