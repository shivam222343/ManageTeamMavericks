import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import ThemeToggle from './components/ui/ThemeToggle';

// Layouts
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
import PublicLanding from './pages/public/PublicLanding';
import SuccessPage from './pages/public/SuccessPage';

// Auth Pages
import Login from './pages/auth/Login';

// Admin Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import ApplicantList from './pages/applicants/ApplicantList';
import ApplicantProfile from './pages/applicants/ApplicantProfile';
import CampaignList from './pages/campaign/CampaignList';
import FormBuilderPage from './pages/campaign/FormBuilderPage';
import DomainConfigPage from './pages/campaign/DomainConfigPage';
import EmailTemplatesPage from './pages/settings/EmailTemplatesPage';
import PlaceholderPage from './pages/PlaceholderPage';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';
import RecruitmentAnalytics from './pages/recruitment/RecruitmentAnalytics';
import FAQManagement from './pages/recruitment/FAQManagement';

import MajorLoader from './components/ui/MajorLoader';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <MajorLoader size="h-16 w-16" logoSize="w-9 h-9" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-800 border',
          duration: 3000,
        }}
      />
      <Routes>
        {/* Public Recruitment routes */}
        <Route path="/teammavericks/:slug" element={<PublicLanding />} />
        <Route path="/teammavericks/apply-success" element={<SuccessPage />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard admin routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Main Dashboard Overview */}
          <Route index element={<DashboardHome />} />
          
          {/* Applicant Management */}
          <Route path="applicants" element={<ApplicantList />} />
          <Route path="applicants/:id" element={<ApplicantProfile />} />

          {/* Campaign Configuration (Coordinators and Core Members) */}
          <Route 
            path="campaigns" 
            element={
              <ProtectedRoute allowedRoles={['coordinator', 'core_member']}>
                <CampaignList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="campaigns/:id/form" 
            element={
              <ProtectedRoute allowedRoles={['coordinator', 'core_member']}>
                <FormBuilderPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="campaigns/:id/domains" 
            element={
              <ProtectedRoute allowedRoles={['coordinator', 'core_member']}>
                <DomainConfigPage />
              </ProtectedRoute>
            } 
          />

          {/* Email Templates settings (Coordinators only) */}
          <Route 
            path="settings/email-templates" 
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <EmailTemplatesPage />
              </ProtectedRoute>
            } 
          />

          {/* New navigation items placeholders */}
          <Route path="approvals" element={<PlaceholderPage title="Approvals" />} />
          <Route path="meetings" element={<PlaceholderPage title="Meetings" />} />
          <Route path="events" element={<PlaceholderPage title="Events" />} />
          <Route path="tasks" element={<PlaceholderPage title="Tasks" />} />
          <Route path="members" element={<PlaceholderPage title="Members" />} />
          <Route path="recruitment" element={<Navigate to="form" replace />} />
          <Route path="recruitment/form" element={<RecruitmentPage />} />
          <Route path="recruitment/applications" element={<ApplicantList />} />
          <Route path="recruitment/applications/:id" element={<ApplicantProfile />} />
          <Route path="recruitment/analytics" element={<RecruitmentAnalytics />} />
          <Route path="recruitment/faqs" element={<FAQManagement />} />
          <Route path="finance" element={<PlaceholderPage title="Finance" />} />
        </Route>

        {/* Fallback routing */}
        <Route path="/" element={<Navigate to="/teammavericks/recruitment-2026" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ThemeToggle />
    </BrowserRouter>
  );
}

export default App;
