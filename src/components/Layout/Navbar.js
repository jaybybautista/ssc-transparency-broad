import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiChevronDown, FiUser, FiMail } from 'react-icons/fi';
import { AuthContext } from '../../App';
import { GlobalSearchButton } from '../GlobalSearch';
import LanguageToggle from '../LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import { resolveLogo } from '../../lib/siteProfile';
import './Navbar.css';

const Navbar = ({ setSidebarOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const { isAdmin } = useContext(AuthContext);
  const { t } = useLanguage();
  const { siteProfile } = useData();


  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // These were left in English while the rest of the chrome switched, so a
  // Filipino visitor saw a half-translated bar.
  const navLinks = [
    {
      path: '/',
      label: t('nav.transparencyBoard'),
      dropdown: [
        { path: '/announcements', label: t('nav.announcements') },
        { path: '/memorandum', label: t('nav.memorandum') },
      ]
    },
    { path: '/calendar', label: t('nav.calendar') },
    {
      path: '/ssc',
      label: t('nav.ssc'),
      dropdown: [
        { path: '/ssc/about', label: t('nav.about') },
        { path: '/ssc/constitution', label: t('nav.constitution') },
        { path: '/ssc/resolutions', label: t('nav.resolutions') },
        { path: '/ssc/minutes-of-meeting', label: t('nav.minutes') },
        { path: '/ssc/narrative-reports', label: t('nav.reports') },
        { path: '/ssc/accomplishments', label: t('nav.accomplishments') },
        { path: '/ssc/request-letters', label: t('nav.requestLetters') },
      ]
    },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-images">
            <img src={resolveLogo(siteProfile.psuLogoUrl, psuLogo)} alt="" className="logo-psu" />
            <img src={resolveLogo(siteProfile.sscLogoUrl, sscLogo)} alt="" className="logo-ssc" />
          </div>
          <div className="logo-text">
            <span className="logo-subtitle">{siteProfile.campusName}</span>
            <span className="logo-title">{siteProfile.councilName}</span>
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
          {/* Search and language are one segmented control rather than two
              loose pills of slightly different heights. The year switcher is
              deliberately not here — it lives behind the academic year in the
              footer, so the bar stays about what students came for. */}
          <div className="navbar-tools">
            <GlobalSearchButton />
            <LanguageToggle />
          </div>

          <Link to="/ssc/contact" className="connect-btn">
            <FiMail />
            <span>{t('nav.contact')}</span>
          </Link>
          
          {!isAdmin && (
            <Link
              to="/admin"
              className="admin-btn icon-only"
              title={t('nav.admin')}
              aria-label={t('nav.admin')}
            >
              <FiUser />
            </Link>
          )}
          
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('nav.openMenu')}
          >
            <FiMenu />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
