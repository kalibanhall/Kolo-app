import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { ScrollToTop } from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';

// Critical pages loaded immediately
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';

// Lazy-load non-critical pages
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const BuyTicketsPage = lazy(() => import('./pages/BuyTicketsPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ParticipantsPage = lazy(() => import('./pages/ParticipantsPage').then(m => ({ default: m.ParticipantsPage })));
const DrawManagementPage = lazy(() => import('./pages/DrawManagementPage'));
const CampaignsManagementPage = lazy(() => import('./pages/CampaignsManagementPage').then(m => ({ default: m.CampaignsManagementPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const VisionPage = lazy(() => import('./pages/VisionPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'));
const AdminActionsPage = lazy(() => import('./pages/AdminActionsPage'));
const AdminLogsPage = lazy(() => import('./pages/AdminLogsPage'));
const AdminDebugPage = lazy(() => import('./pages/AdminDebugPage'));
const PrizeDeliveryPage = lazy(() => import('./pages/PrizeDeliveryPage'));
const UserInvoicesPage = lazy(() => import('./pages/UserInvoicesPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const UserTransactionsPage = lazy(() => import('./pages/UserTransactionsPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PaymentPendingPage = lazy(() => import('./pages/PaymentPendingPage'));
const AdminPromosPage = lazy(() => import('./pages/AdminPromosPage'));
const AdminManagementPage = lazy(() => import('./pages/AdminManagementPage'));
const AdminInfluencersPage = lazy(() => import('./pages/AdminInfluencersPage'));
const AdminValidationsPage = lazy(() => import('./pages/AdminValidationsPage'));
const InfluencerDashboard = lazy(() => import('./pages/InfluencerDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <NotificationsProvider>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
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
              <Route path="/terms" element={<TermsPage />} />
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
            path="/buy/:campaignId?"
            element={
              <ProtectedRoute userOnly={true}>
                <BuyTicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute userOnly={true}>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute userOnly={true}>
                <UserTransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/pending"
            element={
              <ProtectedRoute userOnly={true}>
                <PaymentPendingPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes (Protected + Admin Only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={3}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/participants"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={3}>
                <ParticipantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/draw"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={2}>
                <DrawManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/draws"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={2}>
                <DrawManagementPage />
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
              <ProtectedRoute adminOnly={true} requiredLevel={2}>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={2}>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/actions"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={3}>
                <AdminActionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={3}>
                <AdminLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/debug"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={3}>
                <AdminDebugPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={2}>
                <PrizeDeliveryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promos"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminInfluencersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-admins"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={3}>
                <AdminManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/influencers"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminInfluencersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/validations"
            element={
              <ProtectedRoute adminOnly={true} requiredLevel={2}>
                <AdminValidationsPage />
              </ProtectedRoute>
            }
          />

          {/* Influencer Routes */}
          <Route
            path="/influencer"
            element={
              <ProtectedRoute influencerOnly={true}>
                <InfluencerDashboard />
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
          </NotificationsProvider>
        </AuthProvider>
        <IOSInstallPrompt />
      </Router>
      </ThemeProvider>
      </ErrorBoundary>
  );
}

export default App;
