import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Materials from './pages/Materials';
import Vendors from './pages/Vendors';
import VendorProfile from './pages/VendorProfile';
import RulesMarkups from './pages/RulesMarkups';
import Templates from './pages/Templates';
import VendorMatching from './pages/VendorMatching';
import RFQManagement from './pages/RFQManagement';
import QuoteComparison from './pages/QuoteComparison';
import Contracts from './pages/Contracts';
import PlanViewerPage from './pages/PlanViewer';
import type { ReactNode } from 'react';
import './App.css';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
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
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <ProjectDetail />
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
            <Route path="/materials" element={
              <ProtectedRoute>
                <Materials />
              </ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute>
                <Vendors />
              </ProtectedRoute>
            } />
            <Route path="/vendors/:id" element={
              <ProtectedRoute>
                <VendorProfile />
              </ProtectedRoute>
            } />
            <Route path="/rules" element={
              <ProtectedRoute>
                <RulesMarkups />
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            } />
            <Route path="/contracts/:projectId" element={
              <ProtectedRoute>
                <Contracts />
              </ProtectedRoute>
            } />
            <Route path="/projects/:id/plans" element={
              <ProtectedRoute>
                <PlanViewerPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;