import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { influencerAPI, campaignsAPI } from '../services/api';
import { LogoKolo } from '../components/LogoKolo';

const InfluencerDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exchangeRate, setExchangeRate] = useState(2850);
  const [activeCampaignId, setActiveCampaignId] = useState(null);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Payout request modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ influencer_uid: '', phone_number: '', percentage: 100, currency: 'USD' });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState(null);

  // Payout history
  const [payouts, setPayouts] = useState([]);

  // Message global
  const [globalMessage, setGlobalMessage] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, profileRes, payoutsRes] = await Promise.all([
        influencerAPI.getDashboard(),
        influencerAPI.getProfile(),
        influencerAPI.getPayouts()
      ]);
      
      setDashboard(dashRes.data);
      const profileData = profileRes.data?.profile || profileRes.data || profileRes.profile || profileRes;
      setProfile(profileData);
      setPayouts(payoutsRes.data?.payouts || payoutsRes.data || payoutsRes.payouts || []);
      
      if (dashRes.data?.exchange_rate) {
        setExchangeRate(dashRes.data.exchange_rate);
      }

      // Auto-show password change modal on first login
      if (profileData?.must_change_password) {
        setShowPasswordModal(true);
      }

      // Pre-fill payout form with influencer_uid
      if (profileData?.influencer_uid) {
        setPayoutForm(prev => ({ ...prev, influencer_uid: profileData.influencer_uid }));
      }

      // Load active campaign for buy button
      try {
        const campRes = await campaignsAPI.getAll();
        const campaigns = campRes.data || campRes.campaigns || [];
        const active = campaigns.find(c => c.status === 'active' || c.status === 'open');
        if (active) setActiveCampaignId(active.id);
      } catch (e) { /* Not critical */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      setPasswordMessage({ type: 'error', text: 'Tous les champs sont requis' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 6 caracteres' });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    try {
      setPasswordLoading(true);
      await influencerAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordMessage({ type: 'success', text: 'Mot de passe modifie avec succes !' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      // Update local profile state
      setProfile(prev => prev ? { ...prev, must_change_password: false } : prev);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage(null);
      }, 2000);
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Payout request handler
  const handlePayoutRequest = async () => {
    if (!payoutForm.influencer_uid || !payoutForm.phone_number) {
      setPayoutMessage({ type: 'error', text: 'Tous les champs sont requis' });
      return;
    }
    try {
      setPayoutLoading(true);
      const res = await influencerAPI.requestPayout(payoutForm);
      setPayoutMessage({ type: 'success', text: res.data?.message || res.message || 'Demande soumise !' });
      // Refresh payouts and profile
      const [payoutsRes, profileRes] = await Promise.all([
        influencerAPI.getPayouts(),
        influencerAPI.getProfile()
      ]);
      setPayouts(payoutsRes.data?.payouts || payoutsRes.data || payoutsRes.payouts || []);
      const profileData = profileRes.data?.profile || profileRes.data || profileRes.profile || profileRes;
      setProfile(profileData);
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutMessage(null);
      }, 3000);
    } catch (err) {
      setPayoutMessage({ type: 'error', text: err.message || 'Erreur' });
    } finally {
      setPayoutLoading(false);
    }
  };

  // Check if payout button should be active (5th of month)
  const isPayoutDay = new Date().getDate() === 5;
  const commissionBalance = profile?.commission_balance || 0;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button onClick={loadDashboard} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const promoStats = dashboard?.promo_stats || [];
  const recentUses = dashboard?.recent_uses || [];
  const monthlyStats = dashboard?.monthly_stats || [];

  const formatFC = (usdAmount) => {
    const fc = Math.round(parseFloat(usdAmount || 0) * exchangeRate);
    return fc.toLocaleString('fr-FR') + ' FC';
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Navigation */}
      <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-30 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
              title="Retour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <LogoKolo size="small" />
            <div>
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                KOLO Influenceur
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Bienvenue, {user?.name}
                {profile?.influencer_uid && (
                  <span className="ml-1 font-mono text-purple-400">({profile.influencer_uid})</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {activeCampaignId && (
              <Link
                to={`/buy/${activeCampaignId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span className="hidden sm:inline">Acheter mes Tickets</span>
                <span className="sm:hidden">Tickets</span>
              </Link>
            )}
            <button
              onClick={() => setShowPasswordModal(true)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Changer mot de passe"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Deconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global message */}
        {globalMessage && (
          <div className={`p-4 rounded-lg ${globalMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {globalMessage.text}
            <button onClick={() => setGlobalMessage(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mes Codes</p>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {summary.total_codes || 0}
            </p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Utilisations</p>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {summary.total_uses || 0}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {summary.unique_users || 0} utilisateurs uniques
            </p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow border-2 border-purple-500/30`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ma Commission</p>
            </div>
            <p className="text-2xl font-bold text-purple-500">
              ${parseFloat(commissionBalance).toFixed(2)}
            </p>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-400'}`}>
              {formatFC(commissionBalance)}
            </p>
          </div>

          {/* Payout Request Card */}
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Versement</p>
            </div>
            <button
              onClick={() => {
                if (!isPayoutDay) {
                  setGlobalMessage({ type: 'error', text: 'Les demandes de versement ne sont autorisees que le 5 de chaque mois.' });
                  return;
                }
                if (commissionBalance <= 0) {
                  setGlobalMessage({ type: 'error', text: 'Solde insuffisant pour effectuer un versement.' });
                  return;
                }
                setShowPayoutModal(true);
              }}
              disabled={!isPayoutDay || commissionBalance <= 0}
              className={`w-full mt-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                isPayoutDay && commissionBalance > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Demande de versement
            </button>
            <p className={`text-[10px] mt-1.5 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {isPayoutDay ? "Disponible aujourd'hui" : 'Disponible le 5 du mois'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Mes Codes Promo' },
              { id: 'recent', label: 'Utilisations Recentes' },
              { id: 'monthly', label: 'Stats Mensuelles' },
              { id: 'payouts', label: 'Mes Versements' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-500'
                    : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content: Promo Stats */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {promoStats.length === 0 ? (
              <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Aucun code promo assigne</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Contactez l'administrateur pour obtenir vos codes promo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promoStats.map((promo) => (
                  <div key={promo.code_id} className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <code className={`text-lg font-mono font-bold ${promo.is_active ? 'text-purple-500' : 'text-gray-400'}`}>{promo.code}</code>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {promo.discount_type === 'percentage' ? `${promo.discount_value}% de reduction` : `$${promo.discount_value} de reduction`}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {promo.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Utilisations</p>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {promo.total_uses || 0}
                          <span className={`text-xs font-normal ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>/ {promo.max_uses || '\u221e'}</span>
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Utilisateurs</p>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{promo.unique_users || 0}</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ma commission ({promo.commission_rate || 0}%)</p>
                        <p className="text-lg font-bold text-purple-500">${parseFloat(promo.commission_earned || 0).toFixed(2)}</p>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-400'}`}>{formatFC(promo.commission_earned || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Recent Uses */}
        {activeTab === 'recent' && (
          <div className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
            {recentUses.length === 0 ? (
              <div className="p-8 text-center">
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aucune utilisation recente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`text-xs uppercase ${isDarkMode ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Utilisateur</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {recentUses.map((use, idx) => (
                      <tr key={idx} className={`${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {new Date(use.used_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3"><code className="text-sm font-mono text-purple-500">{use.code}</code></td>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{use.user_name || 'Anonyme'}</td>
                        <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          ${parseFloat(use.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-500 font-medium">
                          +${parseFloat(use.commission_earned || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Monthly Stats */}
        {activeTab === 'monthly' && (
          <div className="space-y-4">
            {monthlyStats.length === 0 ? (
              <div className={`text-center py-12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aucune donnee mensuelle disponible</p>
              </div>
            ) : (
              <>
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Evolution mensuelle</h3>
                  <div className="flex items-end gap-3 h-40">
                    {monthlyStats.map((stat) => {
                      const maxRevenue = Math.max(...monthlyStats.map(s => parseFloat(s.revenue || 0)));
                      const height = maxRevenue > 0 ? (parseFloat(stat.revenue || 0) / maxRevenue) * 100 : 0;
                      const monthLabel = new Date(stat.month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
                      return (
                        <div key={stat.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>${parseFloat(stat.revenue || 0).toFixed(0)}</span>
                          <div className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all" style={{ height: `${Math.max(height, 2)}%` }} />
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{monthLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`text-xs uppercase ${isDarkMode ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                          <th className="px-4 py-3 text-left">Mois</th>
                          <th className="px-4 py-3 text-right">Utilisations</th>
                          <th className="px-4 py-3 text-right">Commission (USD)</th>
                          <th className="px-4 py-3 text-right">Commission (FC)</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {monthlyStats.map((stat) => (
                          <tr key={stat.month} className={`${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                            <td className={`px-4 py-3 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {new Date(stat.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{stat.uses}</td>
                            <td className="px-4 py-3 text-sm text-right text-purple-500 font-medium">${parseFloat(stat.commission || 0).toFixed(2)}</td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-400'}`}>{formatFC(stat.commission || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={`font-bold ${isDarkMode ? 'bg-gray-750 text-white' : 'bg-gray-50 text-gray-900'}`}>
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-sm text-right">{monthlyStats.reduce((acc, s) => acc + parseInt(s.uses || 0), 0)}</td>
                          <td className="px-4 py-3 text-sm text-right text-purple-500">${monthlyStats.reduce((acc, s) => acc + parseFloat(s.commission || 0), 0).toFixed(2)}</td>
                          <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-purple-300' : 'text-purple-400'}`}>
                            {formatFC(monthlyStats.reduce((acc, s) => acc + parseFloat(s.commission || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab Content: Payouts */}
        {activeTab === 'payouts' && (
          <div className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
            {payouts.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Aucune demande de versement</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Faites votre premiere demande le 5 du mois
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`text-xs uppercase ${isDarkMode ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-center">%</th>
                      <th className="px-4 py-3 text-left">Telephone</th>
                      <th className="px-4 py-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {payouts.map((p) => (
                      <tr key={p.id} className={`${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {new Date(p.requested_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {p.currency === 'CDF' ? `${parseFloat(p.amount).toLocaleString('fr-FR')} FC` : `$${parseFloat(p.amount).toFixed(2)}`}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{p.percentage_requested}%</td>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{p.phone_number}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            p.status === 'approved' || p.status === 'paid' ? 'bg-green-100 text-green-700' :
                            p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {p.status === 'approved' ? 'Approuve' : p.status === 'paid' ? 'Paye' : p.status === 'pending' ? 'En attente' : 'Rejete'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        &copy; {new Date().getFullYear()} KOLO &mdash; Espace Influenceur
      </footer>

      {/* ===== PASSWORD CHANGE MODAL ===== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {profile?.must_change_password ? 'Changez votre mot de passe' : 'Modifier le mot de passe'}
              </h2>
              {!profile?.must_change_password && (
                <button onClick={() => { setShowPasswordModal(false); setPasswordMessage(null); }} className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {profile?.must_change_password && (
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                Pour votre securite, veuillez changer le mot de passe fourni par l'administrateur.
              </p>
            )}
            {passwordMessage && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {passwordMessage.text}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mot de passe actuel</label>
                <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  placeholder="Mot de passe actuel" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nouveau mot de passe</label>
                <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  placeholder="Minimum 6 caracteres" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmer le mot de passe</label>
                <input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  placeholder="Repetez le nouveau mot de passe" />
              </div>
              <button onClick={handleChangePassword} disabled={passwordLoading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                {passwordLoading ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PAYOUT REQUEST MODAL ===== */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Demande de versement</h2>
              <button onClick={() => { setShowPayoutModal(false); setPayoutMessage(null); }} className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Solde disponible : <span className="font-bold text-purple-500">${parseFloat(commissionBalance).toFixed(2)}</span>
              <span className={`ml-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-400'}`}>{formatFC(commissionBalance)}</span>
            </p>
            {payoutMessage && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${payoutMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {payoutMessage.text}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>ID Influenceur</label>
                <input type="text" value={payoutForm.influencer_uid} readOnly
                  className={`w-full px-3 py-2 rounded-lg border font-mono ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-600'} cursor-not-allowed`}
                  placeholder="INF-001" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Numero telephone beneficiaire</label>
                <input type="tel" value={payoutForm.phone_number} onChange={e => setPayoutForm({ ...payoutForm, phone_number: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-purple-500`}
                  placeholder="+243 ..." />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Montant a retirer</label>
                <select value={payoutForm.percentage} onChange={e => setPayoutForm({ ...payoutForm, percentage: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-purple-500`}>
                  <option value={100}>100% &mdash; ${(commissionBalance * 1).toFixed(2)}</option>
                  <option value={75}>75% &mdash; ${(commissionBalance * 0.75).toFixed(2)}</option>
                  <option value={50}>50% &mdash; ${(commissionBalance * 0.50).toFixed(2)}</option>
                  <option value={25}>25% &mdash; ${(commissionBalance * 0.25).toFixed(2)}</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Devise</label>
                <select value={payoutForm.currency} onChange={e => setPayoutForm({ ...payoutForm, currency: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-purple-500`}>
                  <option value="USD">USD ($)</option>
                  <option value="CDF">Franc Congolais (FC)</option>
                </select>
              </div>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Montant demande : <span className="text-purple-500 font-bold">
                    {payoutForm.currency === 'CDF'
                      ? `${Math.round(commissionBalance * (payoutForm.percentage / 100) * exchangeRate).toLocaleString('fr-FR')} FC`
                      : `$${(commissionBalance * (payoutForm.percentage / 100)).toFixed(2)}`
                    }
                  </span>
                </p>
              </div>
              <button onClick={handlePayoutRequest} disabled={payoutLoading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                {payoutLoading ? 'Envoi...' : 'Soumettre la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluencerDashboard;

