import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { AdminLayout } from '../components/AdminLayout';

const DrawResultsPage = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [draws, setDraws] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [bonusWinners, setBonusWinners] = useState(3);
  const [drawMethod, setDrawMethod] = useState('automatic');
  const [manualTicketNumber, setManualTicketNumber] = useState('');
  const [drawing, setDrawing] = useState(false);
  
  // Available tickets for manual selection
  const [availableTickets, setAvailableTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadDraws(), loadCampaigns()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadDraws = async () => {
    try {
      const data = await adminAPI.getDraws();
      setDraws(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading draws:', err);
      setDraws([]);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await adminAPI.getCampaigns();
      const campaignsList = response.campaigns || response.data || response || [];
      setAllCampaigns(Array.isArray(campaignsList) ? campaignsList : []);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setAllCampaigns([]);
    }
  };

  const loadCampaignTickets = useCallback(async (campaignId) => {
    if (!campaignId) return;
    
    setLoadingTickets(true);
    try {
      const response = await adminAPI.getCampaignTickets(campaignId);
      const tickets = response.tickets || response.data || response || [];
      setAvailableTickets(Array.isArray(tickets) ? tickets : []);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setAvailableTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const openDrawModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
    setDrawMethod('automatic');
    setManualTicketNumber('');
    setBonusWinners(3);
    setTicketSearchTerm('');
    loadCampaignTickets(campaign.id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCampaign(null);
    setManualTicketNumber('');
    setAvailableTickets([]);
    setTicketSearchTerm('');
  };

  const handleDraw = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    if (drawMethod === 'manual' && !manualTicketNumber.trim()) {
      setError('Veuillez sélectionner un numéro de ticket pour le tirage manuel');
      return;
    }

    const confirmMessage = drawMethod === 'manual' 
      ? `Voulez-vous vraiment effectuer un tirage MANUEL avec le ticket ${manualTicketNumber} ?`
      : `Voulez-vous vraiment effectuer un tirage AUTOMATIQUE pour la campagne "${selectedCampaign.title}" ?`;
    
    if (!window.confirm(confirmMessage)) return;

    setDrawing(true);
    setError('');
    
    try {
      const drawData = {
        campaign_id: selectedCampaign.id,
        bonus_winners_count: parseInt(bonusWinners),
        draw_method: drawMethod
      };

      if (drawMethod === 'manual') {
        drawData.manual_ticket_number = manualTicketNumber.trim();
      }

      await adminAPI.performDraw(drawData);
      
      setSuccess(`Tirage effectué avec succès pour "${selectedCampaign.title}" !`);
      closeModal();
      await loadData();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error during draw:', err);
      setError(err.message || 'Erreur lors du tirage');
    } finally {
      setDrawing(false);
    }
  };

  const getCampaignStatus = (campaign) => {
    const hasDrawn = draws.some(draw => draw.campaign_id === campaign.id);
    if (hasDrawn) {
      return { label: 'Tirage effectué', color: 'bg-green-100 text-green-800', canDraw: false };
    }
    if (campaign.status === 'completed') {
      return { label: 'Terminée', color: 'bg-gray-100 text-gray-800', canDraw: false };
    }
    if (campaign.status === 'closed') {
      return { label: 'Fermée - Prêt pour tirage', color: 'bg-yellow-100 text-yellow-800', canDraw: true };
    }
    if (campaign.status === 'open') {
      // Allow draw even on open campaigns with tickets sold
      const hasTickets = (campaign.sold_tickets || 0) > 0;
      return { 
        label: 'En cours', 
        color: 'bg-blue-100 text-blue-800', 
        canDraw: hasTickets,
        warning: hasTickets ? 'Campagne encore ouverte' : null
      };
    }
    return { label: campaign.status, color: 'bg-gray-100 text-gray-800', canDraw: false };
  };

  const filteredCampaigns = allCampaigns.filter(campaign =>
    campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.main_prize?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTickets = availableTickets.filter(ticket =>
    ticket.ticket_number?.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
    ticket.user_name?.toLowerCase().includes(ticketSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Tirages</h1>
            <p className="text-gray-600 mt-1">Effectuez des tirages manuels ou automatiques</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">✕</button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Campagnes ({allCampaigns.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'results'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Résultats ({draws.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'campaigns' ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Rechercher une campagne..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Campaigns List */}
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune campagne</h3>
                <p className="text-gray-500">Créez d'abord une campagne pour pouvoir effectuer un tirage</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campagne</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Principal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets Vendus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCampaigns.map((campaign) => {
                      const status = getCampaignStatus(campaign);
                      return (
                        <tr key={campaign.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{campaign.title}</div>
                            <div className="text-sm text-gray-500">ID: {campaign.id}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{campaign.main_prize}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <span className="font-medium">{campaign.sold_tickets || 0}</span>
                              <span className="text-gray-500 mx-1">/</span>
                              <span className="text-gray-500">{campaign.total_tickets}</span>
                            </div>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, ((campaign.sold_tickets || 0) / campaign.total_tickets) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {status.canDraw ? (
                              <div className="flex flex-col items-start gap-1">
                                {status.warning && (
                                  <span className="text-xs text-orange-600 font-medium">{status.warning}</span>
                                )}
                                <button
                                  onClick={() => openDrawModal(campaign)}
                                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                                    status.warning 
                                      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                              >
                                Effectuer le tirage
                              </button>
                            </div>
                          ) : status.label === 'Tirage effectué' ? (
                            <button
                              onClick={() => setActiveTab('results')}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Voir résultat
                            </button>
                            ) : (campaign.sold_tickets || 0) === 0 ? (
                              <span className="text-gray-400 text-sm">Aucun ticket vendu</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Results Tab */
          <div>
            {draws.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun tirage effectué</h3>
                <p className="text-gray-600 mb-6">Effectuez votre premier tirage depuis l'onglet Campagnes</p>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  → Voir les campagnes
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {draws.map((draw) => (
                  <div key={draw.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold">{draw.campaign_title}</h3>
                          <p className="text-indigo-200 mt-1">
                            Tirage effectué le {new Date(draw.draw_date).toLocaleDateString('fr-FR', {
                              year: 'numeric', month: 'long', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          draw.draw_method === 'manual_selection' 
                            ? 'bg-yellow-400 text-yellow-900' 
                            : 'bg-green-400 text-green-900'
                        }`}>
                          {draw.draw_method === 'manual_selection' ? 'Manuel' : 'Automatique'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {/* Gagnant Principal */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 mb-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">Gagnant Principal</h4>
                            <p className="text-yellow-700 font-medium">{draw.main_prize}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase">Nom</p>
                            <p className="font-bold text-gray-900">{draw.winner_name || 'N/A'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase">Email</p>
                            <p className="font-semibold text-gray-900 text-sm">{draw.winner_email || 'N/A'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase">Ticket Gagnant</p>
                            <p className="font-bold text-indigo-600 text-lg">{draw.winning_ticket || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Gagnants Bonus */}
                      {draw.bonus_winners_count > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-bold text-gray-900">
                              {draw.bonus_winners_count} Gagnant(s) Bonus
                            </h5>
                          </div>
                          <p className="text-sm text-gray-600">
                            Des lots bonus ont été attribués à {draw.bonus_winners_count} participant(s) supplémentaire(s)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de Tirage */}
        {showModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">Effectuer un Tirage</h3>
                    <p className="text-indigo-200 mt-1">{selectedCampaign.title}</p>
                  </div>
                  <button onClick={closeModal} className="text-white/80 hover:text-white text-2xl">✕</button>
                </div>
              </div>
              
              <form onSubmit={handleDraw} className="p-6 space-y-6">
                {/* Infos Campagne */}
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Prix Principal</p>
                    <p className="font-bold text-gray-900">{selectedCampaign.main_prize}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Tickets Vendus</p>
                    <p className="font-bold text-gray-900">{selectedCampaign.sold_tickets || 0} / {selectedCampaign.total_tickets}</p>
                  </div>
                </div>

                {/* Méthode de Tirage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Méthode de tirage
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDrawMethod('automatic')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        drawMethod === 'automatic'
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-bold mb-2">A</div>
                      <div className="font-bold text-gray-900">Automatique</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Sélection aléatoire par le système
                      </p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setDrawMethod('manual')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        drawMethod === 'manual'
                          ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-bold mb-2">M</div>
                      <div className="font-bold text-gray-900">Manuel</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Choisir un ticket spécifique
                      </p>
                    </button>
                  </div>
                </div>

                {/* Sélection Manuelle de Ticket */}
                {drawMethod === 'manual' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sélectionner le ticket gagnant
                    </label>
                    
                    {/* Search tickets */}
                    <input
                      type="text"
                      placeholder="Rechercher par numéro ou nom..."
                      value={ticketSearchTerm}
                      onChange={(e) => setTicketSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                    
                    {loadingTickets ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto" />
                        <p className="text-sm text-gray-600 mt-2">Chargement des tickets...</p>
                      </div>
                    ) : filteredTickets.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        Aucun ticket trouvé
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredTickets.slice(0, 50).map((ticket) => (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => setManualTicketNumber(ticket.ticket_number)}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-left flex justify-between items-center ${
                              manualTicketNumber === ticket.ticket_number
                                ? 'border-yellow-500 bg-yellow-100'
                                : 'border-gray-200 bg-white hover:border-yellow-300'
                            }`}
                          >
                            <div>
                              <span className="font-mono font-bold text-indigo-600">{ticket.ticket_number}</span>
                              <span className="text-gray-500 ml-2">- {ticket.user_name || 'Utilisateur'}</span>
                            </div>
                            {manualTicketNumber === ticket.ticket_number && (
                              <span className="text-yellow-600">✓</span>
                            )}
                          </button>
                        ))}
                        {filteredTickets.length > 50 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            +{filteredTickets.length - 50} autres tickets...
                          </p>
                        )}
                      </div>
                    )}
                    
                    {manualTicketNumber && (
                      <div className="mt-3 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                        <p className="text-sm text-yellow-800">
                          <strong>Ticket sélectionné :</strong> {manualTicketNumber}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Gagnants Bonus */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de gagnants bonus (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={bonusWinners}
                    onChange={(e) => setBonusWinners(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Les gagnants bonus sont toujours sélectionnés automatiquement
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    disabled={drawing}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={drawing || (drawMethod === 'manual' && !manualTicketNumber)}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      drawMethod === 'manual'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {drawing ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin mr-2">...</span> Tirage en cours...
                      </span>
                    ) : (
                      'Lancer le tirage'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DrawResultsPage;
