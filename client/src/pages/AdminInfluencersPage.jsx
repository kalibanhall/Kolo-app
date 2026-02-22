import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { adminAPI } from '../services/api';

const AdminInfluencersPage = () => {
  const { isDarkMode } = useTheme();
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);

  // Formulaires
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', phone: '', promo_code: '', discount_type: 'percentage', discount_value: 10, commission_rate: 5, max_uses: 100, expires_at: '' });
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    commission_rate: 5,
    max_uses: 100,
    expires_at: ''
  });

  const loadInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getInfluencers();
      setInfluencers(response.data?.influencers || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]);

  const handleCreateInfluencer = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      setMessage({ type: 'error', text: 'Nom, email et mot de passe sont requis' });
      return;
    }
    if (!createForm.promo_code) {
      setMessage({ type: 'error', text: 'Le code promo est requis pour lier l\'influenceur' });
      return;
    }
    try {
      setActionLoading(true);
      const dataToSend = {
        ...createForm,
        phone: createForm.phone ? `+243${createForm.phone.replace(/^\+?243/, '')}` : ''
      };
      const response = await adminAPI.createInfluencer(dataToSend);
      if (response.pending_approval || response.data?.pending_approval) {
        setMessage({ type: 'success', text: response.message || response.data?.message || 'Demande soumise pour validation par le Superviseur (L2)' });
      } else {
        setMessage({ type: 'success', text: 'Influenceur créé avec succès' });
        await loadInfluencers();
      }
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', phone: '', promo_code: '', discount_type: 'percentage', discount_value: 10, commission_rate: 5, max_uses: 100, expires_at: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignPromo = async () => {
    if (!promoForm.code || !selectedInfluencer) return;
    try {
      setActionLoading(true);
      await adminAPI.assignPromoToInfluencer(selectedInfluencer.id, promoForm);
      setMessage({ type: 'success', text: `Code promo "${promoForm.code}" assigné à ${selectedInfluencer.name}` });
      setShowPromoModal(false);
      setSelectedInfluencer(null);
      setPromoForm({ code: '', discount_type: 'percentage', discount_value: 10, commission_rate: 5, max_uses: 100, expires_at: '' });
      await loadInfluencers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (influencer) => {
    if (!window.confirm(`Désactiver l'influenceur "${influencer.name}" et tous ses codes promo ?`)) return;
    try {
      setActionLoading(true);
      await adminAPI.deactivateInfluencer(influencer.id);
      setMessage({ type: 'success', text: `${influencer.name} désactivé` });
      await loadInfluencers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const openPromoModal = (influencer) => {
    setSelectedInfluencer(influencer);
    setShowPromoModal(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Gestion des Influenceurs
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Créer des influenceurs et leur assigner des codes promo
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Créer un Influenceur
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Influenceurs</p>
            <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {influencers.length}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Codes Promo Actifs</p>
            <p className={`text-2xl font-bold mt-1 text-green-500`}>
              {influencers.reduce((acc, inf) => acc + (inf.promo_codes?.filter(p => p.is_active)?.length || 0), 0)}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Utilisations Totales</p>
            <p className={`text-2xl font-bold mt-1 text-blue-500`}>
              {influencers.reduce((acc, inf) => acc + (inf.total_usage || 0), 0)}
            </p>
          </div>
        </div>

        {/* Influencers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          </div>
        ) : influencers.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Aucun influenceur
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Créez votre premier influenceur pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {influencers.map((influencer) => (
              <div key={influencer.id} className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                {/* Influencer Header */}
                <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${influencer.is_active !== false ? 'bg-purple-600' : 'bg-gray-400'}`}>
                      {influencer.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {influencer.name}
                        {influencer.influencer_uid && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-mono">
                            {influencer.influencer_uid}
                          </span>
                        )}
                        {influencer.is_active === false && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Désactivé</span>
                        )}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {influencer.email} {influencer.phone ? `• ${influencer.phone}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openPromoModal(influencer)}
                      disabled={influencer.is_active === false}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + Code Promo
                    </button>
                    {influencer.is_active !== false && (
                      <button
                        onClick={() => handleDeactivate(influencer)}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Désactiver
                      </button>
                    )}
                  </div>
                </div>

                {/* Promo Codes */}
                {influencer.promo_codes && influencer.promo_codes.length > 0 ? (
                  <div className="p-4">
                    <p className={`text-xs font-semibold uppercase mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Codes Promo ({influencer.promo_codes.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {influencer.promo_codes.map((code, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex justify-between items-start">
                            <code className={`font-mono font-bold ${code.is_active ? 'text-green-500' : 'text-gray-400'}`}>
                              {code.code}
                            </code>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${code.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {code.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div className={`mt-2 text-xs space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <p>Réduction: {code.discount_type === 'percentage' ? `${code.discount_value}%` : `${code.discount_value} USD`}</p>
                            <p>Commission: {code.commission_rate || 0}%</p>
                            <p>Utilisations: {code.current_uses || 0} / {code.max_uses || '∞'}</p>
                            {code.total_discount && <p>Total remises: ${parseFloat(code.total_discount).toFixed(2)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Aucun code promo assigné
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Créer Influenceur */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Créer un Influenceur
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Créer un compte influenceur avec accès au tableau de bord
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Nom de l'influenceur"
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="influenceur@example.com"
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mot de passe *
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Téléphone
                </label>
                <div className="flex">
                  <span className={`inline-flex items-center px-3 rounded-l-lg border border-r-0 text-sm ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                    +243
                  </span>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setCreateForm({ ...createForm, phone: val });
                    }}
                    placeholder="812345678"
                    maxLength="9"
                    className={`w-full px-3 py-2 rounded-r-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  081-083 (Vodacom), 084/085/089 (Orange), 097-099 (Airtel), 090/091 (Africell)
                </p>
              </div>

              {/* Code Promo lié */}
              <div className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Code Promo associé *
                </p>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Code *
                  </label>
                  <input
                    type="text"
                    value={createForm.promo_code}
                    onChange={(e) => setCreateForm({ ...createForm, promo_code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    placeholder="Ex: KOLO2026"
                    className={`w-full px-3 py-2 rounded-lg border font-mono uppercase ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Réduction (%)
                    </label>
                    <input
                      type="number" min="1" max="100"
                      value={createForm.discount_value}
                      onChange={(e) => setCreateForm({ ...createForm, discount_value: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Commission (%)
                    </label>
                    <input
                      type="number" min="0" max="50" step="0.5"
                      value={createForm.commission_rate}
                      onChange={(e) => setCreateForm({ ...createForm, commission_rate: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Max utilisations
                    </label>
                    <input
                      type="number" min="1"
                      value={createForm.max_uses}
                      onChange={(e) => setCreateForm({ ...createForm, max_uses: parseInt(e.target.value) || 100 })}
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Expiration
                    </label>
                    <input
                      type="date"
                      value={createForm.expires_at}
                      onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setShowCreateModal(false); setCreateForm({ name: '', email: '', password: '', phone: '', promo_code: '', discount_type: 'percentage', discount_value: 10, commission_rate: 5, max_uses: 100, expires_at: '' }); }}
                className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInfluencer}
                disabled={!createForm.name || !createForm.email || !createForm.password || !createForm.promo_code || actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Création...' : 'Créer l\'influenceur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assigner Code Promo */}
      {showPromoModal && selectedInfluencer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Assigner un Code Promo
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Pour {selectedInfluencer.name}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Code Promo *
                </label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: INFLUENCER2025"
                  className={`w-full px-3 py-2 rounded-lg border font-mono uppercase ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Type de réduction
                  </label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe ($)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Valeur
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={promoForm.discount_type === 'percentage' ? 100 : 10000}
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_value: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={promoForm.commission_rate}
                    onChange={(e) => setPromoForm({ ...promoForm, commission_rate: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    % du revenu généré par ce code
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Max utilisations
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.max_uses}
                    onChange={(e) => setPromoForm({ ...promoForm, max_uses: parseInt(e.target.value) || 100 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date d'expiration
                </label>
                <input
                  type="date"
                  value={promoForm.expires_at}
                  onChange={(e) => setPromoForm({ ...promoForm, expires_at: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setShowPromoModal(false); setSelectedInfluencer(null); }}
                className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Annuler
              </button>
              <button
                onClick={handleAssignPromo}
                disabled={!promoForm.code || actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Attribution...' : 'Assigner le code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInfluencersPage;
