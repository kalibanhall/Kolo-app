import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import AdminLayout from '../components/AdminLayout';
import { promosAPI } from '../services/api';

// Fonction pour générer un code promo aléatoire de 7 caractères
const generatePromoCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const AdminPromosPage = () => {
  const { isDarkMode } = useTheme();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Formulaire de création
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    influencer_name: '',
    code: '',
    discount_percent: 10,
    max_uses: 100,
    expires_at: ''
  });

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    try {
      setLoading(true);
      const response = await promosAPI.getAll();
      setPromos(response.data || []);
    } catch (err) {
      setError('Erreur lors du chargement des codes promo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    setFormData(prev => ({ ...prev, code: generatePromoCode() }));
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!formData.influencer_name.trim()) {
      setError('Veuillez entrer le nom de l\'influenceur');
      return;
    }
    if (!formData.code) {
      setError('Veuillez générer un code promo');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      const response = await promosAPI.create({
        code: formData.code,
        influencer_name: formData.influencer_name,
        discount_percent: formData.discount_percent,
        max_uses: formData.max_uses,
        expires_at: formData.expires_at || null
      });

      if (response.success) {
        setSuccess(`Code promo "${formData.code}" créé avec succès pour ${formData.influencer_name}`);
        setFormData({
          influencer_name: '',
          code: '',
          discount_percent: 10,
          max_uses: 100,
          expires_at: ''
        });
        setShowCreateForm(false);
        loadPromos();
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du code promo');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;
    
    try {
      await promosAPI.delete(id);
      setSuccess('Code promo supprimé');
      loadPromos();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await promosAPI.update(id, { is_active: !currentStatus });
      loadPromos();
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Codes Promo Influenceurs
            </h1>
            <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérez les codes promo pour vos partenaires et influenceurs
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Générer un code promo
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">×</button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
            {success}
            <button onClick={() => setSuccess('')} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nouveau Code Promo
              </h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              {/* Nom de l'influenceur */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Identité de l'influenceur *
                </label>
                <input
                  type="text"
                  value={formData.influencer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, influencer_name: e.target.value }))}
                  placeholder="Ex: Jean Kalala, @influenceur_congo"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  required
                />
              </div>

              {/* Code promo avec bouton générer */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Code Promo *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="XB5FG7U"
                    maxLength={7}
                    className={`flex-1 px-4 py-3 rounded-lg border font-mono text-lg tracking-wider ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all whitespace-nowrap"
                  >
                    🎲 Générer
                  </button>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Code de 7 caractères alphanumériques
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Pourcentage de réduction */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Réduction (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>

                {/* Nombre max d'utilisations */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Utilisations max
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_uses}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 1 }))}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>

                {/* Date d'expiration */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Expire le (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || !formData.code || !formData.influencer_name}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Création...
                    </>
                  ) : (
                    'Créer le code'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des codes promo */}
        <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Code
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Influenceur
                  </th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Réduction
                  </th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Utilisations
                  </th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Statut
                  </th>
                  <th className={`px-6 py-4 text-right text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </td>
                  </tr>
                ) : promos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={`px-6 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Aucun code promo créé. Cliquez sur "Générer un code promo" pour commencer.
                    </td>
                  </tr>
                ) : (
                  promos.map((promo) => (
                    <tr key={promo.id} className={isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4">
                        <span className={`font-mono text-lg font-bold tracking-wider ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>
                          {promo.code}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {promo.influencer_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                          -{promo.discount_percent}%
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {promo.used_count || 0} / {promo.max_uses || '∞'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          promo.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {promo.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(promo.id, promo.is_active)}
                            className={`p-2 rounded-lg ${
                              promo.is_active
                                ? 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                            }`}
                            title={promo.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {promo.is_active ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePromo(promo.id)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                            title="Supprimer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPromosPage;
