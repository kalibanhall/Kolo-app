import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { adminAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const LEVEL_LABELS = {
  1: 'Opérateur (L1)',
  2: 'Superviseur (L2)',
  3: 'Administrateur (L3)'
};

const LEVEL_COLORS = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-red-100 text-red-800'
};

const LEVEL_DESCRIPTIONS = {
  1: 'Campagnes + Promos (création avec validation)',
  2: 'Transactions + Tirages (consultation, lancement avec validation)',
  3: 'Accès complet à toutes les fonctionnalités'
};

export const AdminManagementPage = () => {
  const { isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', phone: '', admin_level: 1 });

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAdmins();
      setAdmins(response.admins || []);
    } catch (error) {
      console.error('Erreur chargement admins:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des administrateurs' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // Search users for promotion
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await adminAPI.searchUsersForAdmin(searchQuery);
        setSearchResults(response.users || []);
      } catch (error) {
        console.error('Erreur recherche:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePromote = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const response = await adminAPI.promoteAdmin(selectedUser.id, selectedLevel);
      setMessage({ type: 'success', text: response.message });
      setShowPromoteModal(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      loadAdmins();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la promotion' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeLevel = async (adminId, newLevel) => {
    if (adminId === currentUser?.id) {
      setMessage({ type: 'error', text: 'Vous ne pouvez pas modifier votre propre niveau' });
      return;
    }

    if (!window.confirm(`Changer le niveau de cet administrateur en ${LEVEL_LABELS[newLevel]} ?`)) return;

    try {
      setActionLoading(true);
      const response = await adminAPI.promoteAdmin(adminId, newLevel);
      setMessage({ type: 'success', text: response.message });
      loadAdmins();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemote = async (adminId, adminName) => {
    if (adminId === currentUser?.id) {
      setMessage({ type: 'error', text: 'Vous ne pouvez pas vous retirer vos propres droits' });
      return;
    }

    if (!window.confirm(`Retirer tous les droits admin de ${adminName} ? Cette action est irréversible.`)) return;

    try {
      setActionLoading(true);
      const response = await adminAPI.demoteAdmin(adminId);
      setMessage({ type: 'success', text: response.message });
      loadAdmins();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.phone) {
      setMessage({ type: 'error', text: 'Tous les champs sont obligatoires' });
      return;
    }
    try {
      setActionLoading(true);
      const response = await adminAPI.createAdmin(createForm);
      setMessage({ type: 'success', text: response.message });
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', phone: '', admin_level: 1 });
      loadAdmins();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la création' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Gestion des Administrateurs
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérez les rôles et niveaux d'accès des administrateurs
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Créer un Admin
            </button>
            <button
              onClick={() => setShowPromoteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Promouvoir existant
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Level Legend */}
        <div className={`rounded-lg shadow-sm p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Niveaux d'accès</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map(level => (
              <div key={level} className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${LEVEL_COLORS[level]}`}>
                  {LEVEL_LABELS[level]}
                </span>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {LEVEL_DESCRIPTIONS[level]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Admins List */}
        <div className={`rounded-lg shadow-sm overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Administrateurs actifs ({admins.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chargement...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center">
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Aucun administrateur trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Admin</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Niveau</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Validations</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {admins.map(admin => (
                    <tr key={admin.id} className={`${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} ${admin.id === currentUser?.id ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50') : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {admin.name} {admin.id === currentUser?.id && <span className="text-xs text-blue-500">(vous)</span>}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{admin.email}</p>
                          {admin.phone && <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{admin.phone}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={admin.admin_level}
                          onChange={(e) => handleChangeLevel(admin.id, parseInt(e.target.value))}
                          disabled={admin.id === currentUser?.id || actionLoading}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                            admin.id === currentUser?.id
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                          } ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          <option value={1}>L1 - Opérateur</option>
                          <option value={2}>L2 - Superviseur</option>
                          <option value={3}>L3 - Administrateur</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span title="Demandes soumises">{admin.validations_submitted} soumises</span>
                          <span className="mx-1">·</span>
                          <span title="Demandes traitées">{admin.validations_processed} traitées</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {admin.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDemote(admin.id, admin.name)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-300 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Retirer Admin
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
      </div>

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Ajouter un Administrateur
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Search */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rechercher un utilisateur
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom ou email..."
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
                {searching && <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Recherche...</p>}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className={`max-h-48 overflow-y-auto border rounded-lg ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setSearchResults([]); setSearchQuery(u.name); }}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between ${
                        isDarkMode ? 'hover:bg-gray-700 border-b border-gray-700' : 'hover:bg-gray-50 border-b border-gray-100'
                      } ${selectedUser?.id === u.id ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}
                    >
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{u.name}</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
                      </div>
                      {u.is_admin && (
                        <span className={`text-xs px-2 py-1 rounded ${LEVEL_COLORS[u.admin_level || 3]}`}>
                          {LEVEL_LABELS[u.admin_level || 3]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'border-blue-800 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Sélectionné : {selectedUser.name}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{selectedUser.email}</p>
                  {selectedUser.is_admin && (
                    <p className="text-sm text-yellow-600 mt-1">⚠ Déjà admin - le niveau sera modifié</p>
                  )}
                </div>
              )}

              {/* Level Selection */}
              {selectedUser && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Niveau d'accès
                  </label>
                  <div className="space-y-2">
                    {[1, 2, 3].map(level => (
                      <label
                        key={level}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedLevel === level
                            ? (isDarkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                            : (isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50')
                        }`}
                      >
                        <input
                          type="radio"
                          name="admin_level"
                          value={level}
                          checked={selectedLevel === level}
                          onChange={() => setSelectedLevel(level)}
                          className="mt-1"
                        />
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {LEVEL_LABELS[level]}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {LEVEL_DESCRIPTIONS[level]}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setShowPromoteModal(false); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Annuler
              </button>
              <button
                onClick={handlePromote}
                disabled={!selectedUser || actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Traitement...' : selectedUser?.is_admin ? 'Modifier le niveau' : 'Promouvoir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer un Admin */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Créer un Administrateur
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Créer un nouveau compte administrateur backoffice
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Nom de l'administrateur"
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="admin@kolo.cd"
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mot de passe *
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+243 ..."
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Niveau d'accès *
                </label>
                <div className="space-y-2">
                  {[
                    { level: 1, label: 'Niveau 1 — Opérateur', desc: 'Lecture seule, gestion basique' },
                    { level: 2, label: 'Niveau 2 — Manager', desc: 'Gestion complète, rapports' },
                    { level: 3, label: 'Niveau 3 — Super Admin', desc: 'Accès total, gestion des admins' }
                  ].map(({ level, label, desc }) => (
                    <label
                      key={level}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        createForm.admin_level === level
                          ? 'border-green-500 bg-green-500/10'
                          : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="create_admin_level"
                        value={level}
                        checked={createForm.admin_level === level}
                        onChange={() => setCreateForm({ ...createForm, admin_level: level })}
                        className="mt-1 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setShowCreateModal(false); setCreateForm({ name: '', email: '', password: '', phone: '', admin_level: 1 }); }}
                className={`px-4 py-2 rounded-lg font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={!createForm.name || !createForm.email || !createForm.password || actionLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Création...' : 'Créer l\'administrateur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminManagementPage;
