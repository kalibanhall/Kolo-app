import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { campaignsAPI } from '../services/api';
import { TrophyIcon, TicketIcon } from '../components/Icons';

export const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info, details, preview
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_tickets: 15200,
    ticket_price: 1,
    main_prize: '',
    secondary_prizes: '',
    start_date: '',
    end_date: '',
    draw_date: '',
    image_url: '',
    status: 'draft',
    rules: '',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image valide');
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 5 MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, image_url: url }));
    if (url) {
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Le titre est requis');
      setActiveTab('info');
      return false;
    }
    if (formData.title.length < 5) {
      setError('Le titre doit contenir au moins 5 caractères');
      setActiveTab('info');
      return false;
    }
    if (!formData.description.trim()) {
      setError('La description est requise');
      setActiveTab('info');
      return false;
    }
    if (!formData.main_prize.trim()) {
      setError('Le prix principal est requis');
      setActiveTab('info');
      return false;
    }
    if (formData.total_tickets < 1) {
      setError('Le nombre de tickets doit être au moins 1');
      setActiveTab('details');
      return false;
    }
    if (formData.ticket_price < 0.01) {
      setError('Le prix du ticket doit être positif');
      setActiveTab('details');
      return false;
    }
    if (!formData.start_date) {
      setError('La date de début est requise');
      setActiveTab('details');
      return false;
    }
    if (!formData.end_date) {
      setError('La date de fin est requise');
      setActiveTab('details');
      return false;
    }
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setError('La date de fin doit être après la date de début');
      setActiveTab('details');
      return false;
    }
    if (formData.draw_date && new Date(formData.draw_date) < new Date(formData.end_date)) {
      setError('La date du tirage doit être après la date de fin');
      setActiveTab('details');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const dataToSend = {
        ...formData,
        // Convertir les dates en format ISO
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        draw_date: formData.draw_date ? new Date(formData.draw_date).toISOString() : null,
      };

      await campaignsAPI.create(dataToSend);
      setSuccess(true);
      
      // Rediriger vers la liste des campagnes après 2 secondes
      setTimeout(() => {
        navigate('/admin/campaigns');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Erreur lors de la création de la campagne');
    } finally {
      setLoading(false);
    }
  };

  // Calculs automatiques
  const totalPotential = formData.total_tickets * formData.ticket_price;
  const formattedTotal = new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(totalPotential);

  const tabs = [
    { id: 'info', label: 'Informations', icon: '' },
    { id: 'details', label: 'Configuration', icon: '' },
    { id: 'preview', label: 'Prévisualisation', icon: '' },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Créer une nouvelle campagne</h1>
          <p className="text-gray-600 mt-2">
            Configurez les paramètres de votre prochaine tombola KOLO
          </p>
        </div>

        {/* Alertes */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-center">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <div className="flex items-center">
              <div>
                <p className="text-green-700 font-medium">Campagne créée avec succès !</p>
                <p className="text-green-600 text-sm">Redirection vers la liste des campagnes...</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-8">
              {/* Tab: Informations */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Titre */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Titre de la campagne <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Ex: Grande Tombola KOLO - Gagnez une maison"
                    />
                    <p className="mt-1 text-sm text-gray-500">{formData.title.length}/200 caractères</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Décrivez votre campagne, les règles de participation, les conditions..."
                    />
                  </div>

                  {/* Prix principal */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prix principal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="main_prize"
                      value={formData.main_prize}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Ex: Maison 3 chambres à Kinshasa"
                    />
                  </div>

                  {/* Prix secondaires */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prix secondaires (optionnel)
                    </label>
                    <textarea
                      name="secondary_prizes"
                      value={formData.secondary_prizes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="2ème prix: Voiture Toyota&#10;3ème prix: Moto&#10;4ème prix: Télévision 55 pouces"
                    />
                    <p className="mt-1 text-sm text-gray-500">Un prix par ligne</p>
                  </div>

                  {/* Image de la campagne */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Image de la campagne
                    </label>
                    
                    <div className="space-y-4">
                      {/* Upload ou URL */}
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
                          >
                            <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-600">Télécharger une image</span>
                          </label>
                        </div>
                        <span className="flex items-center text-gray-400">ou</span>
                        <div className="flex-1">
                          <input
                            type="url"
                            name="image_url_input"
                            placeholder="URL de l'image"
                            onChange={handleImageUrlChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>

                      {/* Prévisualisation de l'image */}
                      {imagePreview && (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Prévisualisation"
                            className="h-40 w-auto rounded-lg border border-gray-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Format: JPG, PNG, GIF. Max 5 MB. Recommandé: 1200x630 pixels</p>
                  </div>
                </div>
              )}

              {/* Tab: Configuration */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Tickets et Prix */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration des tickets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nombre total de tickets <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="total_tickets"
                          value={formData.total_tickets}
                          onChange={handleChange}
                          min="1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Numéros de 1 à {formData.total_tickets.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Prix du ticket ($) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="ticket_price"
                          value={formData.ticket_price}
                          onChange={handleChange}
                          min="0.01"
                          step="0.01"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Résumé financier */}
                    <div className="mt-6 p-4 bg-indigo-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-800 font-medium">Montant total potentiel:</span>
                        <span className="text-2xl font-bold text-indigo-900">{formattedTotal}</span>
                      </div>
                      <p className="text-sm text-indigo-600 mt-1">
                        {formData.total_tickets.toLocaleString()} tickets × ${formData.ticket_price}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendrier</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date de début <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date de fin <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date du tirage
                        </label>
                        <input
                          type="datetime-local"
                          name="draw_date"
                          value={formData.draw_date}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                        <p className="mt-1 text-sm text-gray-500">Optionnel</p>
                      </div>
                    </div>
                  </div>

                  {/* Statut initial */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut initial</h3>
                    <div className="flex space-x-4">
                      <label className={`flex-1 relative cursor-pointer rounded-lg border-2 p-4 transition ${
                        formData.status === 'draft' 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="status"
                          value="draft"
                          checked={formData.status === 'draft'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="flex items-center">
                          <div>
                            <p className="font-semibold text-gray-900">Brouillon</p>
                            <p className="text-sm text-gray-500">La campagne ne sera pas visible</p>
                          </div>
                        </div>
                      </label>

                      <label className={`flex-1 relative cursor-pointer rounded-lg border-2 p-4 transition ${
                        formData.status === 'open' 
                          ? 'border-green-600 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="status"
                          value="open"
                          checked={formData.status === 'open'}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="flex items-center">
                          <div>
                            <p className="font-semibold text-gray-900">Ouverte</p>
                            <p className="text-sm text-gray-500">Visible et ouverte aux achats</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Règlement */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Règlement de la tombola (optionnel)
                    </label>
                    <textarea
                      name="rules"
                      value={formData.rules}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Conditions de participation, règles du tirage, modalités de remise des prix..."
                    />
                  </div>
                </div>
              )}

              {/* Tab: Prévisualisation */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Aperçu de la campagne</h3>
                    <p className="text-gray-500">Voici comment votre campagne apparaîtra aux utilisateurs</p>
                  </div>

                  {/* Preview Card */}
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-2xl mx-auto">
                    {/* Image Header */}
                    <div className="relative h-48 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Campagne"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <TrophyIcon className="w-20 h-20 text-white/50" />
                        </div>
                      )}
                      
                      {/* Badge Prix */}
                      <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full shadow-lg">
                        <p className="text-xs font-semibold">GAGNEZ</p>
                        <p className="text-lg font-bold">{formData.main_prize || 'Prix principal'}</p>
                      </div>

                      {/* Status Badge */}
                      <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
                        formData.status === 'open' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-500 text-white'
                      }`}>
                        {formData.status === 'open' ? 'Ouverte' : 'Brouillon'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">
                        {formData.title || 'Titre de la campagne'}
                      </h4>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {formData.description || 'Description de la campagne...'}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-indigo-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-indigo-600 font-semibold">Prix</p>
                          <p className="text-xl font-bold text-indigo-900">${formData.ticket_price}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 font-semibold">Tickets</p>
                          <p className="text-xl font-bold text-green-900">{formData.total_tickets.toLocaleString()}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-orange-600 font-semibold">Total</p>
                          <p className="text-xl font-bold text-orange-900">{formattedTotal}</p>
                        </div>
                      </div>

                      {/* Dates */}
                      {formData.start_date && formData.end_date && (
                        <div className="text-sm text-gray-500 flex items-center justify-center space-x-4">
                          <span>Du {new Date(formData.start_date).toLocaleDateString('fr-FR')}</span>
                          <span>au {new Date(formData.end_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}

                      {/* CTA Button Preview */}
                      <button
                        type="button"
                        className="w-full mt-4 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"
                      >
                        <TicketIcon className="w-5 h-5" />
                        <span>Acheter mes Tickets</span>
                      </button>
                    </div>
                  </div>

                  {/* Secondary Prizes Preview */}
                  {formData.secondary_prizes && (
                    <div className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Autres prix à gagner</h4>
                      <ul className="space-y-2">
                        {formData.secondary_prizes.split('\n').filter(p => p.trim()).map((prize, idx) => (
                          <li key={idx} className="flex items-center text-gray-700">
                            <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                              {idx + 2}
                            </span>
                            {prize}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/admin/campaigns')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                Annuler
              </button>

              <div className="flex space-x-4">
                {activeTab !== 'info' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.id === activeTab) - 1]?.id || 'info')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
                  >
                    ← Précédent
                  </button>
                )}

                {activeTab !== 'preview' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.id === activeTab) + 1]?.id || 'preview')}
                    className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
                  >
                    Suivant →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-400 transition flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Création en cours...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Créer la campagne</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};
