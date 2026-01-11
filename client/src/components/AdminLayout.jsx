import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChartIcon, CampaignIcon, UsersIcon, MoneyIcon, TargetIcon, SettingsIcon, LogoutIcon, TrophyIcon, TicketIcon } from './Icons';
import { LogoKolo } from './LogoKolo';

export const AdminLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/admin', label: 'Tableau de bord', Icon: ChartIcon },
    { path: '/admin/campaigns', label: 'Campagnes', Icon: CampaignIcon },
    { path: '/admin/participants', label: 'Participants', Icon: UsersIcon },
    { path: '/admin/transactions', label: 'Transactions', Icon: MoneyIcon },
    { path: '/admin/draws', label: 'Tirages', Icon: TargetIcon },
    { path: '/admin/delivery', label: 'Livraisons', Icon: TrophyIcon },
    { path: '/admin/promos', label: 'Promos', Icon: TicketIcon },
    { path: '/admin/logs', label: 'Journal', Icon: SettingsIcon },
  ];

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 lg:w-64 bg-slate-800 text-white shadow-xl z-50 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="p-3 lg:p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <LogoKolo size="small" />
            <div>
              <h1 className="text-base lg:text-lg font-bold">KOLO ADMIN</h1>
              <p className="text-[10px] lg:text-xs text-slate-400">Tombola</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 lg:p-3 space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.Icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center space-x-2 px-3 py-2 lg:py-2.5 rounded-lg transition-all text-sm ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <IconComponent className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-3 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Menu"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex-1 lg:flex-initial">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
                {navItems.find(item => item.path === location.pathname)?.label || 'Admin'}
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 hidden sm:block">
                KOLO Tombola
              </p>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <button
                onClick={() => {
                  const confirmed = logout();
                  if (confirmed) {
                    navigate('/');
                  }
                }}
                className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-1.5 lg:py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <LogoutIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-xs lg:text-sm font-medium hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-3 lg:px-8 py-3 lg:py-4 text-center text-xs lg:text-sm text-gray-500 border-t">
          © {new Date().getFullYear()} KOLO Admin
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;