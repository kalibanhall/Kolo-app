import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
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

  // Vérifier le token au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
      setUser(null);
      authAPI.logout();
    } finally {
      setLoading(false);
    }
  };

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
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
