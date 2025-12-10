import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { FilterPanel } from '../components/FilterPanel';
import { DocumentIcon, PlusIcon, EditIcon, TrashIcon, LockIcon, UnlockIcon, DiceIcon, RefreshIcon, ExportIcon } from '../components/Icons';
import api from '../services/api';

export const AdminLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    admin_id: '',
    date_start: '',
    date_end: '',
  });

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });

      const response = await api.get('/admin/logs', { params });

      setLogs(response.data.data.logs);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
        totalPages: response.data.data.pagination.totalPages,
      });
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/logs/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };

  const handleResetFilters = () => {
    setFilters({
      action: '',
      entity_type: '',
      admin_id: '',
      date_start: '',
      date_end: '',
    });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      LOGIN: 'bg-blue-100 text-blue-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      DRAW: 'bg-purple-100 text-purple-800',
      CAMPAIGN_CREATED: 'bg-green-100 text-green-800',
      CAMPAIGN_UPDATED: 'bg-yellow-100 text-yellow-800',
      CAMPAIGN_CLOSED: 'bg-orange-100 text-orange-800',
      CAMPAIGN_DELETED: 'bg-red-100 text-red-800',
      USER_UPDATED: 'bg-blue-100 text-blue-800',
      LOTTERY_DRAW: 'bg-purple-100 text-purple-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action) => {
    const icons = {
      LOGIN: <LockIcon className="w-4 h-4 inline mr-1" />,
      LOGOUT: <UnlockIcon className="w-4 h-4 inline mr-1" />,
      CAMPAIGN_CREATED: <PlusIcon className="w-4 h-4 inline mr-1" />,
      CAMPAIGN_UPDATED: <EditIcon className="w-4 h-4 inline mr-1" />,
      CAMPAIGN_DELETED: <TrashIcon className="w-4 h-4 inline mr-1" />,
      USER_UPDATED: <EditIcon className="w-4 h-4 inline mr-1" />,
      LOTTERY_DRAW: <DiceIcon className="w-4 h-4 inline mr-1" />,
    };
    return icons[action] || <DocumentIcon className="w-4 h-4 inline mr-1" />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Logs Administrateur</h1>
          <p className="text-gray-600 mt-1">
            Historique complet des actions administratives
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total des logs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.stats.total_logs}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">LOG</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Dernières 24h</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.stats.logs_last_24h}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-green-600">24H</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins actifs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.stats.unique_admins}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-600">ADM</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Action courante</p>
                  <p className="text-lg font-bold text-gray-900">
                    {stats.stats.most_common_action || 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-yellow-600">TOP</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          filterConfig={{
            dateRange: true,
            custom: [
              {
                key: 'action',
                label: 'Action',
                type: 'select',
                options: [
                  { value: 'LOGIN', label: 'Connexion' },
                  { value: 'LOGOUT', label: 'Déconnexion' },
                  { value: 'CAMPAIGN_CREATED', label: 'Campagne créée' },
                  { value: 'CAMPAIGN_UPDATED', label: 'Campagne modifiée' },
                  { value: 'CAMPAIGN_CLOSED', label: 'Campagne fermée' },
                  { value: 'LOTTERY_DRAW', label: 'Tirage effectué' },
                  { value: 'USER_UPDATED', label: 'Utilisateur modifié' },
                ],
              },
              {
                key: 'entity_type',
                label: 'Type d\'entité',
                type: 'select',
                options: [
                  { value: 'campaign', label: 'Campagne' },
                  { value: 'user', label: 'Utilisateur' },
                  { value: 'ticket', label: 'Ticket' },
                  { value: 'draw', label: 'Tirage' },
                ],
              },
            ],
          }}
        />

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Détails
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <p className="mt-2 text-gray-600">Chargement des logs...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      Aucun log trouvé
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.admin_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{log.admin_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {getActionIcon(log.action)} {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.entity_type && (
                          <div>
                            <span className="font-medium">{log.entity_type}</span>
                            {log.entity_id && ` #${log.entity_id}`}
                          </div>
                        )}
                        {log.details && (
                          <div className="text-xs text-gray-500 mt-1">
                            {typeof log.details === 'string'
                              ? log.details
                              : JSON.stringify(log.details).substring(0, 100)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  à{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  sur <span className="font-medium">{pagination.total}</span> résultats
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                      pagination.page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                      pagination.page >= pagination.totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLogsPage;
