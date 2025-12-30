import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChartIcon, CampaignIcon, UsersIcon, MoneyIcon, TargetIcon, SettingsIcon, LogoutIcon, TrophyIcon } from './Icons';
import { LogoKolo } from './LogoKolo';

export const AdminLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin', label: 'Tableau de bord', Icon: ChartIcon },
    { path: '/admin/campaigns', label: 'Gestion des campagnes', Icon: CampaignIcon },
    { path: '/admin/participants', label: 'Participants', Icon: UsersIcon },
    { path: '/admin/transactions', label: 'Gestion des transactions', Icon: MoneyIcon },
    { path: '/admin/draws', label: 'Gestion des Tirages', Icon: TargetIcon },
    { path: '/admin/delivery', label: 'Livraison des prix', Icon: TrophyIcon },
    { path: '/admin/logs', label: 'Journal & Sécurité', Icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-800 text-white shadow-xl z-40">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <LogoKolo size="small" />
            <div>
              <h1 className="text-xl font-bold">KOLO ADMIN</h1>
              <p className="text-xs text-slate-400">Tombola</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const IconComponent = item.Icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {navItems.find(item => item.path === location.pathname)?.label || 'Administration'}
              </h2>
              <p className="text-sm text-gray-600">
                Tombola Admin - KOLO
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  const confirmed = logout();
                  if (confirmed) {
                    navigate('/');
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <LogoutIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-8 py-4 text-center text-sm text-gray-500 border-t">
          © {new Date().getFullYear()} KOLO - Tableau de bord administrateur
        </footer>
      </div>
    </div>
  );
};
