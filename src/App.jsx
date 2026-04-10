import './App.css'
import { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from './pages/Login';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailConfirm from './pages/VerifyEmailConfirm';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ComingSoon from './pages/ComingSoon';
import AdminLayout from './admin/AdminLayout';
import AdminOverview from './admin/pages/Overview';
import AdminRevenue from './admin/pages/Revenue';
import AdminUsers from './admin/pages/Users';
import AdminAIUsage from './admin/pages/AIUsage';
import AdminTokenCosts from './admin/pages/TokenCosts';
import AdminProduct from './admin/pages/Product';
import AdminFunnel from './admin/pages/Funnel';
import AdminRetention from './admin/pages/Retention';
import AdminMarketing from './admin/pages/Marketing';
import AdminInfra from './admin/pages/Infrastructure';
import AdminAlerts from './admin/pages/Alerts';
import AdminSettings from './admin/pages/Settings';
import AdminUserLogs from './admin/pages/UserLogs';
import AdminBehavior from './admin/pages/Behavior';
import AdminUserAnalytics from './admin/pages/UserAnalytics';
import AdminSources from './admin/pages/Sources';
import AdminWaitlist from './admin/pages/Waitlist';
import AdminScrapeUsage from './admin/pages/ScrapeUsage';

// Apply saved language direction on every page load
const lang = localStorage.getItem('hirematex_lang') || 'en';
document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = lang;

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const ADMIN_EMAILS = ['hirematrix.ai@gmail.com', 'saree.ali28@gmail.com', 'faizkh14@gmail.com'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated, user } = useAuth();

  const isAdmin = isAuthenticated && ADMIN_EMAILS.includes(user?.email?.toLowerCase());

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      {/* Coming soon — everyone except admins */}
      <Route path="/coming-soon" element={<ComingSoon />} />

      {/* Public routes — login kept for admin access */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/coming-soon" replace />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-email/confirm" element={<VerifyEmailConfirm />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />

      {/* Protected routes — admins only until launch */}
      <Route path="/" element={
        isAdmin ? (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        ) : (
          <Navigate to="/coming-soon" replace />
        )
      } />

      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            isAdmin ? (
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            ) : (
              <Navigate to="/coming-soon" replace />
            )
          }
        />
      ))}

      {/* Admin routes — restricted to admin emails */}
      {(() => {
        const adminEl = (el) => isAdmin ? el : <Navigate to="/coming-soon" replace />;
        return <>
          <Route path="/admin" element={adminEl(<AdminLayout><AdminOverview /></AdminLayout>)} />
          <Route path="/admin/revenue" element={adminEl(<AdminLayout><AdminRevenue /></AdminLayout>)} />
          <Route path="/admin/users" element={adminEl(<AdminLayout><AdminUsers /></AdminLayout>)} />
          <Route path="/admin/user-logs" element={adminEl(<AdminLayout><AdminUserLogs /></AdminLayout>)} />
          <Route path="/admin/ai-usage" element={adminEl(<AdminLayout><AdminAIUsage /></AdminLayout>)} />
          <Route path="/admin/token-costs" element={adminEl(<AdminLayout><AdminTokenCosts /></AdminLayout>)} />
          <Route path="/admin/product" element={adminEl(<AdminLayout><AdminProduct /></AdminLayout>)} />
          <Route path="/admin/funnel" element={adminEl(<AdminLayout><AdminFunnel /></AdminLayout>)} />
          <Route path="/admin/retention" element={adminEl(<AdminLayout><AdminRetention /></AdminLayout>)} />
          <Route path="/admin/marketing" element={adminEl(<AdminLayout><AdminMarketing /></AdminLayout>)} />
          <Route path="/admin/infra" element={adminEl(<AdminLayout><AdminInfra /></AdminLayout>)} />
          <Route path="/admin/alerts" element={adminEl(<AdminLayout><AdminAlerts /></AdminLayout>)} />
          <Route path="/admin/settings" element={adminEl(<AdminLayout><AdminSettings /></AdminLayout>)} />
          <Route path="/admin/behavior" element={adminEl(<AdminLayout><AdminBehavior /></AdminLayout>)} />
          <Route path="/admin/user-analytics" element={adminEl(<AdminLayout><AdminUserAnalytics /></AdminLayout>)} />
          <Route path="/admin/sources" element={adminEl(<AdminLayout><AdminSources /></AdminLayout>)} />
          <Route path="/admin/waitlist" element={adminEl(<AdminLayout><AdminWaitlist /></AdminLayout>)} />
          <Route path="/admin/scrape-usage" element={adminEl(<AdminLayout><AdminScrapeUsage /></AdminLayout>)} />
        </>;
      })()}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <Sonner richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
