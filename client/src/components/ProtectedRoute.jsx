import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, adminOnly = false, userOnly = false, allowAdmin = false, influencerOnly = false, requiredLevel = 0 }) => {
  const { user, loading, isAdmin, getAdminLevel, isInfluencer } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route influenceur uniquement
  if (influencerOnly && !isInfluencer() && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Si route admin uniquement et user n'est pas admin
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Si un niveau admin minimum est requis
  if (requiredLevel > 0 && getAdminLevel() < requiredLevel) {
    return <Navigate to="/admin" replace />;
  }

  // Si route utilisateur uniquement et user est admin, rediriger vers tableau de bord admin
  if (userOnly && isAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  // Si influenceur essaie d'accéder à une page utilisateur, rediriger vers son dashboard
  if (userOnly && isInfluencer() && !isAdmin()) {
    return <Navigate to="/influencer" replace />;
  }

  // Si admin essaie d'accéder à une page qui n'autorise pas les admins
  if (isAdmin() && !adminOnly && !allowAdmin && !influencerOnly) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};
