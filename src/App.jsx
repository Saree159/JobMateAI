import './App.css'
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
import Register from './pages/Register';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailConfirm from './pages/VerifyEmailConfirm';
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

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();

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
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-email/confirm" element={<VerifyEmailConfirm />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        isAuthenticated ? (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            isAuthenticated ? (
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      ))}
      
      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
      <Route path="/admin/revenue" element={<AdminLayout><AdminRevenue /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
      <Route path="/admin/ai-usage" element={<AdminLayout><AdminAIUsage /></AdminLayout>} />
      <Route path="/admin/token-costs" element={<AdminLayout><AdminTokenCosts /></AdminLayout>} />
      <Route path="/admin/product" element={<AdminLayout><AdminProduct /></AdminLayout>} />
      <Route path="/admin/funnel" element={<AdminLayout><AdminFunnel /></AdminLayout>} />
      <Route path="/admin/retention" element={<AdminLayout><AdminRetention /></AdminLayout>} />
      <Route path="/admin/marketing" element={<AdminLayout><AdminMarketing /></AdminLayout>} />
      <Route path="/admin/infra" element={<AdminLayout><AdminInfra /></AdminLayout>} />
      <Route path="/admin/alerts" element={<AdminLayout><AdminAlerts /></AdminLayout>} />
      <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />

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
