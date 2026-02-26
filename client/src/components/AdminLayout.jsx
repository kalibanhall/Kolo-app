import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChartIcon, CampaignIcon, UsersIcon, MoneyIcon, TargetIcon, SettingsIcon, LogoutIcon, TrophyIcon, TicketIcon, ShieldIcon, StarIcon } from './Icons';
import { LogoKolo } from './LogoKolo';
import { adminAPI } from '../services/api';

export const AdminLayout = ({ children }) => {
  const { user, logout, isAdmin, getAdminLevel, checkAuth } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Password change modal for first login
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Check if admin needs to change password on first login
  useEffect(() => {
    if (user?.must_change_password && user?.is_admin) {
      setShowPasswordModal(true);
    }
  }, [user]);

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      setPasswordMessage({ type: 'error', text: 'Veuillez remplir tous les champs' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    try {
      setPasswordLoading(true);
      await adminAPI.changeAdminPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordMessage({ type: 'success', text: 'Mot de passe modifié avec succès !' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      // Refresh auth state to clear must_change_password
      await checkAuth(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage(null);
      }, 1500);
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error.message || 'Erreur lors du changement de mot de passe' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const adminLevel = getAdminLevel();

  // L1: Campagnes + Promos + Influenceurs
  // L2: + Validations + Transactions + Tirages + Livraisons
  // L3: Full Access (Dashboard, Participants, Actions, Journal, Debug)
  // L1: Opérateur - Campagnes + Promos + Influenceurs uniquement (pas de tableau de bord)
  // L2: Manager/Superviseur - + Validations + Transactions + Tirages + Livraisons (pas de tableau de bord)
  // L3: Administrateur Général - Full Access (Dashboard, Participants, Actions, Journal, Debug)
  const navItems = [
    { path: '/admin', label: 'Tableau de bord', Icon: ChartIcon, minLevel: 3 },
    { path: '/admin/campaigns', label: 'Campagnes', Icon: CampaignIcon, minLevel: 1 },
    { path: '/admin/promos', label: 'Promos', Icon: TicketIcon, minLevel: 1 },
    { path: '/admin/influencers', label: 'Influenceurs', Icon: StarIcon, minLevel: 1 },
    { path: '/admin/validations', label: 'Validations', Icon: ShieldIcon, minLevel: 2 },
    { path: '/admin/transactions', label: 'Transactions', Icon: MoneyIcon, minLevel: 2 },
    { path: '/admin/draws', label: 'Tirages', Icon: TargetIcon, minLevel: 2 },
    { path: '/admin/delivery', label: 'Livraisons', Icon: TrophyIcon, minLevel: 2 },
    { path: '/admin/participants', label: 'Participants', Icon: UsersIcon, minLevel: 3 },
    { path: '/admin/manage-admins', label: 'Admins', Icon: ShieldIcon, minLevel: 3 },
    { path: '/admin/actions', label: 'Actions', Icon: SettingsIcon, minLevel: 3 },
    { path: '/admin/logs', label: 'Journal', Icon: SettingsIcon, minLevel: 3 },
    { path: '/admin/debug', label: 'Debug', Icon: SettingsIcon, minLevel: 3 },
  ].filter(item => adminLevel >= item.minLevel);

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 lg:w-64 ${isDarkMode ? 'bg-gray-800' : 'bg-slate-800'} text-white shadow-xl z-50 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className={`p-3 lg:p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-slate-700'}`}>
          <div className="flex items-center space-x-2">
            <LogoKolo size="small" />
            <div>
              <h1 className="text-base lg:text-lg font-bold">KOLO ADMIN</h1>
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
                    : isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
        <header className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm sticky top-0 z-30`}>
          <div className="px-3 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition`}
              aria-label="Menu"
            >
              <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex-1 lg:flex-initial">
              <h2 className={`text-lg lg:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                {navItems.find(item => item.path === location.pathname)?.label || 'Admin'}
              </h2>
              <p className={`text-xs lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} hidden sm:block`}>
                KOLO | Koma Propriétaire
              </p>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              
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
        <footer className={`px-3 lg:px-8 py-3 lg:py-4 text-center text-xs lg:text-sm ${isDarkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500'} border-t`}>
          © {new Date().getFullYear()} KOLO Admin
        </footer>
      </div>

      {/* ===== ADMIN PASSWORD CHANGE MODAL (first login) ===== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.must_change_password ? 'Changez votre mot de passe' : 'Modifier le mot de passe'}
              </h2>
              {!user?.must_change_password && (
                <button onClick={() => { setShowPasswordModal(false); setPasswordMessage(null); }} className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {user?.must_change_password && (
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                ⚠️ Pour votre sécurité, veuillez changer le mot de passe fourni par l'administrateur avant de continuer.
              </p>
            )}
            {passwordMessage && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {passwordMessage.text}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mot de passe actuel</label>
                <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Mot de passe actuel" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nouveau mot de passe</label>
                <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Minimum 6 caractères" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmer le mot de passe</label>
                <input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Répétez le nouveau mot de passe" />
              </div>
              <button onClick={handleChangePassword} disabled={passwordLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                {passwordLoading ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;