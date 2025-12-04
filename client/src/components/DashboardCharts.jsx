import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Color palette
const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// Revenue Chart Component
export const RevenueChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenus par mois</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenus par mois</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value.toLocaleString()} FC`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value) => [`${value.toLocaleString()} FC`, 'Revenus']}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#8B5CF6" 
            strokeWidth={3}
            dot={{ fill: '#8B5CF6', r: 5 }}
            activeDot={{ r: 7 }}
            name="Revenus"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Participants Chart Component
export const ParticipantsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants par campagne</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants par campagne</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="campaign" 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value) => [value, 'Participants']}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar 
            dataKey="participants" 
            fill="#8B5CF6" 
            radius={[8, 8, 0, 0]}
            name="Participants"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Campaign Status Pie Chart
export const CampaignStatusChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut des campagnes</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  const renderCustomLabel = ({ name, percent }) => {
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut des campagnes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Sales Trend Chart (Line chart with multiple metrics)
export const SalesTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendance des ventes</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendance des ventes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Line 
            type="monotone" 
            dataKey="tickets" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', r: 4 }}
            name="Tickets achetés"
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#EC4899" 
            strokeWidth={2}
            dot={{ fill: '#EC4899', r: 4 }}
            name="Revenus (FC)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Top Campaigns Chart
export const TopCampaignsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Campagnes</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Campagnes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            width={100}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value) => [`${value.toLocaleString()} FC`, 'Revenus']}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar 
            dataKey="revenue" 
            fill="#8B5CF6" 
            radius={[0, 8, 8, 0]}
            name="Revenus"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Payment Methods Chart
export const PaymentMethodsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Méthodes de paiement</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Méthodes de paiement</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default {
  RevenueChart,
  ParticipantsChart,
  CampaignStatusChart,
  SalesTrendChart,
  TopCampaignsChart,
  PaymentMethodsChart,
};
