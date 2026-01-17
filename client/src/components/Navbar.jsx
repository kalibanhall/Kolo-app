import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoKoloIcon } from './LogoKolo';
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-14">
          {/* Logo - More Compact on Mobile */}
          <Link to="/" className="flex items-center hover:opacity-80 transition group">
            <LogoKoloIcon size="small" animated />
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
              À-propos
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
                            className="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                          >
                            <span className="text-sm font-medium">Dashboard Admin</span>
                          </Link>
                        ) : (
                          <>
                            <Link
                              to="/wallet"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                            >
                              <span className="text-sm font-medium">Mon Portefeuille</span>
                            </Link>
                            <Link
                              to="/profile"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                            >
                              <span className="text-sm font-medium">Mon Profil</span>
                            </Link>
                          </>
                        )}
                        
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center px-4 py-2.5 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
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
          <div className="flex md:hidden items-center space-x-1">
            <ThemeToggle compact />
            {user && <NotificationBell compact />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Menu"
            >
              <div className="w-4 h-4 flex flex-col justify-center items-center relative">
                <span className={`block w-4 h-0.5 bg-gray-700 dark:bg-gray-300 rounded-full transform transition-all duration-300 ${
                  mobileMenuOpen ? 'rotate-45 absolute' : '-translate-y-1'
                }`} />
                <span className={`block w-4 h-0.5 bg-gray-700 dark:bg-gray-300 rounded-full transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`} />
                <span className={`block w-4 h-0.5 bg-gray-700 dark:bg-gray-300 rounded-full transform transition-all duration-300 ${
                  mobileMenuOpen ? '-rotate-45 absolute' : 'translate-y-1'
                }`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Compact Modern Slide */}
      <div className={`md:hidden fixed inset-x-0 top-12 bottom-0 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full overflow-y-auto px-3 py-3">
          {/* User Info (if logged in) - Compact */}
          {user && (
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Navigation Links - Compact */}
          <div className="space-y-0.5">
            <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>
              Accueil
            </MobileNavLink>
            <button
              onClick={() => scrollToSection('campagnes')}
              className="flex items-center w-full px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition text-sm"
            >
              Campagnes
            </button>
            <MobileNavLink to="/about" onClick={() => setMobileMenuOpen(false)}>
              À-propos
            </MobileNavLink>
            <MobileNavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </MobileNavLink>
          </div>

          <hr className="my-3 border-gray-200 dark:border-gray-700" />

          {user ? (
            <>
              {/* User Actions - Compact */}
              <div className="space-y-0.5">
                {user.is_admin ? (
                  <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard Admin
                  </MobileNavLink>
                ) : (
                  <>
                    <MobileNavLink to="/wallet" onClick={() => setMobileMenuOpen(false)}>
                      Mon Portefeuille
                    </MobileNavLink>
                    <MobileNavLink to="/buy" onClick={() => setMobileMenuOpen(false)}>
                      Acheter des Tickets
                    </MobileNavLink>
                    <MobileNavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      Mon Profil
                    </MobileNavLink>
                  </>
                )}
              </div>

              {/* Logout Button - Compact */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition text-sm font-medium"
              >
                Déconnexion
              </button>
            </>
          ) : (
            /* Login/Register for guests - Compact */
            <div className="space-y-2 mt-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-3 py-2 text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-500 rounded-lg font-medium text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium text-sm shadow hover:shadow-lg transition"
              >
                S'inscrire
              </Link>
            </div>
          )}
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

// Mobile NavLink Component - Compact
const MobileNavLink = ({ to, icon, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition text-sm"
  >
    {icon && <span className="text-base">{icon}</span>}
    <span className="font-medium">{children}</span>
  </Link>
);

export { Navbar };
export default Navbar;