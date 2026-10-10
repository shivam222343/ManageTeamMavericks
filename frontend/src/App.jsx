import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useCursor } from './context/CursorContext';
import ThemeToggle from './components/ui/ThemeToggle';

// Layouts
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
import PublicLanding from './pages/recruitment/PublicLanding';
import SuccessPage from './pages/recruitment/SuccessPage';
import PrnVerificationPage from './pages/recruitment/PrnVerificationPage';

// Auth Pages
import Login from './pages/auth/Login';
import UserLogin from './pages/auth/UserLogin';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ParticipantDashboard from './pages/participant/ParticipantDashboard';

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
import CommunicatePage from './pages/recruitment/CommunicatePage';
import PanelsPage from './pages/recruitment/PanelsPage';
import PanelDetailPage from './pages/recruitment/PanelDetailPage';
import AttendancePage from './pages/recruitment/AttendancePage';
import PortalSettings from './pages/settings/PortalSettings';

// Members Pages
import MavericksListPage from './pages/members/MavericksListPage';
import MemberProfilePage from './pages/members/MemberProfilePage';
import MemberCommunicatePage from './pages/members/MemberCommunicatePage';
import AddMembersPage from './pages/members/AddMembersPage';

// Events Pages
import EventsListPage from './pages/events/EventsListPage';
import CreateEventPage from './pages/events/CreateEventPage';
import EventDetailPage from './pages/events/EventDetailPage';
import EventFormBuilderPage from './pages/events/EventFormBuilderPage';
import EventRegistrationsPage from './pages/events/EventRegistrationsPage';
import EventRegistrationDetailPage from './pages/events/EventRegistrationDetailPage';
import PublicEventsPage from './pages/events/PublicEventsPage';
import PublicEventRegisterPage from './pages/events/PublicEventRegisterPage';
import EventAttendancePage from './pages/events/EventAttendancePage';
import SubEventControlRoomPage from './pages/events/SubEventControlRoomPage';
import CreateSubEventGroupPage from './pages/events/CreateSubEventGroupPage';
import AutoGroupSubEventPage from './pages/events/AutoGroupSubEventPage';
import MindSagaControlRoomPage from './pages/events/MindSagaControlRoomPage';
import MindSagaParticipantArena from './pages/events/MindSagaParticipantArena';
import MindSagaAptitudeTestPage from './pages/events/MindSagaAptitudeTestPage';
import MindSagaGamingArenaPage from './pages/events/MindSagaGamingArenaPage';
import MindSagaPublicEntryPage from './pages/events/MindSagaPublicEntryPage';

// Judge Portal Pages
import JudgeLoginPage from './pages/judge/JudgeLoginPage';
import JudgePortalPage from './pages/judge/JudgePortalPage';

