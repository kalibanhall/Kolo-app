import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI, getToken } from '../services/api';
import { signInWithGoogle, signOutGoogle } from '../config/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkAuthRef = useRef(false);
  const lastCheckRef = useRef(0);

  // Vérifier le token au chargement
  const checkAuth = useCallback(async (force = false) => {
    // Éviter les appels multiples simultanés
    if (checkAuthRef.current && !force) return;
    
    // Éviter de vérifier trop souvent (max une fois toutes les 30 secondes sauf si forcé)
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 30000) return;
    
    // Ne pas vérifier si pas de token
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    checkAuthRef.current = true;
    lastCheckRef.current = now;
    
    try {
      setLoading(true);
      const response = await authAPI.verify();
      setUser(response.user);
      setError(null);
    } catch (err) {
      // Ne pas logger les erreurs 401 (pas de token) au démarrage - c'est normal
      if (err.message !== 'No token provided') {
        console.error('Auth verification failed:', err);
      }
      // Ne pas déconnecter immédiatement en cas d'erreur réseau temporaire
      if (err.message.includes('fetch') || err.message.includes('network')) {
        console.warn('Network error during auth check, keeping current session');
      } else {
        setUser(null);
        authAPI.logout();
      }
    } finally {
      setLoading(false);
      checkAuthRef.current = false;
    }
  }, []);

  // Session timeout - déconnexion après 48 heures d'inactivité
  const SESSION_TIMEOUT = 48 * 60 * 60 * 1000; // 48 heures
  const lastActivityRef = useRef(Date.now());

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const checkSessionTimeout = useCallback(() => {
    if (!getToken()) return;
    
    const inactiveTime = Date.now() - lastActivityRef.current;
    if (inactiveTime >= SESSION_TIMEOUT) {
      console.log('Session expirée par inactivité');
      authAPI.logout();
      setUser(null);
      setError('Votre session a expiré par inactivité. Veuillez vous reconnecter.');
    }
  }, [SESSION_TIMEOUT]);

  useEffect(() => {
    checkAuth(true);
    
    // Vérifier le timeout de session toutes les 30 secondes (sans actualisation auto des données)
    const interval = setInterval(() => {
      if (getToken()) {
        checkSessionTimeout();
      }
    }, 30 * 1000);
    
    // Vérifier la session quand la fenêtre reprend le focus
    const handleFocus = () => {
      if (getToken()) {
        checkSessionTimeout();
      }
    };

    // Tracker l'activité utilisateur
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [checkAuth, checkSessionTimeout, updateActivity]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.login(email, password);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.register(userData);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Confirmation avant déconnexion
    const confirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
    if (confirmed) {
      authAPI.logout();
      try {
        await signOutGoogle();
      } catch (e) {
        // Ignore Google sign out errors
      }
      setUser(null);
      setError(null);
      return true;
    }
    return false;
  };

  // Google Sign-In
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const googleResult = await signInWithGoogle();
      
      if (!googleResult.success) {
        throw new Error(googleResult.error || 'Google sign-in failed');
      }

      // Send Google user data to backend
      const response = await authAPI.googleAuth({
        email: googleResult.user.email,
        name: googleResult.user.displayName,
        googleId: googleResult.user.uid,
        photoURL: googleResult.user.photoURL,
      });

      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return user?.is_admin === true;
  };

  const getAdminLevel = () => {
    if (!user?.is_admin) return 0;
    return user?.admin_level || 3; // Les anciens admins sans niveau = L3 (full access)
  };

  const isInfluencer = () => {
    return user?.is_influencer === true;
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    checkAuth,
    isAdmin,
    getAdminLevel,
    isInfluencer,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
