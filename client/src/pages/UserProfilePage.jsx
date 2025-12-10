import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI, usersAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { TicketIcon, MoneyIcon, TrophyIcon, ChartIcon } from '../components/Icons';

const UserProfilePage = () => {
  const { user, checkAuth } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone?.replace('+243', '') || '',
      });
      fetchUserTickets();
    }
  }, [user]);

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketsAPI.getUserTickets(user.id);
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Validate phone: only digits, max 9
      const cleaned = value.replace(/\D/g, '').slice(0, 9);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.phone.length !== 9) {
      alert('Le numéro de téléphone doit contenir exactement 9 chiffres');
      return;
    }

    try {
      setSaving(true);
      
      await usersAPI.updateProfile(user.id, {
        name: formData.name,
        phone: `+243${formData.phone}`,
      });
      
      // Rafraîchir les données utilisateur dans le contexte
      if (checkAuth) {
        await checkAuth();
      }
      
      alert('Profil mis à jour avec succès !');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const calculateStats = () => {
    const totalTickets = tickets.length;
    const totalSpent = tickets.reduce((sum, ticket) => {
      return sum + (ticket.purchase_total || 0);
    }, 0);
    const campaignsEntered = new Set(tickets.map(t => t.campaign_id)).size;
    const activeTickets = tickets.filter(t => t.status === 'active').length;

    return { totalTickets, totalSpent, campaignsEntered, activeTickets };
  };

  const stats = calculateStats();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <span>←</span>
              <span>Retour au tableau de bord</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <div className="w-48"></div> {/* Spacer for centering */}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-gray-500 text-sm mt-2">{user?.phone}</p>
                
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Modifier le profil
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(false)}
                    className="mt-4 w-full bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <ChartIcon className="w-5 h-5" />
                <span>Mes Statistiques</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <TicketIcon className="w-6 h-6 text-blue-600" />
                    <span className="text-gray-700">Total tickets</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{stats.totalTickets}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MoneyIcon className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700">Total dépensé</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">${stats.totalSpent.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-700">Campagnes</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">{stats.campaignsEntered}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-700">Tickets actifs</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{stats.activeTickets}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Edit Form & Ticket History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Form */}
            {editMode && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Modifier mes informations
                </h3>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      L'email ne peut pas être modifié
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de téléphone
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-semibold">
                        +243
                      </span>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="812345678"
                        maxLength="9"
                        required
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Format: 9 chiffres (sans +243)
                    </p>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Ticket History */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <TicketIcon className="w-6 h-6" />
                  <span>Historique de mes tickets</span>
                </h3>
                <Link
                  to="/profile/invoices"
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Mes Factures
                </Link>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Chargement...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <TicketIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">
                    Aucun ticket acheté
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Participez à une campagne pour commencer !
                  </p>
                  <Link
                    to="/buy"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                  >
                    Acheter des tickets
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          N° Ticket
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campagne
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date d'achat
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm font-semibold text-blue-600">
                              {ticket.ticket_number}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{ticket.campaign_title || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatDate(ticket.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {ticket.status === 'active' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>Actif</span>
                              </span>
                            ) : ticket.status === 'won' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <TrophyIcon className="w-3 h-3" />
                                <span>Gagnant</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {ticket.status}
                              </span>
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
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
