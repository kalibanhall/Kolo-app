import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ticketsAPI, campaignsAPI, walletAPI } from '../services/api';
import { LogoKoloFull } from '../components/LogoKolo';
import { MoneyIcon } from '../components/Icons';

export const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les tickets de l'utilisateur
      const ticketsResponse = await ticketsAPI.getUserTickets(user.id);
      // Backend returns { success: true, data: [...tickets] }
      setTickets(ticketsResponse.data || ticketsResponse.tickets || []);

      // Charger la campagne active
      const campaignResponse = await campaignsAPI.getCurrent();
      setCampaign(campaignResponse.data);

      // Charger le portefeuille
      const walletResponse = await walletAPI.getWallet();
      setWallet(walletResponse.data?.wallet);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <LogoKoloFull size="small" darkMode={false} />
            
            <div className="flex items-center space-x-4">
              <Link
                to="/wallet"
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <MoneyIcon className="w-4 h-4" />
                {wallet ? formatCurrency(wallet.balance) : '0 FC'}
              </Link>
              <Link
                to="/profile"
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
              >
                Mon Profil
              </Link>
              <div className="text-right">
                <p className="text-sm text-gray-600">Bienvenue,</p>
                <p className="font-semibold text-gray-900">{user.name}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Mes tickets</p>
                <p className="text-3xl font-bold text-blue-600">{tickets.length}</p>
              </div>
              <span className="text-lg font-bold text-blue-600">T</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Prix du ticket</p>
                <p className="text-3xl font-bold text-green-600">
                  ${campaign?.ticket_price || 1}
                </p>
              </div>
              <span className="text-lg font-bold text-green-600">$</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total dépensé</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${(tickets.length * (campaign?.ticket_price || 1)).toFixed(2)}
                </p>
              </div>
              <span className="text-lg font-bold text-purple-600">$</span>
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        {campaign && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
            <h2 className="text-3xl font-bold mb-4">{campaign.title}</h2>
            <p className="text-blue-100 mb-4">{campaign.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-blue-200 text-sm mb-1">Prix principal</p>
                <p className="font-bold text-lg">{campaign.main_prize}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-blue-200 text-sm mb-1">Tickets disponibles</p>
                <p className="font-bold text-lg">
                  {campaign.total_tickets - campaign.sold_tickets} / {campaign.total_tickets}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-blue-200 text-sm mb-1">Statut</p>
                <p className="font-bold text-lg">
                  {campaign.status === 'open' ? 'Ouvert' : 'Fermé'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My Tickets */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Mes tickets</h3>
            <Link
              to="/buy"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Acheter des tickets
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Vous n'avez pas encore de tickets</p>
              <Link
                to="/buy"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Acheter maintenant
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tickets.map((ticket) => {
                // Determine ticket status based on campaign status
                const campaignStatus = ticket.campaign_status;
                const isWinner = ticket.is_winner || ticket.prize_category === 'main';
                const isBonus = ticket.prize_category === 'bonus';
                const isDrawingDone = campaignStatus === 'completed' || campaignStatus === 'drawn';
                const isSalesClosed = campaignStatus === 'closed';
                const isLost = isDrawingDone && !isWinner && !isBonus;
                const isWaitingForDraw = isSalesClosed && !isDrawingDone;
                const isActive = campaignStatus === 'open';
                
                // Determine display status
                let statusLabel, statusColor, bgClass, borderClass, badgeClass;
                
                if (isWinner) {
                  statusLabel = 'Gagnant 🏆';
                  statusColor = 'text-yellow-600';
                  bgClass = 'bg-yellow-50';
                  borderClass = 'border-yellow-400';
                  badgeClass = 'bg-yellow-400 text-yellow-900';
                } else if (isBonus) {
                  statusLabel = 'Bonus 🎁';
                  statusColor = 'text-purple-600';
                  bgClass = 'bg-purple-50';
                  borderClass = 'border-purple-400';
                  badgeClass = 'bg-purple-400 text-purple-900';
                } else if (isLost) {
                  statusLabel = 'Perdu';
                  statusColor = 'text-gray-500';
                  bgClass = 'bg-gray-100';
                  borderClass = 'border-gray-300';
                  badgeClass = 'bg-gray-400 text-white';
                } else if (isWaitingForDraw) {
                  statusLabel = 'En attente du tirage';
                  statusColor = 'text-orange-600';
                  bgClass = 'bg-orange-50';
                  borderClass = 'border-orange-300';
                  badgeClass = 'bg-orange-400 text-white';
                } else {
                  // Active (campaign still open)
                  statusLabel = 'Actif';
                  statusColor = 'text-green-600';
                  bgClass = 'bg-gray-50';
                  borderClass = 'border-gray-200 hover:border-blue-400';
                  badgeClass = 'bg-green-400 text-white';
                }
                
                return (
                  <div
                    key={ticket.id}
                    className={`relative p-4 rounded-lg border-2 text-center transition-all ${bgClass} ${borderClass} ${(isWinner || isBonus) ? 'shadow-lg' : ''}`}
                  >
                    {isWinner && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        ★
                      </div>
                    )}
                    {isLost && (
                      <div className="absolute -top-2 -right-2 bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✗
                      </div>
                    )}
                    {isWaitingForDraw && (
                      <div className="absolute -top-2 -right-2 bg-orange-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ⏳
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mb-1">Ticket</p>
                    <p className={`text-lg font-bold ${isLost ? 'text-gray-400' : 'text-gray-900'}`}>{ticket.ticket_number}</p>
                    <p className={`text-xs mt-1 font-medium ${statusColor}`}>
                      {statusLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
