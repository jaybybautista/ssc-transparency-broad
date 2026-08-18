import React, { useState, useEffect, useLayoutEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiChevronDown, FiUser, FiMail, FiArrowLeft } from 'react-icons/fi';
import { AuthContext } from '../../App';
import { GlobalSearchButton } from '../GlobalSearch';
import LanguageToggle from '../LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import './Navbar.css';

const Navbar = ({ setSidebarOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const { t, language } = useLanguage();

  const [linksCollapsed, setLinksCollapsed] = useState(false);
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const linksRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /*
   * Fold the inline links into the hamburger when they genuinely do not fit,
   * measured rather than assumed from a pixel breakpoint.
   *
   * A fixed breakpoint is only ever right for one set of label widths. Switching
   * to Filipino turns "Connect with SSC" into "Makipag-ugnayan sa SSC" and the
   * row needed 1579px inside a 1400px container, so the buttons ran off the
   * right-hand edge. Measuring adapts to any language, and to renaming a section
   * later.
   *
   * When folded the list is moved out of the flow rather than display:none, so
   * its natural width stays measurable and the bar can expand again when there
   * is room.
   */
  useLayoutEffect(() => {
    let timer = 0;

    const measure = () => {
      const container = containerRef.current;
      const links = linksRef.current;
      const logo = logoRef.current;
      const actions = actionsRef.current;
      if (!container || !links || !logo || !actions) return;

      const styles = window.getComputedStyle(container);
      const gap = parseFloat(styles.columnGap) || 0;
      const available =
        container.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const needed = logo.offsetWidth + links.scrollWidth + actions.offsetWidth + gap * 2;

      // A few pixels of slack so sub-pixel rounding cannot flip this each frame.
      setLinksCollapsed(needed > available - 8);
    };

    /*
     * Coalesced on a timer, deliberately not requestAnimationFrame.
     *
     * The observer can deliver several entries for one resize, and measuring
     * inside its own callback risks the loop the browser guards against by
     * dropping notifications. rAF would coalesce them too — but rAF does not
     * run while the tab is not compositing, so a window resized in a background
     * tab would come back to a stale layout. A timer still fires.
     */
    const scheduleMeasure = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 60);
    };

    measure();

    const observer = new ResizeObserver(scheduleMeasure);
    if (containerRef.current) observer.observe(containerRef.current);

    // The observer alone proved unreliable for window resizes here, and a bar
    // that folds but never unfolds is worse than one that never folds.
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);

    // Web fonts land after first paint and change every label's width.
    document.fonts?.ready?.then(scheduleMeasure).catch(() => {});

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
    };
    // Re-measure when the labels themselves change.
  }, [language, isAdmin]);

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
      <div className={`navbar-container ${linksCollapsed ? 'is-compact' : ''}`} ref={containerRef}>
        <Link to="/" className="navbar-logo" ref={logoRef}>
          <div className="logo-images">
            <img src={psuLogo} alt="PSU Logo" className="logo-psu" />
            <img src={sscLogo} alt="SSC Logo" className="logo-ssc" />
          </div>
          <div className="logo-text">
            <span className="logo-subtitle">PSU Urdaneta City Campus</span>
            <span className="logo-title">Supreme Student Council</span>
          </div>
        </Link>

        <ul
          className={`navbar-links ${linksCollapsed ? 'is-collapsed' : ''}`}
          ref={linksRef}
          aria-hidden={linksCollapsed}
        >
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

        <div className="navbar-actions" ref={actionsRef}>
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
          
          {isAdmin ? (
            <button 
              className="return-user-btn"
              // Goes to the public board without signing out — an officer
              // checking how a page looks to students should not have to
              // authenticate again to get back.
              onClick={() => navigate('/')}
            >
              <FiArrowLeft />
              <span>{t('nav.returnAsUser')}</span>
            </button>
          ) : (
            <Link to="/admin" className="admin-btn">
              <FiUser />
              <span>{t('nav.admin')}</span>
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
