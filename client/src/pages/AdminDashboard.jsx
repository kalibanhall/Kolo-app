import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { StatCard } from '../components/StatCard';
import { adminAPI, campaignsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { TicketIcon, UsersIcon, MoneyIcon, TargetIcon, TrophyIcon, ChartIcon, CampaignIcon } from '../components/Icons';
import {
  RevenueChart,
  ParticipantsChart,
  CampaignStatusChart,
  SalesTrendChart,
  TopCampaignsChart,
  PaymentMethodsChart,
} from '../components/DashboardCharts';
import { LocationStats } from '../components/LocationStats';

// Composant pour la gestion du taux de conversion
const ExchangeRateManager = () => {
  const [rate, setRate] = useState('2850');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      if (response.success && response.data?.exchange_rate_usd_cdf) {
        setRate(response.data.exchange_rate_usd_cdf.value);
      }
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      setMessage({ type: 'error', text: 'Veuillez entrer un nombre positif valide' });
      return;
    }

    try {
      setSaving(true);
      await adminAPI.updateExchangeRate(numRate);
      setMessage({ type: 'success', text: 'Taux de conversion mis à jour avec succès!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Taux de conversion USD → CDF
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            1 USD = X CDF
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-2 font-medium">$1 =</span>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              step="1"
              placeholder="2850"
            />
            <span className="text-gray-500 ml-2 font-medium">FC</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ce taux est utilisé pour convertir les prix en Francs Congolais
          </p>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              saving
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </span>
            ) : (
              'Mettre à jour'
            )}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Aperçu :</strong> Un ticket à <strong>$2.00</strong> sera affiché à{' '}
          <strong>{(parseFloat(rate) * 2 || 0).toLocaleString()} FC</strong>
        </p>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    revenue: [],
    participants: [],
    campaignStatus: [],
    salesTrend: [],
    topCampaigns: [],
    paymentMethods: [],
  });

  useEffect(() => {
    loadStats();
    loadAnalytics();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await adminAPI.getAnalytics();
      if (response.success && response.data) {
        setChartData({
          revenue: response.data.revenue || [],
          participants: response.data.participants || [],
          campaignStatus: response.data.campaignStatus || [],
          salesTrend: response.data.salesTrend || [],
          topCampaigns: response.data.topCampaigns || [],
          paymentMethods: response.data.paymentMethods || [],
        });
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      // Keep default empty arrays if analytics fail
    }
  };

  const handleDraw = async () => {
    if (!confirm('Êtes-vous sûr de vouloir effectuer le tirage maintenant ?')) {
      return;
    }

    try {
      await adminAPI.performDraw(stats.campaign.id, 3);
      alert('Tirage effectué avec succès !');
      loadStats(); // Rafraîchir les stats
    } catch (err) {
      alert('Erreur lors du tirage : ' + err.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">Erreur : {error}</p>
            <button
              onClick={loadStats}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
          
          {/* Toujours afficher le gestionnaire de taux de change même en cas d'erreur */}
          <ExchangeRateManager />
        </div>
      </AdminLayout>
    );
  }

  const occupationRate = stats?.campaign?.total_tickets > 0
    ? ((stats.campaign.sold_tickets / stats.campaign.total_tickets) * 100).toFixed(1)
    : 0;

  return (
    <AdminLayout>
      {/* Stats Grid - Comme dans l'image */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Tickets achetés */}
        <StatCard
          title="Tickets achetés"
          value={stats?.campaign?.sold_tickets || 0}
          subtitle={`Sur ${stats?.campaign?.total_tickets || 0} disponibles (${occupationRate}%)`}
          icon={TicketIcon}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        {/* Participants */}
        <StatCard
          title="Participants"
          value={stats?.participants_count || 0}
          subtitle="Participants uniques"
          icon={UsersIcon}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        {/* Recettes totales */}
        <StatCard
          title="Recettes campagne"
          value={`$${(parseFloat(stats?.total_revenue) || 0).toFixed(2)}`}
          subtitle={stats?.completed_payments ? `${stats.completed_payments} paiement(s) validé(s)` : 'Aucun paiement validé'}
          icon={MoneyIcon}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
        />

        {/* Tirage effectué ? */}
        <StatCard
          title="Tirage effectué ?"
          value={
            <span className={stats?.draw_completed ? 'text-green-600' : 'text-red-600'}>
              {stats?.draw_completed ? 'Oui' : 'Non'}
            </span>
          }
          subtitle="Statut du tirage"
          icon={TargetIcon}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />

        {/* Gagnants bonus */}
        <StatCard
          title="Gagnants bonus"
          value={`${stats?.bonus_winners || 0} / 3`}
          subtitle="Lots bonus attribués"
          icon={TrophyIcon}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />

        {/* Taux d'occupation */}
        <StatCard
          title="Taux d'occupation"
          value={`${occupationRate}%`}
          subtitle=""
          icon={ChartIcon}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
        />
      </div>

      {/* Actions rapides - Comme dans l'image */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/draws"
            className="flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
          >
            <TargetIcon className="w-5 h-5" />
            <span>Gestion des tirages</span>
          </Link>

          <Link
            to="/admin/participants"
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
          >
            <UsersIcon className="w-5 h-5" />
            <span>Voir les participants</span>
          </Link>

          <Link
            to="/admin/campaigns"
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
          >
            <CampaignIcon className="w-5 h-5" />
            <span>Gérer les campagnes</span>
          </Link>
        </div>
      </div>

      {/* Exchange Rate Manager */}
      <div className="mt-6">
        <ExchangeRateManager />
      </div>

      {/* Informations de la campagne */}
      {stats?.campaign && (
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Campagne actuelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Titre</p>
              <p className="font-semibold text-gray-900">{stats.campaign.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Statut</p>
              <p className="font-semibold">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  stats.campaign.status === 'open' ? 'bg-green-100 text-green-700' :
                  stats.campaign.status === 'closed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {stats.campaign.status === 'open' ? 'Ouvert' :
                   stats.campaign.status === 'closed' ? 'Fermé' : 'Brouillon'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Prix du ticket</p>
              <p className="font-semibold text-gray-900">${stats.campaign.ticket_price}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Prix principal</p>
              <p className="font-semibold text-gray-900">{stats.campaign.main_prize}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section with Charts */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics et Statistiques</h2>
        
        {/* Row 1: Revenue and Participants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RevenueChart data={chartData.revenue} />
          <ParticipantsChart data={chartData.participants} />
        </div>

        {/* Row 2: Campaign Status and Sales Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CampaignStatusChart data={chartData.campaignStatus} />
          <SalesTrendChart data={chartData.salesTrend} />
        </div>

        {/* Row 3: Top Campaigns and Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TopCampaignsChart data={chartData.topCampaigns} />
          <PaymentMethodsChart data={chartData.paymentMethods} />
        </div>

        {/* Row 4: Location Stats */}
        <div className="grid grid-cols-1 gap-6">
          <LocationStats />
        </div>
      </div>
    </AdminLayout>
  );
};
