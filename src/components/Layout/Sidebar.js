import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX, FiEye, FiCalendar, FiUsers, FiTarget, FiFileText, FiClipboard, FiBook, FiAward, FiSend, FiBell, FiFile, FiBookOpen } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { t } = useLanguage();

  const menuItems = [
    { 
      label: t('nav.transparencyBoard'),
      icon: FiEye,
      children: [
        { path: '/', label: t('nav.overview'), icon: FiEye },
        { path: '/announcements', label: t('nav.announcements'), icon: FiBell },
        { path: '/memorandum', label: t('nav.memorandum'), icon: FiFile },
      ]
    },
    { path: '/calendar', label: t('nav.calendar'), icon: FiCalendar },
    { 
      label: 'SSC',
      icon: FiUsers,
      children: [
        { path: '/ssc', label: t('nav.overview'), icon: FiUsers },
        { path: '/ssc/about', label: t('nav.about'), icon: FiTarget },
        { path: '/ssc/constitution', label: t('nav.constitution'), icon: FiBookOpen },
        { path: '/ssc/resolutions', label: t('nav.resolutions'), icon: FiFileText },
        { path: '/ssc/minutes-of-meeting', label: t('nav.minutes'), icon: FiClipboard },
        { path: '/ssc/narrative-reports', label: t('nav.reports'), icon: FiBook },
        { path: '/ssc/accomplishments', label: t('nav.accomplishments'), icon: FiAward },
        { path: '/ssc/request-letters', label: t('nav.requestLetters'), icon: FiSend },
      ]
    },
  ];

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={closeSidebar} />
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">SSC</div>
            <div className="logo-text">
              <span className="logo-title">Virtual Board</span>
              <span className="logo-subtitle">Student Supreme Council</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={closeSidebar}>
            <FiX />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <div key={index} className="sidebar-section">
              {item.path ? (
                <Link 
                  to={item.path} 
                  className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <item.icon className="sidebar-icon" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <>
                  <div className="sidebar-label">
                    <item.icon className="sidebar-icon" />
                    <span>{item.label}</span>
                  </div>
                  <div className="sidebar-children">
                    {item.children.map((child) => (
                      <Link 
                        key={child.path}
                        to={child.path} 
                        className={`sidebar-child-link ${location.pathname === child.path ? 'active' : ''}`}
                        onClick={closeSidebar}
                      >
                        <child.icon className="sidebar-child-icon" />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <Link to="/admin" className="sidebar-admin-btn" onClick={closeSidebar}>
            Admin Panel
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
