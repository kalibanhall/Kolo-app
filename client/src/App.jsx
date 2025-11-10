import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { SplashScreen } from './components/SplashScreen';
import { ScrollToTop } from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserDashboard } from './pages/UserDashboard';
import { BuyTicketsPage } from './pages/BuyTicketsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ParticipantsPage } from './pages/ParticipantsPage';
import DrawResultsPage from './pages/DrawResultsPage';
import { CampaignsManagementPage } from './pages/CampaignsManagementPage';
import { HomePage } from './pages/HomePage';
import PendingPaymentsPage from './pages/PendingPaymentsPage';
import UserProfilePage from './pages/UserProfilePage';
import AboutPage from './pages/AboutPage';
import VisionPage from './pages/VisionPage';
import ContactPage from './pages/ContactPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import AdminActionsPage from './pages/AdminActionsPage';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Vérifier si c'est la première visite
    const hasVisited = sessionStorage.getItem('hasVisited');
    
    if (hasVisited) {
      // Si déjà visité dans cette session, pas de splash
      setShowSplash(false);
      setAppReady(true);
    } else {
      // Première visite, montrer le splash
      sessionStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    setAppReady(true);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
          {/* Public Routes - Accessible only by non-admin users */}
          <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<PublicRoute><AboutPage /></PublicRoute>} />
          <Route path="/vision" element={<PublicRoute><VisionPage /></PublicRoute>} />
          <Route path="/contact" element={<PublicRoute><ContactPage /></PublicRoute>} />
          <Route path="/campaigns/:id" element={<PublicRoute><CampaignDetailPage /></PublicRoute>} />

          {/* User Routes (Protected - Users Only) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute userOnly={true}>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buy"
            element={
              <ProtectedRoute userOnly={true}>
                <BuyTicketsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes (Protected + Admin Only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/participants"
            element={
              <ProtectedRoute adminOnly={true}>
                <ParticipantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/draw"
            element={
              <ProtectedRoute adminOnly={true}>
                <DrawResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campaigns"
            element={
              <ProtectedRoute adminOnly={true}>
                <CampaignsManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute adminOnly={true}>
                <PendingPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/actions"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminActionsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
