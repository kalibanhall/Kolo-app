import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { campaignsAPI } from '../services/api';

export const CampaignsManagementPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_tickets: 15200,
    ticket_price: 1,
    main_prize: '',
    start_date: '',
    end_date: '',
    draw_date: '',
    status: 'draft',
    image_url: '',
    prize_image_url: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [prizeImagePreview, setPrizeImagePreview] = useState(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getAll();
      setCampaigns(response.data || []);
    } catch (err) {
      setError('Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'campaign') {
          setImagePreview(reader.result);
          setFormData(prev => ({ ...prev, image_url: reader.result }));
        } else {
          setPrizeImagePreview(reader.result);
          setFormData(prev => ({ ...prev, prize_image_url: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingCampaign) {
        await campaignsAPI.update(editingCampaign.id, formData);
      } else {
        await campaignsAPI.create(formData);
      }
      
      // Reset form and reload
      resetForm();
      loadCampaigns();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title || '',
      description: campaign.description || '',
      total_tickets: campaign.total_tickets || 15200,
      ticket_price: campaign.ticket_price || 1,
      main_prize: campaign.main_prize || '',
      start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
      end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
      draw_date: campaign.draw_date ? campaign.draw_date.split('T')[0] : '',
      status: campaign.status || 'draft',
      image_url: campaign.image_url || '',
      prize_image_url: campaign.prize_image_url || ''
    });
    setImagePreview(campaign.image_url);
    setPrizeImagePreview(campaign.prize_image_url);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;

    try {
      await campaignsAPI.delete(id);
      loadCampaigns();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await campaignsAPI.updateStatus(id, newStatus);
      loadCampaigns();
    } catch (err) {
      setError('Erreur lors du changement de statut');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      total_tickets: 15200,
      ticket_price: 1,
      main_prize: '',
      start_date: '',
      end_date: '',
      draw_date: '',
      status: 'draft',
      image_url: '',
      prize_image_url: ''
    });
    setImagePreview(null);
    setPrizeImagePreview(null);
    setEditingCampaign(null);
    setShowForm(false);
    setError(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      draft: 'Brouillon',
      open: 'Ouverte',
      closed: 'Fermée',
      completed: 'Terminée'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading && !showForm) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des campagnes</h1>
            <p className="text-gray-600 mt-1">Créez et gérez vos campagnes de tombola</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {showForm ? '← Retour à la liste' : '+ Nouvelle campagne'}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">❌ {error}</p>
          </div>
        )}

        {/* Formulaire de création/édition */}
        {showForm ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCampaign ? 'Modifier la campagne' : 'Créer une nouvelle campagne'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la campagne *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Tombola Kolo Mutuka 2025"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez votre campagne..."
                />
              </div>

              {/* Prix principal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix principal *
                </label>
                <input
                  type="text"
                  name="main_prize"
                  value={formData.main_prize}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Toyota RAV4 2025 Hybrid"
                />
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image de la campagne */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image de couverture
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, image_url: '' })); }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 mb-2">📷 Ajouter une image</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'campaign')}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Image du prix */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo du prix
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {prizeImagePreview ? (
                      <div className="relative">
                        <img src={prizeImagePreview} alt="Prize Preview" className="w-full h-48 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => { setPrizeImagePreview(null); setFormData(prev => ({ ...prev, prize_image_url: '' })); }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 mb-2">🎁 Ajouter une image du prix</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'prize')}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tickets et prix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre total de tickets *
                  </label>
                  <input
                    type="number"
                    name="total_tickets"
                    value={formData.total_tickets}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix du ticket ($) *
                  </label>
                  <input
                    type="number"
                    name="ticket_price"
                    value={formData.ticket_price}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date du tirage
                  </label>
                  <input
                    type="date"
                    name="draw_date"
                    value={formData.draw_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Brouillon</option>
                  <option value="open">Ouverte</option>
                  <option value="closed">Fermée</option>
                  <option value="completed">Terminée</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingCampaign ? 'Mettre à jour' : 'Créer la campagne'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Liste des campagnes */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Aucune campagne pour le moment</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Créer votre première campagne →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campagne
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prix
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {campaign.image_url && (
                              <img
                                src={campaign.image_url}
                                alt={campaign.title}
                                className="h-12 w-12 rounded-lg object-cover mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {campaign.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {campaign.description?.substring(0, 50)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{campaign.main_prize}</div>
                          <div className="text-sm text-gray-500">${campaign.ticket_price} / ticket</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {campaign.sold_tickets || 0} / {campaign.total_tickets}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${((campaign.sold_tickets || 0) / campaign.total_tickets) * 100}%`
                              }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(campaign.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Début: {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'}</div>
                          <div>Fin: {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(campaign)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ✏️ Éditer
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            🗑️ Supprimer
                          </button>
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(campaign.id, 'open')}
                              className="text-green-600 hover:text-green-900"
                            >
                              🚀 Ouvrir
                            </button>
                          )}
                          {campaign.status === 'open' && (
                            <button
                              onClick={() => handleStatusChange(campaign.id, 'closed')}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              🔒 Fermer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
