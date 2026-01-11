import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LogoKoloIcon } from './LogoKolo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { TicketIcon, TrashIcon } from './Icons';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart, getItemCount, removeFromCart, clearCart, verifyAvailability } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unavailableTickets, setUnavailableTickets] = useState([]);
  
  const composerCount = getItemCount();

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
    setComposerOpen(false);
  }, [location.pathname]);

  // Vérifier disponibilité quand on ouvre le compositeur
  const handleComposerOpen = async () => {
    if (!composerOpen && composerCount > 0) {
      setVerifying(true);
      setComposerOpen(true);
      try {
        const result = await verifyAvailability();
        if (result.unavailable && result.unavailable.length > 0) {
          setUnavailableTickets(result.unavailable);
        } else {
          setUnavailableTickets([]);
        }
      } catch (e) {
        console.error('Error verifying:', e);
      } finally {
        setVerifying(false);
      }
    } else {
      setComposerOpen(!composerOpen);
    }
  };

  // Acheter les tickets du compositeur
  const handleBuyComposer = () => {
    setComposerOpen(false);
    navigate('/buy');
  };

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
                
                {/* Composer Dropdown */}
                <div className="relative">
                  <button
                    onClick={handleComposerOpen}
                    className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <TicketIcon className="w-5 h-5" />
                    {composerCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                        {composerCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Composer Dropdown Content */}
                  {composerOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setComposerOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-20 border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold">Compositeur</h3>
                            <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">
                              {composerCount} ticket{composerCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {verifying ? (
                          <div className="p-4 text-center">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Vérification...</p>
                          </div>
                        ) : composerCount === 0 ? (
                          <div className="p-6 text-center">
                            <TicketIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun ticket sélectionné</p>
                            <Link
                              to="/buy"
                              onClick={() => setComposerOpen(false)}
                              className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:underline mt-2 block"
                            >
                              Sélectionner des tickets →
                            </Link>
                          </div>
                        ) : (
                          <>
                            {unavailableTickets.length > 0 && (
                              <div className="px-3 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-100 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  ⚠️ {unavailableTickets.length} ticket(s) retiré(s) (déjà vendus)
                                </p>
                              </div>
                            )}
                            <div className="max-h-48 overflow-y-auto p-2">
                              {cart.items.map((ticket, index) => (
                                <div key={ticket} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group">
                                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{ticket}</span>
                                  <button
                                    onClick={() => removeFromCart(ticket)}
                                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Total</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  ${(cart.campaign?.ticket_price || 2.99) * composerCount}
                                </span>
                              </div>
                              <button
                                onClick={handleBuyComposer}
                                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition text-sm"
                              >
                                Acheter ces tickets
                              </button>
                              <button
                                onClick={() => { clearCart(); setComposerOpen(false); }}
                                className="w-full py-1.5 text-gray-500 hover:text-red-500 text-xs transition"
                              >
                                Vider le compositeur
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
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
            {/* Mobile Composer Icon */}
            {user && (
              <button
                onClick={handleComposerOpen}
                className="relative p-1.5 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition"
              >
                <TicketIcon className="w-4 h-4" />
                {composerCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-purple-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {composerCount}
                  </span>
                )}
              </button>
            )}
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

          {/* Mobile Composer Dropdown - Positioned under navbar */}
          {composerOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setComposerOpen(false)} />
              <div className="md:hidden fixed left-2 right-2 top-14 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[70vh]">
                <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Compositeur</h3>
                    <button onClick={() => setComposerOpen(false)} className="p-1 hover:bg-white/20 rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {verifying ? (
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Vérification de disponibilité...</p>
                  </div>
                ) : composerCount === 0 ? (
                  <div className="p-6 text-center">
                    <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Aucun ticket sélectionné</p>
                    <Link
                      to="/buy"
                      onClick={() => setComposerOpen(false)}
                      className="inline-block mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm"
                    >
                      Sélectionner des tickets
                    </Link>
                  </div>
                ) : (
                  <>
                    {unavailableTickets.length > 0 && (
                      <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-100 dark:border-red-800">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          ⚠️ {unavailableTickets.length} ticket(s) retiré(s) car déjà vendus
                        </p>
                      </div>
                    )}
                    <div className="max-h-48 overflow-y-auto p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {cart.items.map((ticket) => (
                          <div key={ticket} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{ticket}</span>
                            <button
                              onClick={() => removeFromCart(ticket)}
                              className="p-1 text-gray-400 hover:text-red-500 transition"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{composerCount} ticket(s)</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          ${((cart.campaign?.ticket_price || 2.99) * composerCount).toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleBuyComposer}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition"
                      >
                        Acheter ces tickets
                      </button>
                      <button
                        onClick={() => { clearCart(); setComposerOpen(false); }}
                        className="w-full py-2 text-gray-500 hover:text-red-500 text-sm transition"
                      >
                        Vider le compositeur
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
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