import MajorLoader from './components/ui/MajorLoader';
import TargetCursor from './components/ui/TargetCursor';
import NotFoundPage from './pages/NotFoundPage';
import NotificationDrawer from './components/ui/NotificationDrawer';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/user-login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'participant' ? '/user/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated } = useAuth();
  const { cursorType } = useCursor();

  return (
    <BrowserRouter>
      {isAuthenticated && cursorType === 'target' && (
        <TargetCursor
          spinDuration={2}
          hideDefaultCursor
          parallaxOn
          hoverDuration={0.2}
          cursorColor="#ffffff"
          cursorColorOnTarget="#B497CF"
        />
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-800 border',
          duration: 3000,
        }}
      />
      <Routes>
        {/* Public Recruitment routes */}
        <Route path="/teammavericks/verify-prn" element={<PrnVerificationPage />} />
        <Route path="/teammavericks/:slug" element={<PublicLanding />} />
        <Route path="/teammavericks/apply-success" element={<SuccessPage />} />

        {/* Public Events routes */}
        <Route path="/events" element={<PublicEventsPage />} />
        <Route path="/events/:slug" element={<PublicEventRegisterPage />} />
        <Route path="/register/:slug" element={<PublicEventRegisterPage />} />

        {/* Public Mind Saga Assessment Platform Routes (Access with Unique Key & Live Lock Guard) */}
        <Route path="/mindsaga" element={<MindSagaPublicEntryPage />} />
        <Route path="/mindsaga/:subId" element={<MindSagaPublicEntryPage />} />
        <Route path="/events/:id/sub-events/:subId/mind-saga/portal" element={<MindSagaPublicEntryPage />} />
        <Route path="/events/:id/sub-events/:subId/mind-saga/enter" element={<MindSagaPublicEntryPage />} />

        <Route
          path="/events/:id/sub-events/:subId/mind-saga"
          element={
            <ProtectedRoute allowedRoles={['participant', 'coordinator', 'core_member', 'member']}>
              <MindSagaParticipantArena />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/sub-events/:subId/mind-saga/test"
          element={
            <ProtectedRoute allowedRoles={['participant', 'coordinator', 'core_member', 'member']}>
              <MindSagaAptitudeTestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/sub-events/:subId/mind-saga/game"
          element={
            <ProtectedRoute allowedRoles={['participant', 'coordinator', 'core_member', 'member']}>
              <MindSagaGamingArenaPage />
            </ProtectedRoute>
          }
        />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Judge Portal Public & Session Routes */}
        <Route path="/judge" element={<JudgeLoginPage />} />
        <Route path="/judge-login" element={<JudgeLoginPage />} />
        <Route path="/judge/login" element={<JudgeLoginPage />} />
        <Route path="/judge/portal" element={<JudgePortalPage />} />
        <Route path="/judge/dashboard" element={<JudgePortalPage />} />

        {/* Participant Portal routes */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRoles={['participant', 'coordinator', 'core_member', 'member']}>
              <ParticipantDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/profile"
          element={
            <ProtectedRoute allowedRoles={['participant', 'coordinator', 'core_member', 'member']}>
              <ParticipantDashboard />
            </ProtectedRoute>
          }
        />

        {/* Dashboard admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['coordinator', 'core_member', 'member']}>
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
          <Route
            path="settings/portal"
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <PortalSettings />
              </ProtectedRoute>
            }
          />

          {/* Events Management */}
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/create" element={<CreateEventPage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="events/:id/attendance" element={<EventAttendancePage />} />
          <Route path="events/:id/sub-events/:subId" element={<SubEventControlRoomPage />} />
          <Route path="events/:id/sub-events/:subId/mind-saga" element={<MindSagaControlRoomPage />} />
          <Route path="events/:id/sub-events/:subId/create-group" element={<CreateSubEventGroupPage />} />
          <Route path="events/:id/sub-events/:subId/auto-group" element={<AutoGroupSubEventPage />} />
          <Route path="events/:id/edit" element={<CreateEventPage />} />
          <Route path="events/:id/registration-form" element={<EventFormBuilderPage />} />
          <Route path="events/:id/registrations" element={<EventRegistrationsPage />} />
          <Route path="events/:id/registrations/:regId" element={<EventRegistrationDetailPage />} />

          {/* Other navigation items placeholders */}
          <Route path="approvals" element={<PlaceholderPage title="Approvals" />} />
          <Route path="meetings" element={<PlaceholderPage title="Meetings" />} />
          <Route path="tasks" element={<PlaceholderPage title="Tasks" />} />
          <Route path="members" element={<Navigate to="mavericks" replace />} />
          <Route path="members/mavericks" element={<MavericksListPage />} />
          <Route path="members/mavericks/:id" element={<MemberProfilePage />} />
          <Route path="members/communicate" element={<MemberCommunicatePage />} />
          <Route
            path="members/add"
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <AddMembersPage />
              </ProtectedRoute>
            }
          />
          <Route path="recruitment" element={<Navigate to="form" replace />} />
          <Route path="recruitment/form" element={<RecruitmentPage />} />
          <Route path="recruitment/applications" element={<ApplicantList />} />
          <Route path="recruitment/applications/:id" element={<ApplicantProfile />} />
          <Route path="recruitment/panels" element={<PanelsPage />} />
          <Route path="recruitment/panels/attendance" element={<AttendancePage />} />
          <Route path="recruitment/panels/:id" element={<PanelDetailPage />} />
          <Route path="recruitment/analytics" element={<RecruitmentAnalytics />} />
          <Route path="recruitment/faqs" element={<FAQManagement />} />
          <Route path="recruitment/communicate" element={<CommunicatePage />} />
          <Route path="finance" element={<PlaceholderPage title="Finance" />} />
        </Route>

        {/* Fallback routing */}
        <Route path="/" element={<Navigate to="/teammavericks/recruitment-2026" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <NotificationDrawer />
      <ThemeToggle />
    </BrowserRouter>
  );
}

export default App;