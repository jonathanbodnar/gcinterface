import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import VendorMatching from './pages/VendorMatching';
import RFQManagement from './pages/RFQManagement';
import QuoteComparison from './pages/QuoteComparison';
import AdminCenter from './pages/AdminCenter';
import './App.css';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="/vendor-matching/:projectId" element={
              <ProtectedRoute>
                <VendorMatching />
              </ProtectedRoute>
            } />
            <Route path="/rfq/:projectId" element={
              <ProtectedRoute>
                <RFQManagement />
              </ProtectedRoute>
            } />
            <Route path="/quotes/:projectId" element={
              <ProtectedRoute>
                <QuoteComparison />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminCenter />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;