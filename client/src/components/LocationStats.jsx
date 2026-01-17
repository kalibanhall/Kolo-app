import React, { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Composant d'affichage des statistiques de localisation
 * Pour le dashboard administrateur
 */
export const LocationStats = ({ compact = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('city'); // 'city' ou 'province'

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/location/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching location stats:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <p className="text-red-500 text-sm">{error}</p>
        <button 
          onClick={fetchStats}
          className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Couleurs pour le graphique
  const colors = [
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-blue-500',
    'bg-cyan-500', 'bg-teal-500', 'bg-green-500', 'bg-yellow-500',
    'bg-orange-500', 'bg-red-500'
  ];

  const dataToShow = view === 'city' ? stats.by_city : stats.by_province;
  const maxValue = Math.max(...dataToShow.map(item => item.user_count));

  if (compact) {
    // Version compacte pour le dashboard
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Répartition géographique
          </h3>
          <span className="text-xs text-gray-500">{stats.summary.cities_count} villes</span>
        </div>
        
        {/* Top 5 villes */}
        <div className="space-y-2">
          {stats.by_city.slice(0, 5).map((item, index) => (
            <div key={item.city} className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${colors[index]} mr-2`}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
                {item.city}
              </span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {item.user_count}
              </span>
              <span className="text-xs text-gray-400 ml-1">
                ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Version complète
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Statistiques de Localisation
          </h2>
          
          {/* Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('city')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                view === 'city'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Par Ville
            </button>
            <button
              onClick={() => setView('province')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                view === 'province'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Par Province
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.summary.total_users.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Utilisateurs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.summary.total_tickets_sold.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Tickets vendus</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.summary.cities_count}
            </p>
            <p className="text-xs text-gray-500">Villes</p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="p-6">
        <div className="space-y-3">
          {dataToShow.slice(0, 10).map((item, index) => {
            const width = (item.user_count / maxValue) * 100;
            const label = view === 'city' ? item.city : item.province;
            
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {item.user_count} ({view === 'city' ? item.percentage : ((item.user_count / stats.summary.total_users) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {dataToShow.length > 10 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            +{dataToShow.length - 10} autres {view === 'city' ? 'villes' : 'provinces'}
          </p>
        )}
      </div>

      {/* Tickets by City */}
      {stats.tickets_by_city && stats.tickets_by_city.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Ventes par Ville (Top 5)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats.tickets_by_city.slice(0, 5).map((item, index) => (
              <div
                key={item.city}
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.city}</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {item.tickets_sold}
                </p>
                <p className="text-xs text-gray-500">${item.total_revenue.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Growth */}
      {stats.recent_growth && stats.recent_growth.length > 0 && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Croissance (30 derniers jours)
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.recent_growth.slice(0, 8).map((item, index) => (
              <div
                key={item.city}
                className="inline-flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs"
              >
                <span className="font-medium">{item.city}</span>
                <span className="ml-2 bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                  +{item.new_users}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationStats;
