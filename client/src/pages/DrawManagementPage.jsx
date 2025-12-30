import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { AdminLayout } from '../components/AdminLayout';

const DrawManagementPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [drawMethod, setDrawMethod] = useState('automatic');
  const [bonusWinners, setBonusWinners] = useState(3);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [campaignsRes, drawsRes] = await Promise.all([
        adminAPI.getCampaigns(),
        adminAPI.getDraws()
      ]);
      
      const campaignsList = campaignsRes.campaigns || campaignsRes.data || campaignsRes || [];
      setCampaigns(Array.isArray(campaignsList) ? campaignsList : []);
      setDraws(Array.isArray(drawsRes) ? drawsRes : (drawsRes.data || []));
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Générer un ID de transaction unique (16 caractères alphanumériques)
  const generateTransactionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let transactionId = '';
    for (let i = 0; i < 16; i++) {
      transactionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return transactionId;
  };

  const getCampaignDrawStatus = (campaign) => {
    const hasDraw = draws.some(d => d.campaign_id === campaign.id);
    if (hasDraw) {
      return { status: 'drawn', label: 'Tirage effectué', canDraw: false };
    }
    if (campaign.status === 'closed') {
      return { status: 'ready', label: 'Prêt pour tirage', canDraw: true };
    }
    if (campaign.status === 'open') {
      return { status: 'open', label: 'En cours', canDraw: false };
    }
    return { status: campaign.status, label: campaign.status, canDraw: false };
  };

  const openDrawModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
    setDrawMethod('automatic');
    setBonusWinners(3);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCampaign(null);
  };

  const handleDraw = async () => {
    if (!selectedCampaign) return;

    const transactionId = generateTransactionId();
    
    if (!window.confirm(`Voulez-vous vraiment effectuer le tirage pour "${selectedCampaign.title}" ?\n\nID Transaction: ${transactionId}`)) {
      return;
    }

    setDrawing(true);
    setError('');
    
    try {
      await adminAPI.performDraw({
        campaign_id: selectedCampaign.id,
        bonus_winners_count: parseInt(bonusWinners),
        draw_method: drawMethod,
        transaction_id: transactionId
      });
      
      setSuccess(`Tirage effectué avec succès !\nID Transaction: ${transactionId}`);
      closeModal();
      await loadData();
      
      setTimeout(() => setSuccess(''), 8000);
    } catch (err) {
      console.error('Error during draw:', err);
      setError(err.message || 'Erreur lors du tirage');
    } finally {
      setDrawing(false);
    }
  };

  const getDrawForCampaign = (campaignId) => {
    return draws.find(d => d.campaign_id === campaignId);
  };

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Tirages</h1>
          <p className="text-gray-600 mt-1">Lancez les tirages pour les campagnes clôturées</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 text-xl font-bold">×</button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span className="whitespace-pre-line">{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900 text-xl font-bold">×</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Campagnes</p>
            <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">En cours</p>
            <p className="text-2xl font-bold text-blue-600">
              {campaigns.filter(c => c.status === 'open').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Prêtes pour tirage</p>
            <p className="text-2xl font-bold text-yellow-600">
              {campaigns.filter(c => c.status === 'closed' && !draws.some(d => d.campaign_id === c.id)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Tirages effectués</p>
            <p className="text-2xl font-bold text-green-600">{draws.length}</p>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Liste des Campagnes</h2>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Actualiser
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune campagne trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campagne</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Principal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => {
                    const drawStatus = getCampaignDrawStatus(campaign);
                    const draw = getDrawForCampaign(campaign.id);
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-500">#{campaign.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{campaign.title}</div>
                          <div className="text-sm text-gray-500">
                            {campaign.description?.substring(0, 50)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          {campaign.main_prize}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{campaign.sold_tickets || 0}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-500">{campaign.total_tickets}</span>
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, ((campaign.sold_tickets || 0) / campaign.total_tickets) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            drawStatus.status === 'drawn' ? 'bg-green-100 text-green-800' :
                            drawStatus.status === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                            drawStatus.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {drawStatus.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {drawStatus.status === 'drawn' ? (
                            <div className="text-sm">
                              <p className="text-green-600 font-medium">✓ Tirage effectué</p>
                              <p className="text-gray-500 text-xs">
                                Gagnant: {draw?.winner_name || 'N/A'}
                              </p>
                              <p className="text-gray-400 text-xs font-mono">
                                Ticket: {draw?.winning_ticket || 'N/A'}
                              </p>
                            </div>
                          ) : drawStatus.canDraw ? (
                            <button
                              onClick={() => openDrawModal(campaign)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
                            >
                              🎲 Lancer le tirage
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <button
                                disabled
                                className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed text-sm"
                              >
                                🎲 Lancer le tirage
                              </button>
                              <span className="text-xs text-gray-400">
                                Clôturez la campagne d'abord
                              </span>
                            </div>
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

        {/* Résultats des tirages */}
        {draws.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Résultats des Tirages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {draws.map((draw) => (
                <div key={draw.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                    <h3 className="text-xl font-bold">{draw.campaign_title}</h3>
                    <p className="text-indigo-200 text-sm">
                      Tirage effectué le {new Date(draw.draw_date).toLocaleDateString('fr-FR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase mb-1">Gagnant Principal</p>
                      <p className="text-lg font-bold text-gray-900">{draw.winner_name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{draw.winner_email || 'N/A'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Ticket:</span>
                        <span className="font-mono text-indigo-600 font-bold">{draw.winning_ticket}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Prix:</span>
                        <span className="font-semibold text-green-600">{draw.main_prize}</span>
                      </div>
                    </div>
                    {draw.bonus_winners_count > 0 && (
                      <div className="mt-3 text-sm text-gray-600">
                        + {draw.bonus_winners_count} gagnant(s) bonus
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Tirage */}
        {showModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">Lancer le Tirage</h3>
                    <p className="text-indigo-200 mt-1">{selectedCampaign.title}</p>
                  </div>
                  <button onClick={closeModal} className="text-white/80 hover:text-white text-2xl font-bold">×</button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Infos campagne */}
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Prix Principal</p>
                    <p className="font-bold text-gray-900">{selectedCampaign.main_prize}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Tickets Vendus</p>
                    <p className="font-bold text-gray-900">
                      {selectedCampaign.sold_tickets || 0} / {selectedCampaign.total_tickets}
                    </p>
                  </div>
                </div>

                {/* ID Transaction Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-600 uppercase mb-1">ID Transaction (prévisualisation)</p>
                  <p className="font-mono text-lg text-blue-800">{generateTransactionId()}</p>
                  <p className="text-xs text-blue-500 mt-1">Un nouvel ID sera généré lors du tirage</p>
                </div>

                {/* Méthode de tirage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Méthode de tirage
                  </label>
                  <select
                    value={drawMethod}
                    onChange={(e) => setDrawMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="automatic">Automatique (aléatoire)</option>
                    <option value="manual">Manuel (sélection)</option>
                  </select>
                </div>

                {/* Gagnants bonus */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de gagnants bonus
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={bonusWinners}
                    onChange={(e) => setBonusWinners(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDraw}
                    disabled={drawing || (selectedCampaign.sold_tickets || 0) === 0}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                      drawing || (selectedCampaign.sold_tickets || 0) === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {drawing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Tirage en cours...
                      </span>
                    ) : (
                      '🎲 Lancer le tirage'
                    )}
                  </button>
                </div>

                {(selectedCampaign.sold_tickets || 0) === 0 && (
                  <p className="text-center text-red-500 text-sm">
                    Impossible de lancer le tirage : aucun ticket vendu
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DrawManagementPage;
