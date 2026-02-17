import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { influencerAPI } from '../services/api';
import { LogoKolo } from '../components/LogoKolo';

const InfluencerDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await influencerAPI.getDashboard();
      setDashboard(response.data);
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
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const promoStats = dashboard?.promo_stats || [];
  const recentUses = dashboard?.recent_uses || [];
  const monthlyStats = dashboard?.monthly_stats || [];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Navigation */}
      <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-30 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoKolo size="small" />
            <div>
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                KOLO Influenceur
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Bienvenue, {user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
            <p className={`text-2xl font-bold text-purple-500`}>
              ${parseFloat(summary.total_commission || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Mes Codes Promo' },
              { id: 'recent', label: 'Utilisations Récentes' },
              { id: 'monthly', label: 'Statistiques Mensuelles' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Aucun code promo assigné
                </p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Contactez l'administrateur pour obtenir vos codes promo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promoStats.map((promo) => (
                  <div key={promo.code_id} className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <code className={`text-lg font-mono font-bold ${promo.is_active ? 'text-purple-500' : 'text-gray-400'}`}>
                            {promo.code}
                          </code>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {promo.discount_type === 'percentage' ? `${promo.discount_value}% de réduction` : `$${promo.discount_value} de réduction`}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {promo.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Utilisations</p>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {promo.total_uses || 0}
                          <span className={`text-xs font-normal ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            / {promo.max_uses || '∞'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Utilisateurs</p>
                        <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {promo.unique_users || 0}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ma commission ({promo.commission_rate || 0}%)</p>
                        <p className="text-lg font-bold text-purple-500">
                          ${parseFloat(promo.commission_earned || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Usage by month mini-chart */}
                    {promo.usage_by_month && Object.keys(promo.usage_by_month).length > 0 && (
                      <div className={`px-4 pb-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <p className={`text-xs font-semibold uppercase mt-3 mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Tendance
                        </p>
                        <div className="flex items-end gap-1 h-12">
                          {Object.entries(promo.usage_by_month).slice(-6).map(([month, count]) => {
                            const maxCount = Math.max(...Object.values(promo.usage_by_month));
                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div key={month} className="flex-1 flex flex-col items-center gap-0.5" title={`${month}: ${count}`}>
                                <div
                                  className="w-full bg-purple-500 rounded-t"
                                  style={{ height: `${Math.max(height, 4)}%` }}
                                />
                                <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                                  {month.split('-')[1]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Aucune utilisation récente
                </p>
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
                      <th className="px-4 py-3 text-right">Réduction</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {recentUses.map((use, idx) => (
                      <tr key={idx} className={`${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {new Date(use.used_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono text-purple-500">{use.code}</code>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {use.user_name || 'Anonyme'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          ${parseFloat(use.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-500 font-medium">
                          -${parseFloat(use.discount_applied || 0).toFixed(2)}
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
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Aucune donnée mensuelle disponible
                </p>
              </div>
            ) : (
              <>
                {/* Monthly Bar Chart */}
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <h3 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Évolution mensuelle
                  </h3>
                  <div className="flex items-end gap-3 h-40">
                    {monthlyStats.map((stat) => {
                      const maxRevenue = Math.max(...monthlyStats.map(s => parseFloat(s.revenue || 0)));
                      const height = maxRevenue > 0 ? (parseFloat(stat.revenue || 0) / maxRevenue) * 100 : 0;
                      const monthLabel = new Date(stat.month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
                      return (
                        <div key={stat.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ${parseFloat(stat.revenue || 0).toFixed(0)}
                          </span>
                          <div
                            className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {monthLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Details Table */}
                <div className={`rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`text-xs uppercase ${isDarkMode ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                          <th className="px-4 py-3 text-left">Mois</th>
                          <th className="px-4 py-3 text-right">Utilisations</th>
                          <th className="px-4 py-3 text-right">Utilisateurs</th>
                          <th className="px-4 py-3 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {monthlyStats.map((stat) => (
                          <tr key={stat.month} className={`${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                            <td className={`px-4 py-3 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {new Date(stat.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {stat.uses}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {stat.unique_users}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-purple-500 font-medium">
                              ${parseFloat(stat.commission || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={`font-bold ${isDarkMode ? 'bg-gray-750 text-white' : 'bg-gray-50 text-gray-900'}`}>
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {monthlyStats.reduce((acc, s) => acc + parseInt(s.uses || 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">—</td>
                          <td className="px-4 py-3 text-sm text-right text-purple-500">
                            ${monthlyStats.reduce((acc, s) => acc + parseFloat(s.commission || 0), 0).toFixed(2)}
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
      </main>

      {/* Footer */}
      <footer className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        © {new Date().getFullYear()} KOLO — Espace Influenceur
      </footer>
    </div>
  );
};

export default InfluencerDashboard;
