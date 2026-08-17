import React, { useState, createContext } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Layout Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Sidebar from './components/Layout/Sidebar';

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

// Create Context for Admin Auth
export const AuthContext = createContext();

// Layout wrapper for public pages
const PublicLayout = ({ children, setSidebarOpen, sidebarOpen }) => (
  <>
    <Navbar setSidebarOpen={setSidebarOpen} />
    <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
    <main className="main-content">
      {children}
    </main>
    <Footer />
  </>
);

function App() {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('ssc_admin_auth') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <AuthContext.Provider value={{ isAdmin, setIsAdmin }}>
      <div className="app">
        {isAdminRoute ? (
          // Admin routes without public layout
          <Routes>
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
          </Routes>
        ) : (
          // Public routes with public layout
          <PublicLayout setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen}>
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
          </PublicLayout>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;
