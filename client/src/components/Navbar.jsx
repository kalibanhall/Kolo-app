import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoKolo } from './LogoKolo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll for navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    const confirmed = logout();
    if (confirmed) {
      setUserMenuOpen(false);
      navigate('/');
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg' 
        : 'bg-white dark:bg-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - Compact */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition group">
            <div className="relative">
              <LogoKolo size="small" animated />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                KOLO
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-medium tracking-wider">
                TOMBOLA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/" active={location.pathname === '/'}>
              Accueil
            </NavLink>
            <button
              onClick={() => scrollToSection('campagnes')}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
            >
              Campagnes
            </button>
            <NavLink to="/about" active={location.pathname === '/about'}>
              Notre Vision
            </NavLink>
            <NavLink to="/contact" active={location.pathname === '/contact'}>
              Contact
            </NavLink>
          </div>

          {/* Desktop Auth Section - Compact */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <ThemeToggle compact />
                <NotificationBell compact />
                
                {/* User Button */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/60 px-3 py-1.5 rounded-full transition border border-indigo-100 dark:border-indigo-800"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-200 max-w-[80px] truncate">
                      {user.name?.split(' ')[0]}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl py-2 z-20 border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Connecté en tant que</p>
                          <p className="font-semibold text-gray-800 dark:text-white truncate">{user.name}</p>
                        </div>
                        
                        {user.is_admin ? (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                          >
                            <span className="text-lg">📊</span>
                            <span className="text-sm font-medium">Dashboard Admin</span>
                          </Link>
                        ) : (
                          <>
                            <Link
                              to="/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                            >
                              <span className="text-lg">🎫</span>
                              <span className="text-sm font-medium">Mes Tickets</span>
                            </Link>
                            <Link
                              to="/profile"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center space-x-2 px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                            >
                              <span className="text-lg">👤</span>
                              <span className="text-sm font-medium">Mon Profil</span>
                            </Link>
                          </>
                        )}
                        
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 px-4 py-2.5 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            <span className="text-lg">🚪</span>
                            <span className="text-sm font-medium">Déconnexion</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ThemeToggle compact />
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-full transition shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle compact />
            {user && <NotificationBell compact />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Menu"
            >
              <div className="w-5 h-5 flex flex-col justify-center items-center relative">
                <span className={`block w-5 h-0.5 bg-gray-700 dark:bg-gray-300 rounded-full transform transition-all duration-300 ${
                  mobileMenuOpen ? 'rotate-45 absolute' : '-translate-y-1.5'
                }`} />
                <span className={`block w-5 h-0.5 bg-gray-700 dark:bg-gray-300 rounded-full transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`} />
                <span className={`block w-5 h-0.5 bg-gray-700 dark:bg-gray-300 rounded-full transform transition-all duration-300 ${
                  mobileMenuOpen ? '-rotate-45 absolute' : 'translate-y-1.5'
                }`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Modern Slide */}
      <div className={`md:hidden fixed inset-x-0 top-14 bottom-0 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full overflow-y-auto px-4 py-4">
          {/* User Info (if logged in) */}
          {user && (
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <MobileNavLink to="/" icon="🏠" onClick={() => setMobileMenuOpen(false)}>
              Accueil
            </MobileNavLink>
            <button
              onClick={() => scrollToSection('campagnes')}
              className="flex items-center space-x-3 w-full px-3 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
            >
              <span className="text-lg">🎟️</span>
              <span className="font-medium text-sm">Campagnes</span>
            </button>
            <MobileNavLink to="/about" icon="✨" onClick={() => setMobileMenuOpen(false)}>
              Notre Vision
            </MobileNavLink>
            <MobileNavLink to="/contact" icon="📞" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </MobileNavLink>
          </div>

          <hr className="my-4 border-gray-200 dark:border-gray-700" />

          {user ? (
            <>
              {/* User Actions */}
              <div className="space-y-1">
                {user.is_admin ? (
                  <MobileNavLink to="/admin" icon="📊" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard Admin
                  </MobileNavLink>
                ) : (
                  <>
                    <MobileNavLink to="/dashboard" icon="🎫" onClick={() => setMobileMenuOpen(false)}>
                      Mes Tickets
                    </MobileNavLink>
                    <MobileNavLink to="/buy" icon="🛒" onClick={() => setMobileMenuOpen(false)}>
                      Acheter des Tickets
                    </MobileNavLink>
                    <MobileNavLink to="/profile" icon="👤" onClick={() => setMobileMenuOpen(false)}>
                      Mon Profil
                    </MobileNavLink>
                  </>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center space-x-3 w-full mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition"
              >
                <span className="text-lg">🚪</span>
                <span className="font-semibold text-sm">Déconnexion</span>
              </button>
            </>
          ) : (
            /* Login/Register for guests */
            <div className="space-y-3 mt-4">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-500 rounded-xl font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition transform hover:scale-[1.02]"
              >
                🎉 S'inscrire et Participer
              </Link>
            </div>
          )}

          {/* Bottom Promo */}
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium mb-1">🎯 Prochain tirage</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">Participez maintenant pour gagner !</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Desktop NavLink Component
const NavLink = ({ to, active, children }) => (
  <Link
    to={to}
    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
      active
        ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
    }`}
  >
    {children}
  </Link>
);

// Mobile NavLink Component  
const MobileNavLink = ({ to, icon, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
  >
    <span className="text-lg">{icon}</span>
    <span className="font-medium text-sm">{children}</span>
  </Link>
);

export { Navbar };
export default Navbar;
