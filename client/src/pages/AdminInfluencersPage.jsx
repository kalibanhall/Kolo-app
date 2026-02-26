import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { adminAPI, promosAPI } from '../services/api';

// Générer un code promo aléatoire de 7 caractères
const generatePromoCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const AdminInfluencersPage = () => {
  const { isDarkMode } = useTheme();
  const { getAdminLevel } = useAuth();
  const adminLevel = getAdminLevel();

  // Data
  const [influencers, setInfluencers] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('all');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [withAccount, setWithAccount] = useState(false);

  // Assign promo modal
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Users modal
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [influencerUsers, setInfluencerUsers] = useState([]);

  // Edit promo
  const [editingPromo, setEditingPromo] = useState(null);

  // Unified create form
  const initialForm = {
    promo_code: '',
    influencer_name: '',
    discount_type: 'percentage',
    discount_value: 10,
    commission_rate: 5,
    max_uses: 100,
    expires_at: '',
    name: '',
    email: '',
    password: '',
    phone: '',
  };
  const [createForm, setCreateForm] = useState(initialForm);

  // Assign promo form
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    commission_rate: 5,
    max_uses: 100,
    expires_at: ''
  });

  // ─── Load data ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [infRes, promoRes] = await Promise.all([
        adminAPI.getInfluencers().catch(() => ({ influencers: [] })),
        promosAPI.getAll().catch(() => ({ data: [] }))
      ]);
      setInfluencers(infRes.influencers || infRes.data?.influencers || []);
      setPromos(promoRes.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Create (unified) ────────────────────────────────────────
  const handleCreate = async () => {
    if (withAccount) {
      if (!createForm.name || !createForm.email || !createForm.password) {
        setMessage({ type: 'error', text: 'Nom, email et mot de passe sont requis' });
        return;
      }
      if (!createForm.promo_code) {
        setMessage({ type: 'error', text: 'Le code promo est requis' });
        return;
      }
      try {
        setActionLoading(true);
        const dataToSend = {
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          phone: createForm.phone ? `+243${createForm.phone.replace(/^\+?243/, '')}` : '',
          promo_code: createForm.promo_code,
          discount_type: createForm.discount_type,
          discount_value: createForm.discount_value,
          commission_rate: createForm.commission_rate,
          max_uses: createForm.max_uses,
          expires_at: createForm.expires_at || null,
        };
        const response = await adminAPI.createInfluencer(dataToSend);
        if (response.pending_approval || response.data?.pending_approval) {
          setMessage({ type: 'success', text: response.message || response.data?.message || 'Demande soumise pour validation par le Superviseur (L2)' });
        } else {
          setMessage({ type: 'success', text: `Influenceur "${createForm.name}" créé avec le code ${createForm.promo_code}` });
        }
        closeCreateModal();
        await loadData();
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setActionLoading(false);
      }
    } else {
      if (!createForm.influencer_name.trim()) {
        setMessage({ type: 'error', text: "Veuillez entrer le nom de l'influenceur" });
        return;
      }
      if (!createForm.promo_code) {
        setMessage({ type: 'error', text: 'Veuillez générer ou saisir un code promo' });
        return;
      }
      try {
        setActionLoading(true);
        const response = await promosAPI.create({
          code: createForm.promo_code,
          influencer_name: createForm.influencer_name,
          discount_percent: createForm.discount_value,
          max_uses: createForm.max_uses,
          expires_at: createForm.expires_at || null
        });
        if (response.pending_approval || response.data?.pending_approval) {
          setMessage({ type: 'success', text: response.message || 'Demande de création soumise pour validation' });
        } else {
          setMessage({ type: 'success', text: `Code promo "${createForm.promo_code}" créé pour ${createForm.influencer_name}` });
        }
        closeCreateModal();
        await loadData();
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Edit promo
  const handleEditPromo = (promo) => {
    setEditingPromo(promo);
    setCreateForm({
      ...initialForm,
      influencer_name: promo.influencer_name || '',
      promo_code: promo.code,
      discount_value: promo.discount_percent || 10,
      max_uses: promo.max_uses || 100,
      expires_at: promo.expires_at ? promo.expires_at.split('T')[0] : ''
    });
    setWithAccount(false);
    setShowCreateModal(true);
  };

  const handleUpdatePromo = async () => {
    if (!createForm.influencer_name.trim()) {
      setMessage({ type: 'error', text: "Veuillez entrer le nom de l'influenceur" });
      return;
    }
    try {
      setActionLoading(true);
      const response = await promosAPI.update(editingPromo.id, {
        influencer_name: createForm.influencer_name,
        discount_percent: createForm.discount_value,
        max_uses: createForm.max_uses,
        expires_at: createForm.expires_at || null
      });
      if (response.pending_approval || response.data?.pending_approval) {
        setMessage({ type: 'success', text: response.message || 'Modification soumise pour validation' });
      } else {
        setMessage({ type: 'success', text: `Code promo "${createForm.promo_code}" mis à jour` });
      }
      closeCreateModal();
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(initialForm);
    setWithAccount(false);
    setEditingPromo(null);
  };

  // ─── Assign promo to existing influencer ──────────────────────
  const handleAssignPromo = async () => {
    if (!promoForm.code || !selectedInfluencer) return;
    try {
      setActionLoading(true);
      const assignData = {
        code: promoForm.code,
        discount_percent: promoForm.discount_value,
        commission_rate: promoForm.commission_rate,
        max_uses: promoForm.max_uses,
        expires_at: promoForm.expires_at || null
      };
      await adminAPI.assignPromoToInfluencer(selectedInfluencer.id, assignData);
      setMessage({ type: 'success', text: `Code promo "${promoForm.code}" assigné à ${selectedInfluencer.name}` });
      setShowPromoModal(false);
      setSelectedInfluencer(null);
      setPromoForm({ code: '', discount_type: 'percentage', discount_value: 10, commission_rate: 5, max_uses: 100, expires_at: '' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Influencer actions ───────────────────────────────────────
  const handleDeactivate = async (influencer) => {
    if (!window.confirm(`Désactiver l'influenceur "${influencer.name}" et tous ses codes promo ?`)) return;
    try {
      setActionLoading(true);
      await adminAPI.deactivateInfluencer(influencer.id);
      setMessage({ type: 'success', text: `${influencer.name} désactivé avec ses codes promo` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (influencer) => {
    if (!window.confirm(`Réactiver l'influenceur "${influencer.name}" et ses codes promo ?`)) return;
    try {
      setActionLoading(true);
      await adminAPI.reactivateInfluencer(influencer.id);
      setMessage({ type: 'success', text: `${influencer.name} réactivé avec ses codes promo` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (influencer) => {
    if (!window.confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT l'influenceur "${influencer.name}" ?\n\nCette action est irréversible.`)) return;
    try {
      setActionLoading(true);
      await adminAPI.deleteInfluencer(influencer.id);
      setMessage({ type: 'success', text: `${influencer.name} supprimé définitivement` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Promo actions ────────────────────────────────────────────
  const handleTogglePromoActive = async (id, currentStatus) => {
    try {
      const response = await promosAPI.update(id, { is_active: !currentStatus });
      if (response.pending_approval || response.data?.pending_approval) {
        setMessage({ type: 'success', text: response.message || 'Demande soumise pour validation' });
      } else {
        await loadData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Supprimer ce code promo ?')) return;
    try {
      await promosAPI.delete(id);
      setMessage({ type: 'success', text: 'Code promo supprimé' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // ─── View users ───────────────────────────────────────────────
  const handleViewUsers = async (influencer) => {
    try {
      setSelectedInfluencer(influencer);
      setActionLoading(true);
      const response = await adminAPI.getInfluencerUsers(influencer.id);
      setInfluencerUsers(response.users || []);
      setShowUsersModal(true);
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

  // ─── Stats ────────────────────────────────────────────────────
  const totalActivePromos = promos.filter(p => p.is_active).length +
    influencers.reduce((acc, inf) => acc + (inf.promo_codes?.filter(p => p.is_active)?.length || 0), 0);
  const totalUsage = promos.reduce((acc, p) => acc + (p.used_count || 0), 0) +
    influencers.reduce((acc, inf) => acc + (inf.total_usage || 0), 0);

  // Standalone promos (not linked to an influencer account)
  const standalonePromos = promos.filter(p => {
    const linkedCodes = influencers.flatMap(inf => inf.promo_codes?.map(c => c.code) || []);
    return !linkedCodes.includes(p.code);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex justify-between items-start ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold ml-4">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Promo Influenceur
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Gérez les codes promo et les comptes influenceurs
            </p>
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setEditingPromo(null); }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouveau
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Influenceurs</p>
            <p className="text-2xl font-bold mt-1 text-purple-500">{influencers.length}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Codes Promo</p>
            <p className="text-2xl font-bold mt-1 text-blue-500">{standalonePromos.length}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Promos Actifs</p>
            <p className="text-2xl font-bold mt-1 text-green-500">{totalActivePromos}</p>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Utilisations</p>
            <p className="text-2xl font-bold mt-1 text-blue-500">{totalUsage}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {[
            { key: 'all', label: 'Tout' },
            { key: 'influencers', label: `Influenceurs (${influencers.length})` },
            { key: 'promos', label: `Codes Promo (${standalonePromos.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? (isDarkMode ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow')
                  : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Influenceurs Section ────────────────────────── */}
            {(activeTab === 'all' || activeTab === 'influencers') && (
              <>
                {activeTab === 'all' && influencers.length > 0 && (
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    👤 Influenceurs avec compte
                  </h2>
                )}
                {influencers.length === 0 && activeTab === 'influencers' ? (
                  <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Aucun influenceur avec compte</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Cliquez sur "Nouveau" et activez "Créer un compte"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {influencers.map((influencer) => (
                      <div key={influencer.id} className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                        {/* Header */}
                        <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${influencer.is_active !== false ? 'bg-purple-600' : 'bg-gray-400'}`}>
                              {influencer.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {influencer.name}
                                {influencer.influencer_uid && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-mono">{influencer.influencer_uid}</span>
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
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleViewUsers(influencer)} className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors">
                              👥 Utilisateurs
                            </button>
                            <button onClick={() => openPromoModal(influencer)} disabled={influencer.is_active === false} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              + Code Promo
                            </button>
                            {influencer.is_active !== false ? (
                              <button onClick={() => handleDeactivate(influencer)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors">
                                Désactiver
                              </button>
                            ) : (
                              <button onClick={() => handleReactivate(influencer)} className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors">
                                Réactiver
                              </button>
                            )}
                            <button onClick={() => handleDelete(influencer)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" title="Supprimer définitivement">
                              🗑️
                            </button>
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
                                    <code className={`font-mono font-bold ${code.is_active ? 'text-green-500' : 'text-gray-400'}`}>{code.code}</code>
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
              </>
            )}

            {/* ── Standalone Promos Section ───────────────────── */}
            {(activeTab === 'all' || activeTab === 'promos') && (
              <>
                {activeTab === 'all' && standalonePromos.length > 0 && (
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    🎟️ Codes Promo (sans compte)
                  </h2>
                )}
                {standalonePromos.length === 0 && activeTab === 'promos' ? (
                  <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Aucun code promo standalone</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Cliquez sur "Nouveau" pour en créer</p>
                  </div>
                ) : standalonePromos.length > 0 && (
                  <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Code</th>
                            <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Influenceur</th>
                            <th className={`px-6 py-3 text-center text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Réduction</th>
                            <th className={`px-6 py-3 text-center text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Utilisations</th>
                            <th className={`px-6 py-3 text-center text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Statut</th>
                            <th className={`px-6 py-3 text-right text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {standalonePromos.map((promo) => (
                            <tr key={promo.id} className={isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4">
                                <span className={`font-mono text-lg font-bold tracking-wider ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>{promo.code}</span>
                              </td>
                              <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{promo.influencer_name || '-'}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                                  -{promo.discount_percent}%
                                </span>
                              </td>
                              <td className={`px-6 py-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{promo.used_count || 0} / {promo.max_uses || '∞'}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${promo.is_active ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'}`}>
                                  {promo.is_active ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleEditPromo(promo)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg" title="Modifier">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleTogglePromoActive(promo.id, promo.is_active)} className={`p-2 rounded-lg ${promo.is_active ? 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`} title={promo.is_active ? 'Désactiver' : 'Activer'}>
                                    {promo.is_active ? (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    ) : (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </button>
                                  {adminLevel >= 2 && (
                                    <button onClick={() => handleDeletePromo(promo.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg" title="Supprimer">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {activeTab === 'all' && influencers.length === 0 && standalonePromos.length === 0 && (
              <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Aucun code promo ou influenceur
                </p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Cliquez sur "Nouveau" pour commencer
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════ MODAL: Créer / Modifier ════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingPromo ? 'Modifier le Code Promo' : 'Nouveau Promo Influenceur'}
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {editingPromo ? 'Modifier les paramètres du code promo' : 'Créer un code promo, avec ou sans compte influenceur'}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Toggle: avec ou sans compte */}
              {!editingPromo && (
                <div className={`p-3 rounded-lg border ${withAccount ? (isDarkMode ? 'border-purple-500 bg-purple-900/20' : 'border-purple-300 bg-purple-50') : (isDarkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50')}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={withAccount}
                      onChange={(e) => setWithAccount(e.target.checked)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Créer un compte influenceur
                      </span>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        L'influenceur aura accès à un tableau de bord avec ses stats
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Nom influenceur (promo-only mode or editing) */}
              {(!withAccount || editingPromo) && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Identité de l'influenceur *
                  </label>
                  <input
                    type="text"
                    value={createForm.influencer_name}
                    onChange={(e) => setCreateForm({ ...createForm, influencer_name: e.target.value })}
                    placeholder="Ex: Jean Kalala, @influenceur_congo"
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
              )}

              {/* Account fields */}
              {withAccount && !editingPromo && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nom complet *</label>
                    <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nom de l'influenceur"
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email *</label>
                    <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="influenceur@example.com"
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mot de passe *</label>
                    <input type="password" autoComplete="new-password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Minimum 8 caractères"
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Téléphone</label>
                    <div className="flex">
                      <span className={`inline-flex items-center px-3 rounded-l-lg border border-r-0 text-sm ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>+243</span>
                      <input type="tel" value={createForm.phone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 9); setCreateForm({ ...createForm, phone: val }); }} placeholder="812345678" maxLength="9"
                        className={`w-full px-3 py-2 rounded-r-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                    </div>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      081-083 (Vodacom), 084/085/089 (Orange), 097-099 (Airtel), 090/091 (Africell)
                    </p>
                  </div>
                </>
              )}

              {/* Code promo */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Code Promo *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createForm.promo_code}
                    onChange={(e) => setCreateForm({ ...createForm, promo_code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    placeholder="Ex: KOLO2026"
                    maxLength={7}
                    readOnly={!!editingPromo}
                    disabled={!!editingPromo}
                    className={`flex-1 px-3 py-2 rounded-lg border font-mono text-lg tracking-wider uppercase ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent ${editingPromo ? 'opacity-60' : ''}`}
                  />
                  {!editingPromo && (
                    <button type="button" onClick={() => setCreateForm({ ...createForm, promo_code: generatePromoCode() })}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-blue-700 transition-all whitespace-nowrap">
                      🎲 Générer
                    </button>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Code de 7 caractères alphanumériques</p>
              </div>

              {/* Promo settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Réduction (%)</label>
                  <input type="number" min="1" max="100" value={createForm.discount_value} onChange={(e) => setCreateForm({ ...createForm, discount_value: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                </div>
                {withAccount && !editingPromo && (
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Commission (%)</label>
                    <input type="number" min="0" max="50" step="0.5" value={createForm.commission_rate} onChange={(e) => setCreateForm({ ...createForm, commission_rate: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                  </div>
                )}
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max utilisations</label>
                  <input type="number" min="1" value={createForm.max_uses} onChange={(e) => setCreateForm({ ...createForm, max_uses: parseInt(e.target.value) || 100 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Expiration</label>
                  <input type="date" value={createForm.expires_at} onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`} />
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={closeCreateModal} className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                Annuler
              </button>
              <button
                onClick={editingPromo ? handleUpdatePromo : handleCreate}
                disabled={actionLoading || !createForm.promo_code || (withAccount ? (!createForm.name || !createForm.email || !createForm.password) : (!editingPromo && !createForm.influencer_name))}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> {editingPromo ? 'Mise à jour...' : 'Création...'}</>
                ) : (
                  editingPromo ? 'Mettre à jour' : (withAccount ? "Créer l'influenceur" : 'Créer le code promo')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL: Assigner Code Promo ═════════════════════ */}
      {showPromoModal && selectedInfluencer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Assigner un Code Promo</h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pour {selectedInfluencer.name}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Code Promo *</label>
                <input type="text" value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="Ex: INFLUENCER2025"
                  className={`w-full px-3 py-2 rounded-lg border font-mono uppercase ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type de réduction</label>
                  <select value={promoForm.discount_type} onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}>
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe ($)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Valeur</label>
                  <input type="number" min="1" max={promoForm.discount_type === 'percentage' ? 100 : 10000} value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Commission (%)</label>
                  <input type="number" min="0" max="50" step="0.5" value={promoForm.commission_rate} onChange={(e) => setPromoForm({ ...promoForm, commission_rate: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Max utilisations</label>
                  <input type="number" min="1" value={promoForm.max_uses} onChange={(e) => setPromoForm({ ...promoForm, max_uses: parseInt(e.target.value) || 100 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date d'expiration</label>
                <input type="date" value={promoForm.expires_at} onChange={(e) => setPromoForm({ ...promoForm, expires_at: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => { setShowPromoModal(false); setSelectedInfluencer(null); }} className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>Annuler</button>
              <button onClick={handleAssignPromo} disabled={!promoForm.code || actionLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Attribution...' : 'Assigner le code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL: Utilisateurs ════════════════════════════ */}
      {showUsersModal && selectedInfluencer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Utilisateurs de {selectedInfluencer.name}</h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{influencerUsers.length} utilisateur{influencerUsers.length !== 1 ? 's' : ''} ayant utilisé ses codes promo</p>
            </div>
            <div className="px-6 py-4">
              {influencerUsers.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Aucun utilisateur</p>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Personne n'a encore utilisé les codes promo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-xs uppercase ${isDarkMode ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                        <th className="px-3 py-2 text-left">Utilisateur</th>
                        <th className="px-3 py-2 text-left">Code utilisé</th>
                        <th className="px-3 py-2 text-right">Montant</th>
                        <th className="px-3 py-2 text-right">Remise</th>
                        <th className="px-3 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {influencerUsers.map((u, idx) => (
                        <tr key={idx} className={`${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                          <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <div className="text-sm font-medium">{u.name || 'Anonyme'}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{u.email}</div>
                          </td>
                          <td className="px-3 py-2"><code className="text-xs font-mono text-purple-500">{u.promo_code_used}</code></td>
                          <td className={`px-3 py-2 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {u.purchase_amount ? `${parseFloat(u.purchase_amount).toFixed(2)} ${u.purchase_currency || 'USD'}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-green-500 font-medium">
                            {u.discount_applied ? `$${parseFloat(u.discount_applied).toFixed(2)}` : '-'}
                          </td>
                          <td className={`px-3 py-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {u.used_at ? new Date(u.used_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={`px-6 py-4 border-t flex justify-end ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => { setShowUsersModal(false); setSelectedInfluencer(null); setInfluencerUsers([]); }} className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInfluencersPage;
