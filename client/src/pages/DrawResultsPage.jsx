import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { CampaignIcon, TrophyIcon, CheckIcon } from '../components/Icons';

const DrawResultsPage = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [draws, setDraws] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [bonusWinners, setBonusWinners] = useState(3);
  const [drawMethod, setDrawMethod] = useState('automatic'); // 'automatic' or 'manual'
  const [manualTicketNumber, setManualTicketNumber] = useState('');
  const [drawing, setDrawing] = useState(false);

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
      setDraws(data);
    } catch (err) {
      console.error('Error loading draws:', err);
      throw err;
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await adminAPI.getCampaigns();
      console.log('Campaigns response:', response);
      // Handle both response.campaigns and response.data formats
      const campaignsList = response.campaigns || response.data || response || [];
      setAllCampaigns(campaignsList);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      throw err;
    }
  };

  const handleDraw = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    // Validation for manual draw
    if (drawMethod === 'manual' && !manualTicketNumber.trim()) {
      alert('Veuillez entrer un numéro de ticket pour le tirage manuel');
      return;
    }

    setDrawing(true);
    try {
      const drawData = {
        campaignId: parseInt(selectedCampaign),
        bonusWinners: parseInt(bonusWinners),
        drawMethod: drawMethod
      };

      // Add manual ticket number if manual draw
      if (drawMethod === 'manual') {
        drawData.manualTicketNumber = manualTicketNumber.trim();
      }

      await adminAPI.performDraw(drawData);
      
      alert('Tirage effectué avec succès !');
      setShowModal(false);
      setSelectedCampaign('');
      setBonusWinners(3);
      setDrawMethod('automatic');
      setManualTicketNumber('');
      
      // Reload data
      await loadData();
    } catch (err) {
      console.error('Error during draw:', err);
      alert(err.response?.data?.error || 'Erreur lors du tirage');
    } finally {
      setDrawing(false);
    }
  };

  // Helper function to determine campaign status
  const getCampaignStatus = (campaign) => {
    const hasDrawn = draws.some(draw => draw.campaign_id === campaign.id);
    if (hasDrawn) {
      return { label: 'Tirage effectué', color: 'bg-green-100 text-green-800', icon: CheckIcon };
    }
    if (campaign.status === 'closed') {
      return { label: 'Prêt pour tirage', color: 'bg-yellow-100 text-yellow-800', icon: null };
    }
    return { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: null };
  };

  // Filter campaigns by search term
  const filteredCampaigns = allCampaigns.filter(campaign =>
    campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.main_prize?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Tirages</h1>
          <p className="text-gray-600 mt-1">Gérez les tirages au sort et consultez les résultats</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          🎲 Nouveau Tirage
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
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
            <div className="flex items-center space-x-2">
              <CampaignIcon className="w-5 h-5" />
              <span>Campagnes ({allCampaigns.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'results'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <TrophyIcon className="w-5 h-5" />
              <span>Résultats ({draws.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' ? (
        <div>
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Rechercher une campagne..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Campaigns Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campagne
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    État du tirage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Aucune campagne trouvée' : 'Aucune campagne disponible'}
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const status = getCampaignStatus(campaign);
                    const hasDrawn = draws.some(draw => draw.campaign_id === campaign.id);
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                          <div className="text-sm text-gray-500">ID: {campaign.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{campaign.main_prize}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {campaign.sold_tickets || 0} / {campaign.total_tickets}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${((campaign.sold_tickets || 0) / campaign.total_tickets) * 100}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            campaign.status === 'open' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {campaign.status === 'open' ? 'Ouverte' :
                             campaign.status === 'closed' ? 'Fermée' : 'Annulée'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {hasDrawn ? (
                            <button
                              onClick={() => setActiveTab('results')}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              👁️ Voir résultat
                            </button>
                          ) : campaign.status === 'closed' ? (
                            <button
                              onClick={() => {
                                setSelectedCampaign(campaign.id.toString());
                                setShowModal(true);
                              }}
                              className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                            >
                              🎲 Tirer au sort
                            </button>
                          ) : (
                            <span className="text-gray-400">En attente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Results Tab */
        <div>
          {draws.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="text-6xl mb-4">🎲</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun tirage effectué</h3>
              <p className="text-gray-600 mb-6">Commencez par effectuer votre premier tirage</p>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                → Voir les campagnes disponibles
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {draws.map((draw) => (
                <div key={draw.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                    <h3 className="text-2xl font-bold">{draw.campaign_title}</h3>
                    <p className="text-indigo-100 mt-1">
                      Tirage effectué le {new Date(draw.draw_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="p-6">
                    {/* Main Winner */}
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">👑</span>
                        <h4 className="text-xl font-bold text-gray-900">Gagnant Principal</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Nom</p>
                          <p className="font-semibold text-gray-900">{draw.winner_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-semibold text-gray-900">{draw.winner_email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Ticket gagnant</p>
                          <p className="font-semibold text-indigo-600 text-lg">{draw.winning_ticket}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Prix</p>
                          <p className="font-semibold text-gray-900">{draw.main_prize}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bonus Winners */}
                    {draw.bonus_winners_count > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">🎁</span>
                          <h5 className="font-semibold text-gray-900">
                            Gagnants Bonus ({draw.bonus_winners_count})
                          </h5>
                        </div>
                        <p className="text-sm text-gray-600">
                          {draw.bonus_winners_count} gagnant(s) supplémentaire(s) ont été sélectionnés
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

      {/* Draw Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4">🎲 Effectuer un tirage</h3>
            
            <form onSubmit={handleDraw}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campagne
                </label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Sélectionnez une campagne</option>
                  {allCampaigns
                    .filter(c => c.status === 'closed' && !draws.some(d => d.campaign_id === c.id))
                    .map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title} ({campaign.sold_tickets} tickets achetés)
                      </option>
                    ))}
                </select>
              </div>

              {/* Draw Method Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de tirage
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="automatic"
                      checked={drawMethod === 'automatic'}
                      onChange={(e) => setDrawMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">🎲 Automatique</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="manual"
                      checked={drawMethod === 'manual'}
                      onChange={(e) => setDrawMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">✍️ Manuel</span>
                  </label>
                </div>
              </div>

              {/* Manual Ticket Number Input */}
              {drawMethod === 'manual' && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de ticket gagnant
                  </label>
                  <input
                    type="text"
                    value={manualTicketNumber}
                    onChange={(e) => setManualTicketNumber(e.target.value)}
                    placeholder="Ex: KOLO-001234"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500"
                    required={drawMethod === 'manual'}
                  />
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ Assurez-vous que le numéro de ticket existe et appartient à cette campagne
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de gagnants bonus (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={bonusWinners}
                  onChange={(e) => setBonusWinners(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  En plus du gagnant principal
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCampaign('');
                    setBonusWinners(3);
                    setDrawMethod('automatic');
                    setManualTicketNumber('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={drawing}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  disabled={drawing}
                >
                  {drawing ? 'Tirage en cours...' : '🎲 Lancer le tirage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawResultsPage;
