import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('kolo_token');

const AdminDebugPage = () => {
  const [data, setData] = useState({
    purchases: null,
    tickets: null,
    webhooks: null,
    settings: null,
    stats: null
  });
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const fetchData = async (endpoint, key) => {
    try {
      setLoading(prev => ({ ...prev, [key]: true }));
      setErrors(prev => ({ ...prev, [key]: null }));
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      const result = await response.json();
      setData(prev => ({ ...prev, [key]: result }));
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    // Load all debug data
    fetchData('/admin/debug/purchases', 'purchases');
    fetchData('/admin/debug/tickets', 'tickets');
    fetchData('/admin/debug/webhooks', 'webhooks');
    fetchData('/admin/settings', 'settings');
    fetchData('/admin/stats', 'stats');
  }, []);

  const renderSection = (title, key, endpoint) => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button
          onClick={() => fetchData(endpoint, key)}
          disabled={loading[key]}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading[key] ? 'Chargement...' : 'Rafraîchir'}
        </button>
      </div>
      
      {errors[key] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">Erreur: {errors[key]}</p>
        </div>
      )}
      
      {data[key] ? (
        <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(data[key], null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-gray-500">Aucune donnée</p>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Admin</h1>
            <p className="text-gray-600">Visualisation des données brutes</p>
          </div>
        </div>

        {renderSection('📊 Statistiques (/admin/stats)', 'stats', '/admin/stats')}
        {renderSection('⚙️ Paramètres (/admin/settings)', 'settings', '/admin/settings')}
        {renderSection('🛒 Achats (/admin/debug/purchases)', 'purchases', '/admin/debug/purchases')}
        {renderSection('🎫 Tickets (/admin/debug/tickets)', 'tickets', '/admin/debug/tickets')}
        {renderSection('📥 Webhooks PayDRC (/admin/debug/webhooks)', 'webhooks', '/admin/debug/webhooks')}
      </div>
    </AdminLayout>
  );
};

export default AdminDebugPage;
