import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ticketsAPI, usersAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { TicketIcon, MoneyIcon, TrophyIcon, ChartIcon } from '../components/Icons';
import { LogoKolo } from '../components/LogoKolo';
import { ImageUpload } from '../components/ImageUpload';

const UserProfilePage = () => {
  const { user, checkAuth } = useAuth();
  const { isDarkMode } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
  });

  // Liste des villes de la RDC
  const drcCities = [
    'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani',
    'Bukavu', 'Goma', 'Likasi', 'Kolwezi', 'Tshikapa',
    'Kikwit', 'Matadi', 'Uvira', 'Butembo', 'Beni',
    'Mbandaka', 'Kalemie', 'Bandundu', 'Boma', 'Kindu',
    'Autre'
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone?.replace('+243', '') || '',
        city: user.city || '',
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
      const cleaned = value.replace(/\D/g, '').slice(0, 9);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (formData.phone.length !== 9) {
      alert('Le numéro de téléphone doit contenir exactement 9 chiffres');
      return;
    }

    try {
      setSaving(true);
      
      await usersAPI.updateProfile(user.id, {
        name: formData.name,
        phone: `+243${formData.phone}`,
        city: formData.city,
      });
      
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 backdrop-blur-lg border-b transition-colors ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
              isDarkMode 
                ? 'text-cyan-400 hover:bg-gray-800' 
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour</span>
          </button>
          
          <div className="flex items-center gap-3">
            <LogoKolo size="small" />
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mon Profil
            </h1>
          </div>
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Hero Section */}
        <div className={`relative rounded-3xl overflow-hidden mb-8 ${
          isDarkMode 
            ? 'bg-gradient-to-r from-cyan-900/50 via-blue-900/50 to-indigo-900/50 border border-gray-700' 
            : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
        }`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <div className="relative p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar avec bouton de changement */}
              <div className="relative group">
                {user?.photo_url ? (
                  <img 
                    src={user.photo_url} 
                    alt={user?.name}
                    className="w-28 h-28 rounded-2xl object-cover shadow-2xl transform rotate-3 transition-transform hover:rotate-0"
                  />
                ) : (
                  <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-2xl transform rotate-3 transition-transform hover:rotate-0 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' 
                      : 'bg-white text-blue-600'
                  }`}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Bouton de changement de photo */}
                <button
                  onClick={() => setShowPhotoUpload(true)}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDarkMode ? 'bg-green-500' : 'bg-green-400'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* User Info */}
              <div className="text-center md:text-left flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{user?.name}</h2>
                <div className="flex flex-col md:flex-row gap-4 text-white/80">
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user?.email}
                  </span>
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {user?.phone}
                  </span>
                  {user?.city && (
                    <span className="flex items-center justify-center md:justify-start gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {user?.city}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Edit Button */}
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg ${
                  editMode
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : isDarkMode
                      ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20'
                      : 'bg-white hover:bg-gray-50 text-blue-600'
                }`}
              >
                {editMode ? 'Annuler' : 'Modifier le profil'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tickets', value: stats.totalTickets, icon: TicketIcon, color: 'blue' },
            { label: 'Total Dépensé', value: formatCurrency(stats.totalSpent), icon: MoneyIcon, color: 'green' },
            { label: 'Campagnes', value: stats.campaignsEntered, icon: ChartIcon, color: 'purple' },
            { label: 'Tickets Actifs', value: stats.activeTickets, icon: TrophyIcon, color: 'amber' },
          ].map((stat, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-105 hover:shadow-xl ${
                isDarkMode 
                  ? 'bg-gray-800/50 border border-gray-700 backdrop-blur-sm' 
                  : 'bg-white shadow-lg'
              }`}
            >
              <stat.icon className={`w-8 h-8 mb-3 ${
                stat.color === 'blue' ? (isDarkMode ? 'text-blue-400' : 'text-blue-500') :
                stat.color === 'green' ? (isDarkMode ? 'text-green-400' : 'text-green-500') :
                stat.color === 'purple' ? (isDarkMode ? 'text-purple-400' : 'text-purple-500') :
                (isDarkMode ? 'text-amber-400' : 'text-amber-500')
              }`} />
              <p className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Edit Form Modal */}
        {editMode && (
          <div className={`mb-8 rounded-2xl overflow-hidden ${
            isDarkMode 
              ? 'bg-gray-800/50 border border-gray-700 backdrop-blur-sm' 
              : 'bg-white shadow-xl'
          }`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Modifier mes informations
              </h3>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nom complet
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className={`w-full px-4 py-3 rounded-xl border cursor-not-allowed ${
                    isDarkMode 
                      ? 'bg-gray-900/30 border-gray-700 text-gray-500' 
                      : 'bg-gray-100 border-gray-200 text-gray-500'
                  }`}
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Numéro de téléphone
                </label>
                <div className="flex">
                  <span className={`inline-flex items-center px-4 py-3 rounded-l-xl border border-r-0 font-semibold ${
                    isDarkMode 
                      ? 'bg-gray-900/50 border-gray-600 text-gray-400' 
                      : 'bg-gray-100 border-gray-200 text-gray-600'
                  }`}>
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
                    className={`flex-1 px-4 py-3 rounded-r-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ville de résidence
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-900/50 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Sélectionnez votre ville</option>
                  {drcCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex flex-wrap gap-2 mb-6 p-1.5 rounded-xl w-fit ${
          isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
        }`}>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'tickets'
                ? isDarkMode
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-blue-600 shadow-md'
                : isDarkMode
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mes Tickets
          </button>
          <Link
            to="/wallet"
            className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-green-900/30'
                : 'text-gray-600 hover:text-gray-900 hover:bg-green-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Mon Portefeuille
          </Link>
          <Link
            to="/transactions"
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mes Transactions
          </Link>
        </div>

        {/* Tickets Section */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800/50 border border-gray-700 backdrop-blur-sm' 
            : 'bg-white shadow-xl'
        }`}>
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Chargement de vos tickets...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <TicketIcon className={`w-10 h-10 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h4 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Aucun ticket acheté
              </h4>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Participez à une campagne et devenez propriétaire !
              </p>
              <Link
                to="/buy"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <TicketIcon className="w-5 h-5" />
                Acheter des tickets
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      N° Ticket
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Campagne
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Date d'achat
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {tickets.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      className={`transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className={`font-mono text-sm font-bold px-3 py-1.5 rounded-lg ${
                          isDarkMode 
                            ? 'bg-cyan-500/20 text-cyan-400' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ticket.ticket_number}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {ticket.campaign_title || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {ticket.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-500">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Actif
                          </span>
                        ) : ticket.status === 'won' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-500">
                            <TrophyIcon className="w-3.5 h-3.5" />
                            Gagnant
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                            isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                          }`}>
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

      {/* Modal Upload Photo */}
      {showPhotoUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Changer ma photo de profil
              </h3>
              <button
                onClick={() => setShowPhotoUpload(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <ImageUpload
                folder="profiles"
                currentImage={user?.photo_url}
                buttonText="Sélectionner une photo"
                onUploadComplete={async (data) => {
                  try {
                    await usersAPI.updateProfile(user.id, { photo_url: data.url });
                    if (checkAuth) await checkAuth();
                    setShowPhotoUpload(false);
                    alert('Photo de profil mise à jour !');
                  } catch (error) {
                    alert('Erreur lors de la mise à jour: ' + error.message);
                  }
                }}
              />
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowPhotoUpload(false)}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
