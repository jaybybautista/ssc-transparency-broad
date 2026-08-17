import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiChevronDown, FiUser, FiMail, FiArrowLeft } from 'react-icons/fi';
import { AuthContext } from '../../App';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import './Navbar.css';

const Navbar = ({ setSidebarOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { 
      path: '/', 
      label: 'Virtual Transparency Board',
      dropdown: [
        { path: '/announcements', label: 'Announcements' },
        { path: '/memorandum', label: 'Memorandum Orders' },
      ]
    },
    { path: '/calendar', label: 'Calendar of Activities' },
    { 
      path: '/ssc', 
      label: 'SSC',
      dropdown: [
        { path: '/ssc/about', label: 'About SSC' },
        { path: '/ssc/constitution', label: 'Constitution & By-Laws' },
        { path: '/ssc/resolutions', label: 'Resolutions' },
        { path: '/ssc/minutes-of-meeting', label: 'Minutes of Meeting' },
        { path: '/ssc/narrative-reports', label: 'Narrative Reports' },
        { path: '/ssc/accomplishments', label: 'Accomplishment Tracker' },
        { path: '/ssc/request-letters', label: 'Request Letters' },
      ]
    },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-images">
            <img src={psuLogo} alt="PSU Logo" className="logo-psu" />
            <img src={sscLogo} alt="SSC Logo" className="logo-ssc" />
          </div>
          <div className="logo-text">
            <span className="logo-subtitle">PSU Urdaneta City Campus</span>
            <span className="logo-title">Supreme Student Council</span>
          </div>
        </Link>

        <ul className="navbar-links">
          {navLinks.map((link) => (
            <li 
              key={link.path}
              className={`nav-item ${link.dropdown ? 'has-dropdown' : ''}`}
              onMouseEnter={() => link.dropdown && setActiveDropdown(link.path)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link 
                to={link.path} 
                className={`nav-link ${location.pathname === link.path || location.pathname.startsWith(link.path + '/') ? 'active' : ''}`}
              >
                {link.label}
                {link.dropdown && <FiChevronDown className="dropdown-icon" />}
              </Link>
              
              {link.dropdown && activeDropdown === link.path && (
                <div className="dropdown-menu">
                  {link.dropdown.map((item) => (
                    <Link 
                      key={item.path} 
                      to={item.path} 
                      className={`dropdown-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          <Link to="/ssc/contact" className="connect-btn">
            <FiMail />
            <span>Connect with SSC</span>
          </Link>
          
          {isAdmin ? (
            <button 
              className="return-user-btn"
              // Goes to the public board without signing out — an officer
              // checking how a page looks to students should not have to
              // authenticate again to get back.
              onClick={() => navigate('/')}
            >
              <FiArrowLeft />
              <span>Return as User</span>
            </button>
          ) : (
            <Link to="/admin" className="admin-btn">
              <FiUser />
              <span>Admin</span>
            </Link>
          )}
          
          <button 
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FiMenu />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
