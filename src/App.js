import React, { createContext, useMemo } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

// Layout Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Sidebar from './components/Layout/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { ArchiveNotice } from './components/AcademicYearPicker';
import UpdatePrompt from './components/UpdatePrompt';
import UndoToast from './components/UndoToast';

// Pages
import TransparencyBoard from './pages/TransparencyBoard';
import Calendar from './pages/Calendar';
import SSC from './pages/SSC';
import AboutSSC from './pages/AboutSSC';
import ContactUs from './pages/ContactUs';
import Resolutions from './pages/Resolutions';
import MOM from './pages/MOM';
import NarrativeReports from './pages/NarrativeReports';
import AccomplishmentTracker from './pages/AccomplishmentTracker';
import RequestLetters from './pages/RequestLetters';
import Announcements from './pages/Announcements';
import MemorandumOrders from './pages/MemorandumOrders';
import ConstitutionByLaws from './pages/ConstitutionByLaws';

// Admin
import AdminLogin from './pages/Admin/AdminLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';

import { useVoterAuth } from './context/VoterAuthContext';
import { useLanguage } from './context/LanguageContext';

/**
 * Admin state, consumed by every page to decide whether to show edit controls.
 *
 * `isAdmin` is now the *server-verifiable* answer: a real Firebase Auth session
 * whose uid has a document in the `admins` collection. It used to be a
 * localStorage flag set by a hardcoded username and password, which Firestore
 * had no way to check — so the security rules had to leave every content
 * collection world-writable. This is the change that let those rules close.
 */
export const AuthContext = createContext();

// Layout wrapper for public pages
const PublicLayout = ({ children, setSidebarOpen, sidebarOpen }) => {
  const { t } = useLanguage();
  return (
  <>
    <Navbar setSidebarOpen={setSidebarOpen} />
    <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
    {/* First stop for a keyboard or screen reader: jumps past the whole nav. */}
    <a className="skip-link" href="#main-content">{t('a11y.skipToContent')}</a>
    <main className="main-content" id="main-content" tabIndex={-1}>
      {/* Makes it unmistakable when the visitor is looking at a past council's
          work rather than this one's. */}
      <ArchiveNotice />
      {children}
    </main>
    <Footer />
  </>
  );
};

function App() {
  const { isSscAdmin, isCheckingAdmin, isAuthLoading, voter, signOut } = useVoterAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  // Resolving the session takes a moment on load. Until it settles, treat the
  // visitor as not an admin so edit controls never flash into view.
  const isResolvingAdmin = isAuthLoading || isCheckingAdmin;

  // Editing happens only inside the admin screen. The dashboard reuses several
  // public page components for its sections, so they keep their controls
  // there, while the public site always renders as a visitor sees it, even for
  // a signed-in officer.
  const authValue = useMemo(
    () => ({
      isAdmin: isSscAdmin && isAdminRoute,
      isResolvingAdmin,
      adminEmail: voter?.email || '',
      signOutAdmin: signOut
    }),
    [isSscAdmin, isAdminRoute, isResolvingAdmin, voter?.email, signOut]
  );

  return (
    <AuthContext.Provider value={authValue}>
      <div className="app">
        {/* Offline support, and the two prompts that come with it. */}
        <UpdatePrompt />

        {/* Mounted once, outside the routes, so the offer to undo a delete
            survives the navigation that often follows one. */}
        <UndoToast />

        {isAdminRoute ? (
          // Admin routes without public layout
          <ErrorBoundary key={location.pathname} scope="This admin page">
            <Routes>
              <Route path="/admin" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard/*"
                element={
                  isResolvingAdmin ? (
                    <div className="admin-route-checking">Checking your access…</div>
                  ) : isSscAdmin ? (
                    <AdminDashboard />
                  ) : (
                    // Deep-linking to the dashboard without a verified account
                    // lands on the sign-in screen rather than an empty shell.
                    <Navigate to="/admin" replace />
                  )
                }
              />
            </Routes>
          </ErrorBoundary>
        ) : (
          // Public routes with public layout
          <PublicLayout setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen}>
            {/* Keyed on the path so navigating away from a broken page clears
                the error instead of trapping the visitor on it. The navbar,
                sidebar and footer stay outside, so they keep working. */}
            <ErrorBoundary key={location.pathname} scope="This page">
              <Routes>
                <Route path="/" element={<TransparencyBoard />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/memorandum" element={<MemorandumOrders />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/ssc" element={<SSC />} />
                <Route path="/ssc/about" element={<AboutSSC />} />
                <Route path="/ssc/contact" element={<ContactUs />} />
                <Route path="/ssc/constitution" element={<ConstitutionByLaws />} />
                <Route path="/ssc/resolutions" element={<Resolutions />} />
                <Route path="/ssc/minutes-of-meeting" element={<MOM />} />
                <Route path="/ssc/narrative-reports" element={<NarrativeReports />} />
                <Route path="/ssc/accomplishments" element={<AccomplishmentTracker />} />
                <Route path="/ssc/request-letters" element={<RequestLetters />} />
              </Routes>
            </ErrorBoundary>
          </PublicLayout>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;
