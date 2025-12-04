import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { campaignsAPI } from '../services/api';
import { FilterPanel } from '../components/FilterPanel';
import { exportCampaigns, formatDateForExport } from '../utils/exportUtils';

export const CampaignsManagementPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateStart: '',
    dateEnd: '',
    priceMin: '',
    priceMax: '',
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportData = filteredCampaigns.map(c => ({
        ...c,
        start_date: formatDateForExport(c.start_date),
        end_date: formatDateForExport(c.end_date),
        draw_date: formatDateForExport(c.draw_date),
        created_at: formatDateForExport(c.created_at),
      }));
      const success = exportCampaigns(exportData);
      if (success) {
        alert('✅ Export réussi !');
      } else {
        alert('❌ Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };
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

  useEffect(() => {
    applyFilters();
  }, [campaigns, filters]);

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

  const applyFilters = () => {
    let filtered = [...campaigns];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title?.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower) ||
          c.main_prize?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    // Date range filter
    if (filters.dateStart) {
      filtered = filtered.filter(
        (c) => new Date(c.start_date) >= new Date(filters.dateStart)
      );
    }
    if (filters.dateEnd) {
      filtered = filtered.filter(
        (c) => new Date(c.end_date) <= new Date(filters.dateEnd)
      );
    }

    // Price range filter
    if (filters.priceMin) {
      filtered = filtered.filter((c) => c.ticket_price >= parseFloat(filters.priceMin));
    }
    if (filters.priceMax) {
      filtered = filtered.filter((c) => c.ticket_price <= parseFloat(filters.priceMax));
    }

    setFilteredCampaigns(filtered);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      dateStart: '',
      dateEnd: '',
      priceMin: '',
      priceMax: '',
    });
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
          <div className="flex gap-3">
            {!showForm && (
              <button
                onClick={handleExport}
                disabled={exporting || loading}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  exporting || loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Export...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter CSV
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {showForm ? '← Retour à la liste' : '+ Nouvelle campagne'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">❌ {error}</p>
          </div>
        )}

        {/* Filters */}
        {!showForm && (
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            filterConfig={{
              search: { placeholder: 'Rechercher par titre, description, prix...' },
              status: {
                options: [
                  { value: 'draft', label: 'Brouillon' },
                  { value: 'open', label: 'Ouvert' },
                  { value: 'closed', label: 'Fermé' },
                ],
              },
              dateRange: true,
              priceRange: true,
            }}
          />
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
                    {filteredCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center">
                          <p className="text-gray-500">
                            {filters.search || filters.status || filters.dateStart || filters.dateEnd || filters.priceMin || filters.priceMax
                              ? 'Aucune campagne ne correspond aux filtres'
                              : 'Aucune campagne disponible'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredCampaigns.map((campaign) => (
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
                    )))}
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
