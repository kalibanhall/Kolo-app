import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { SplashScreen } from './components/SplashScreen';
import { ScrollToTop } from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';

// Critical pages loaded immediately
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';

// Lazy-load non-critical pages
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const BuyTicketsPage = lazy(() => import('./pages/BuyTicketsPage').then(m => ({ default: m.BuyTicketsPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ParticipantsPage = lazy(() => import('./pages/ParticipantsPage').then(m => ({ default: m.ParticipantsPage })));
const DrawResultsPage = lazy(() => import('./pages/DrawResultsPage'));
const CampaignsManagementPage = lazy(() => import('./pages/CampaignsManagementPage').then(m => ({ default: m.CampaignsManagementPage })));
const PendingPaymentsPage = lazy(() => import('./pages/PendingPaymentsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const VisionPage = lazy(() => import('./pages/VisionPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'));
const AdminActionsPage = lazy(() => import('./pages/AdminActionsPage'));
const AdminLogsPage = lazy(() => import('./pages/AdminLogsPage'));
const PrizeDeliveryPage = lazy(() => import('./pages/PrizeDeliveryPage'));
const UserInvoicesPage = lazy(() => import('./pages/UserInvoicesPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

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
      <ThemeProvider>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
              <LoadingSpinner />
            </div>
          }>
            <Routes>
              {/* Public Routes - Accessible only by non-admin users */}
              <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/vision" element={<VisionPage />} />
              <Route path="/contact" element={<ContactPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />

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
            path="/profile/invoices"
            element={
              <ProtectedRoute userOnly={true}>
                <UserInvoicesPage />
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
            path="/admin/actions"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminActionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery"
            element={
              <ProtectedRoute adminOnly={true}>
                <PrizeDeliveryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/invoices"
            element={
              <ProtectedRoute userOnly={true}>
                <UserInvoicesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
