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
  const [confirmationStep, setConfirmationStep] = useState(1); // Double validation: 1 = first confirm, 2 = final confirm
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
    setConfirmationStep(1);
    setConfirmationCode('');
    // Generate a 4-digit confirmation code
    setGeneratedCode(String(Math.floor(1000 + Math.random() * 9000)));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCampaign(null);
    setConfirmationStep(1);
    setConfirmationCode('');
  };

  const handleFirstConfirm = () => {
    if (!window.confirm(`⚠️ PREMIÈRE VALIDATION\n\nVoulez-vous vraiment lancer le tirage pour:\n"${selectedCampaign.title}"\n\nCette action est IRRÉVERSIBLE.`)) {
      return;
    }
    setConfirmationStep(2);
  };

  const handleDraw = async () => {
    if (!selectedCampaign) return;

    // Verify confirmation code
    if (confirmationCode !== generatedCode) {
      setError('Code de confirmation incorrect');
      return;
    }

    const transactionId = generateTransactionId();
    
    if (!window.confirm(`⚠️ VALIDATION FINALE\n\nConfirmez le tirage pour "${selectedCampaign.title}"\n\nID Transaction: ${transactionId}\n\nCette action ne peut PAS être annulée !`)) {
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
                              <p className="text-green-600 font-medium">Tirage effectué</p>
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
                              Lancer le tirage
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <button
                                disabled
                                className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed text-sm"
                              >
                                Lancer le tirage
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 Résultats des Tirages</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {draws.map((draw) => (
                <div key={draw.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  {/* Header avec image de campagne */}
                  <div className="relative">
                    {draw.campaign_image && (
                      <img 
                        src={draw.campaign_image} 
                        alt={draw.campaign_title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className={`${draw.campaign_image ? 'absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} p-4 flex flex-col justify-end`}>
                      <h3 className="text-xl font-bold text-white">{draw.campaign_title}</h3>
                      <p className="text-white/80 text-sm">
                        🗓 {new Date(draw.draw_date).toLocaleDateString('fr-FR', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {/* Gagnant Principal - 1er Prix */}
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🥇</span>
                        <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">1er Prix - Gagnant Principal</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-bold text-gray-900">{draw.winner_name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{draw.winner_email || 'N/A'}</p>
                          {draw.winner_phone && (
                            <p className="text-sm text-gray-500">📞 {draw.winner_phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-mono font-bold text-sm">
                            #{draw.winning_ticket}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-yellow-200">
                        <span className="text-xs text-gray-500">Prix:</span>
                        <span className="ml-2 text-lg font-bold text-green-600">{draw.main_prize}</span>
                      </div>
                    </div>

                    {/* 2ème et 3ème Prix si disponibles */}
                    {(draw.second_prize || draw.third_prize) && draw.bonus_winners && draw.bonus_winners.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 2ème Prix */}
                        {draw.second_prize && draw.bonus_winners.find(bw => bw.position === 2) && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">🥈</span>
                              <span className="text-xs font-bold text-gray-600 uppercase">2ème Prix</span>
                            </div>
                            {(() => {
                              const winner = draw.bonus_winners.find(bw => bw.position === 2);
                              return winner ? (
                                <>
                                  <p className="font-semibold text-gray-900 text-sm">{winner.user_name}</p>
                                  <p className="text-xs text-gray-500">{winner.user_email}</p>
                                  <div className="mt-2 flex justify-between items-center">
                                    <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">#{winner.ticket_number}</span>
                                    <span className="text-green-600 font-medium text-sm">{draw.second_prize}</span>
                                  </div>
                                </>
                              ) : null;
                            })()}
                          </div>
                        )}
                        
                        {/* 3ème Prix */}
                        {draw.third_prize && draw.bonus_winners.find(bw => bw.position === 3) && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">🥉</span>
                              <span className="text-xs font-bold text-orange-700 uppercase">3ème Prix</span>
                            </div>
                            {(() => {
                              const winner = draw.bonus_winners.find(bw => bw.position === 3);
                              return winner ? (
                                <>
                                  <p className="font-semibold text-gray-900 text-sm">{winner.user_name}</p>
                                  <p className="text-xs text-gray-500">{winner.user_email}</p>
                                  <div className="mt-2 flex justify-between items-center">
                                    <span className="font-mono text-xs bg-orange-100 px-2 py-0.5 rounded">#{winner.ticket_number}</span>
                                    <span className="text-green-600 font-medium text-sm">{draw.third_prize}</span>
                                  </div>
                                </>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gagnants Bonus supplémentaires */}
                    {draw.bonus_winners && draw.bonus_winners.filter(bw => bw.position > 3).length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🎁</span>
                          <span className="text-xs font-bold text-purple-700 uppercase">
                            Gagnants Bonus ({draw.bonus_winners.filter(bw => bw.position > 3).length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {draw.bonus_winners.filter(bw => bw.position > 3).map((bw, idx) => (
                            <div key={bw.id || idx} className="flex justify-between items-center text-sm py-1 border-b border-purple-100 last:border-0">
                              <div>
                                <span className="font-medium text-gray-900">{bw.user_name}</span>
                                <span className="text-xs text-gray-500 ml-2">({bw.user_email})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-purple-100 px-2 py-0.5 rounded">#{bw.ticket_number}</span>
                                {bw.prize && <span className="text-green-600 text-xs">{bw.prize}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pas de bonus winners */}
                    {(!draw.bonus_winners || draw.bonus_winners.length === 0) && draw.bonus_winners_count > 0 && (
                      <div className="text-sm text-gray-500 text-center py-2">
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
                    disabled={confirmationStep === 2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
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
                    disabled={confirmationStep === 2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  />
                </div>

                {/* Step 2: Confirmation Code */}
                {confirmationStep === 2 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <p className="text-red-700 font-bold text-lg">⚠️ VALIDATION FINALE</p>
                      <p className="text-red-600 text-sm mt-1">
                        Pour confirmer le tirage, entrez le code suivant :
                      </p>
                      <p className="text-3xl font-mono font-bold text-red-800 mt-2 tracking-widest">
                        {generatedCode}
                      </p>
                    </div>
                    <input
                      type="text"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Entrez le code"
                      maxLength="4"
                      className="w-full px-4 py-3 text-center text-2xl font-mono border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  {confirmationStep === 1 ? (
                    <button
                      onClick={handleFirstConfirm}
                      disabled={(selectedCampaign.sold_tickets || 0) === 0}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                        (selectedCampaign.sold_tickets || 0) === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      Étape 1: Valider
                    </button>
                  ) : (
                    <button
                      onClick={handleDraw}
                      disabled={drawing || confirmationCode !== generatedCode}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                        drawing || confirmationCode !== generatedCode
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {drawing ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                          Tirage en cours...
                        </span>
                      ) : (
                        '🎯 CONFIRMER LE TIRAGE'
                      )}
                    </button>
                  )}
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
