import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { adminAPI } from '../services/api';
import { exportParticipants, formatDateForExport, formatBooleanForExport } from '../utils/exportUtils';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export const ParticipantsPage = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedParticipant, setExpandedParticipant] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [sortBy, setSortBy] = useState('tickets');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleExport = async () => {
    try {
      setExporting(true);
      // Get all participants for export (without pagination)
      const response = await adminAPI.getParticipants({ limit: 10000 });
      const allParticipants = response.data.participants.map(p => ({
        ...p,
        created_at: formatDateForExport(p.created_at),
      }));
      const success = exportParticipants(allParticipants);
      if (success) {
        alert('Export réussi !');
      } else {
        alert('Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, [pagination.page, sortBy, sortOrder]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getParticipants({
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      });
      
      setParticipants(response.data.participants);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.totalPages,
      }));
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <AdminLayout>
      <div className={`rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Liste des participants
              </h2>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total : {pagination.total} participant{pagination.total > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
              <button
                onClick={loadParticipants}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
              Actualiser
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  #
                </th>
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => handleSort('name')}
                >
                  Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => handleSort('email')}
                >
                  Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Téléphone
                </th>
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => handleSort('tickets')}
                >
                  Tickets {sortBy === 'tickets' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Participation
                </th>
                <th
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => handleSort('amount')}
                >
                  Montant {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chargement...</p>
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan="8" className={`px-6 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucun participant trouvé
                  </td>
                </tr>
              ) : (
                participants.map((participant, index) => (
                  <React.Fragment key={participant.user_id}>
                    <tr 
                      className={`cursor-pointer transition-colors ${
                        expandedParticipant === participant.user_id
                          ? isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                          : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedParticipant(
                        expandedParticipant === participant.user_id ? null : participant.user_id
                      )}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 transition-transform ${expandedParticipant === participant.user_id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{participant.name}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {participant.email}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {participant.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-700 rounded-full">
                          {participant.ticket_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {participant.campaigns_participation && participant.campaigns_participation.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {participant.campaigns_participation.map((cp, i) => (
                              <span 
                                key={i} 
                                className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full"
                                title={cp.campaign_title}
                              >
                                {cp.campaign_title?.substring(0, 15)}{cp.campaign_title?.length > 15 ? '...' : ''}: {cp.tickets}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {participant.currency === 'CDF' 
                          ? `${parseFloat(participant.total_spent).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FC`
                          : `$${parseFloat(participant.total_spent).toFixed(2)}`
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          participant.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {participant.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded participant detail */}
                    {expandedParticipant === participant.user_id && (
                      <tr>
                        <td colSpan="8" className={`px-0 py-0 ${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                          <div className={`px-8 py-5 border-t border-b ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-blue-100 bg-blue-50/50'}`}>
                            {/* Participant Summary */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                {participant.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {participant.name}
                                </h3>
                                <div className={`flex flex-wrap gap-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <span>{participant.email}</span>
                                  {participant.phone && <span>• {participant.phone}</span>}
                                  {participant.join_date && (
                                    <span>• Inscrit le {new Date(participant.join_date).toLocaleDateString('fr-FR')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                              <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm`}>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total tickets</p>
                                <p className={`text-xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{participant.ticket_count}</p>
                              </div>
                              <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm`}>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Achats</p>
                                <p className={`text-xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{participant.purchases}</p>
                              </div>
                              <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm`}>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Montant dépensé</p>
                                <p className={`text-xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                  ${parseFloat(participant.total_spent).toFixed(2)}
                                </p>
                              </div>
                              <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm`}>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Campagnes</p>
                                <p className={`text-xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                  {participant.campaigns_participation?.length || 0}
                                </p>
                              </div>
                            </div>

                            {/* Campaigns Detail */}
                            <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Détails des participations aux campagnes
                            </h4>
                            {participant.campaigns_participation && participant.campaigns_participation.length > 0 ? (
                              <div className="space-y-2">
                                {participant.campaigns_participation.map((cp, i) => (
                                  <div 
                                    key={i} 
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                      isDarkMode 
                                        ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                                        : 'bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-300'
                                    } hover:shadow-md`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/campaigns/${cp.campaign_id}`);
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-purple-600' : 'bg-purple-100'}`}>
                                        <svg className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {cp.campaign_title}
                                        </p>
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {cp.tickets} ticket{cp.tickets > 1 ? 's' : ''} acheté{cp.tickets > 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                        {cp.tickets} 🎫
                                      </span>
                                      <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Aucune participation enregistrée
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Page {pagination.page} sur {pagination.totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                ← Précédent
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className={`px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </AdminLayout>
  );
};
