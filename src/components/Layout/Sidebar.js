import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX, FiEye, FiCalendar, FiUsers, FiTarget, FiFileText, FiClipboard, FiBook, FiAward, FiSend, FiBell, FiFile, FiBookOpen } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const menuItems = [
    { 
      label: 'Virtual Transparency Board',
      icon: FiEye,
      children: [
        { path: '/', label: 'Overview', icon: FiEye },
        { path: '/announcements', label: 'Announcements', icon: FiBell },
        { path: '/memorandum', label: 'Memorandum Orders', icon: FiFile },
      ]
    },
    { path: '/calendar', label: 'Calendar of Activities', icon: FiCalendar },
    { 
      label: 'SSC',
      icon: FiUsers,
      children: [
        { path: '/ssc', label: 'Overview', icon: FiUsers },
        { path: '/ssc/about', label: 'About SSC', icon: FiTarget },
        { path: '/ssc/constitution', label: 'Constitution & By-Laws', icon: FiBookOpen },
        { path: '/ssc/resolutions', label: 'Resolutions', icon: FiFileText },
        { path: '/ssc/minutes-of-meeting', label: 'Minutes of Meeting', icon: FiClipboard },
        { path: '/ssc/narrative-reports', label: 'Narrative Reports', icon: FiBook },
        { path: '/ssc/accomplishments', label: 'Accomplishment Tracker', icon: FiAward },
        { path: '/ssc/request-letters', label: 'Request Letters', icon: FiSend },
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
