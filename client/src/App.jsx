import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import AppLayout  from './components/layout/AppLayout';
import Login      from './pages/Login';
import Register   from './pages/Register';
import Dashboard  from './pages/Dashboard';
import Inbox      from './pages/Inbox';
import Leads      from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Pipeline   from './pages/Pipeline';
import Agents     from './pages/Agents';
import Analytics  from './pages/Analytics';
import Settings   from './pages/Settings';
import Billing    from './pages/Billing';
import Templates from './pages/Templates';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Blocks agents from owner-only pages — redirects to inbox
function OwnerRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.type === 'agent') return <Navigate to="/inbox" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index                element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<Dashboard  />} />
            <Route path="inbox"         element={<Inbox      />} />
            <Route path="leads"         element={<Leads      />} />
            <Route path="leads/:id"     element={<LeadDetail />} />
            <Route path="pipeline"      element={<Pipeline   />} />
            <Route path="agents"        element={<OwnerRoute><Agents     /></OwnerRoute>} />
            <Route path="analytics"     element={<OwnerRoute><Analytics  /></OwnerRoute>} />
            <Route path="settings"      element={<Settings   />} />
            <Route path="billing"       element={<OwnerRoute><Billing    /></OwnerRoute>} />
            <Route path="templates"     element={<Templates  />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
          },
          success: { iconTheme: { primary: '#10b77f', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}