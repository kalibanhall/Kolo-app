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
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [drawing, setDrawing] = useState(false);
  
  // Draw process states - 2 steps
  const [drawStep, setDrawStep] = useState(1); // 1: Config, 2: Confirm
  const [drawMethod, setDrawMethod] = useState('automatic');
  const [bonusWinnersCount, setBonusWinnersCount] = useState(3);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

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

  const generateCode = () => String(Math.floor(1000 + Math.random() * 9000));

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
    setShowDrawModal(true);
    setDrawStep(1);
    setDrawMethod('automatic');
    setBonusWinnersCount(3);
    setConfirmationCode('');
    setGeneratedCode(generateCode());
  };

  const closeDrawModal = () => {
    setShowDrawModal(false);
    setSelectedCampaign(null);
    setDrawStep(1);
  };

  const openResultModal = (draw) => {
    setSelectedDraw(draw);
    setShowResultModal(true);
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setSelectedDraw(null);
  };

  const handleDraw = async () => {
    if (!selectedCampaign) return;

    if (confirmationCode !== generatedCode) {
      setError('Code de confirmation incorrect');
      return;
    }

    setDrawing(true);
    setError('');
    
    try {
      await adminAPI.performDraw({
        campaign_id: selectedCampaign.id,
        bonus_winners_count: parseInt(bonusWinnersCount),
        draw_method: drawMethod
      });
      
      setSuccess(`Tirage effectué avec succès pour "${selectedCampaign.title}"`);
      closeDrawModal();
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tirages</h1>
          <p className="text-gray-500 text-sm mt-1">Lancez les tirages pour les campagnes clôturées</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold">×</button>
          </div>
        )}
        
        {success && (
          <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-teal-700 hover:text-teal-900 font-bold">×</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Campagnes</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{campaigns.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">En cours</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">
              {campaigns.filter(c => c.status === 'open').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Prêtes</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">
              {campaigns.filter(c => c.status === 'closed' && !draws.some(d => d.campaign_id === c.id)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tirages</p>
            <p className="text-2xl font-semibold text-teal-600 mt-1">{draws.length}</p>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Campagnes</h2>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium transition-colors text-gray-600"
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
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Campagne</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Prix</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tickets</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {campaigns.map((campaign) => {
                    const drawStatus = getCampaignDrawStatus(campaign);
                    const draw = getDrawForCampaign(campaign.id);
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{campaign.title}</div>
                          <div className="text-xs text-gray-400">#{campaign.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{campaign.main_prize}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium text-gray-900">{campaign.sold_tickets || 0}</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-gray-500">{campaign.total_tickets}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                            drawStatus.status === 'drawn' ? 'bg-teal-50 text-teal-700' :
                            drawStatus.status === 'ready' ? 'bg-amber-50 text-amber-700' :
                            drawStatus.status === 'open' ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {drawStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {drawStatus.status === 'drawn' ? (
                            <button
                              onClick={() => openResultModal(draw)}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-medium transition-colors text-sm border border-teal-100"
                            >
                              Voir résultat
                            </button>
                          ) : drawStatus.canDraw ? (
                            <button
                              onClick={() => openDrawModal(campaign)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors text-sm"
                            >
                              Lancer le tirage
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">En attente</span>
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

        {/* Résultats des tirages - Cards */}
        {draws.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résultats des Tirages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draws.map((draw) => (
                <div 
                  key={draw.id} 
                  onClick={() => openResultModal(draw)}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-white">
                    <h3 className="font-semibold truncate">{draw.campaign_title}</h3>
                    <p className="text-teal-100 text-xs mt-0.5">
                      {new Date(draw.draw_date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="p-4">
                    {/* Main Winner */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold text-sm">1er</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{draw.winner_name}</p>
                        <p className="text-xs text-gray-500 font-mono">#{draw.winning_ticket}</p>
                      </div>
                    </div>

                    {/* Bonus Winners Count */}
                    {(draw.bonus_winners?.length > 0 || draw.bonus_winners_count > 0) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        <span>+{draw.bonus_winners?.length || draw.bonus_winners_count} gagnant(s) bonus</span>
                      </div>
                    )}

                    <p className="text-center text-xs text-gray-400 mt-3">
                      Cliquez pour voir les détails
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Tirage - 2 étapes compact */}
        {showDrawModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-white rounded-t-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Lancer le Tirage</h3>
                    <p className="text-teal-100 text-sm truncate">{selectedCampaign.title}</p>
                  </div>
                  <button onClick={closeDrawModal} className="text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
                </div>
                
                {/* Steps indicator */}
                <div className="flex items-center gap-2 mt-4">
                  <div className={`flex-1 h-1 rounded-full ${drawStep >= 1 ? 'bg-white' : 'bg-white/30'}`} />
                  <div className={`flex-1 h-1 rounded-full ${drawStep >= 2 ? 'bg-white' : 'bg-white/30'}`} />
                </div>
                <div className="flex justify-between text-xs mt-1.5 text-teal-100">
                  <span>Configuration</span>
                  <span>Confirmation</span>
                </div>
              </div>
              
              <div className="p-5">
                {/* Step 1: Configuration */}
                {drawStep === 1 && (
                  <div className="space-y-4">
                    {/* Campaign Info */}
                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Prix Principal</p>
                        <p className="font-medium text-gray-900 mt-0.5">{selectedCampaign.main_prize}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Tickets Vendus</p>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {selectedCampaign.sold_tickets || 0} / {selectedCampaign.total_tickets}
                        </p>
                      </div>
                    </div>

                    {/* Draw Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tirage du Gagnant Principal
                      </label>
                      <select
                        value={drawMethod}
                        onChange={(e) => setDrawMethod(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                      >
                        <option value="automatic">Automatique (aléatoire)</option>
                        <option value="manual">Manuel (sélection)</option>
                      </select>
                    </div>

                    {/* Bonus Winners */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tirage des Gagnants Bonus
                      </label>
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={bonusWinnersCount}
                          onChange={(e) => setBonusWinnersCount(e.target.value)}
                          className="flex-1 accent-teal-600"
                        />
                        <span className="w-10 h-10 bg-teal-600 text-white rounded-lg flex items-center justify-center font-semibold">
                          {bonusWinnersCount}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setDrawStep(2)}
                      disabled={(selectedCampaign.sold_tickets || 0) === 0}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        (selectedCampaign.sold_tickets || 0) === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      Continuer
                    </button>

                    {(selectedCampaign.sold_tickets || 0) === 0 && (
                      <p className="text-center text-red-500 text-xs">Aucun ticket vendu</p>
                    )}
                  </div>
                )}

                {/* Step 2: Confirmation */}
                {drawStep === 2 && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <p className="text-amber-800 font-medium">Action irréversible</p>
                      <p className="text-amber-600 text-sm mt-0.5">Le tirage ne peut pas être annulé</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Récapitulatif</p>
                      <div className="space-y-1.5 text-sm text-gray-600">
                        <p><span className="text-gray-400">Campagne :</span> {selectedCampaign.title}</p>
                        <p><span className="text-gray-400">Gagnants :</span> 1 principal + {bonusWinnersCount} bonus</p>
                        <p><span className="text-gray-400">Méthode :</span> {drawMethod === 'automatic' ? 'Aléatoire' : 'Manuelle'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-center text-sm text-gray-600 mb-2">
                        Entrez le code pour confirmer
                      </p>
                      <p className="text-center text-2xl font-mono font-bold text-teal-600 tracking-widest mb-3">
                        {generatedCode}
                      </p>
                      <input
                        type="text"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="____"
                        maxLength="4"
                        className="w-full px-4 py-3 text-center text-xl font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setDrawStep(1)}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                      >
                        Retour
                      </button>
                      <button
                        onClick={handleDraw}
                        disabled={drawing || confirmationCode !== generatedCode}
                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                          drawing || confirmationCode !== generatedCode
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        {drawing ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Tirage...
                          </span>
                        ) : (
                          'Lancer le tirage'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Résultat Détaillé */}
        {showResultModal && selectedDraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-white rounded-t-xl sticky top-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Résultat du Tirage</h3>
                    <p className="text-teal-100 text-sm">{selectedDraw.campaign_title}</p>
                    <p className="text-teal-200/70 text-xs mt-1">
                      {new Date(selectedDraw.draw_date).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button onClick={closeResultModal} className="text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">×</button>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* Main Winner - Grand Prix */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-700 font-bold">1er</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Gagnant Principal
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-amber-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{selectedDraw.winner_name}</p>
                        <p className="text-sm text-gray-500">{selectedDraw.winner_email}</p>
                        {selectedDraw.winner_phone && (
                          <p className="text-sm text-gray-400 mt-0.5">{selectedDraw.winner_phone}</p>
                        )}
                      </div>
                      <span className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg font-mono font-medium text-sm border border-teal-100">
                        #{selectedDraw.winning_ticket}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Prix remporté</p>
                      <p className="text-lg font-semibold text-gray-900 mt-0.5">{selectedDraw.main_prize}</p>
                    </div>
                  </div>
                </div>

                {/* Bonus Winners */}
                {selectedDraw.bonus_winners && selectedDraw.bonus_winners.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">
                        Gagnants Bonus ({selectedDraw.bonus_winners.length})
                      </span>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {selectedDraw.bonus_winners.map((bw, index) => (
                        <div 
                          key={bw.id || index} 
                          className="p-4 flex items-center justify-between hover:bg-gray-50/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-medium text-sm">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{bw.user_name}</p>
                              <p className="text-xs text-gray-500">{bw.user_email}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded font-mono text-xs">
                            #{bw.ticket_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No bonus winners */}
                {(!selectedDraw.bonus_winners || selectedDraw.bonus_winners.length === 0) && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                    Aucun gagnant bonus pour ce tirage
                  </div>
                )}

                {/* Draw Info */}
                <div className="flex justify-between text-xs text-gray-400 px-1">
                  <span>ID: #{selectedDraw.id}</span>
                  <span>{selectedDraw.draw_method === 'manual_selection' ? 'Tirage manuel' : 'Tirage automatique'}</span>
                </div>

                <button
                  onClick={closeResultModal}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DrawManagementPage;
