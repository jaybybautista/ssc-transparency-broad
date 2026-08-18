import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { FaFacebookF } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { formatAcademicYear } from '../../lib/academicYear';
import YearWheel from '../YearWheel';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { isDark, toggleTheme } = useTheme();
  // Was hardcoded "A.Y. 2025-2026", which would have quietly gone stale the
  // moment this council handed over.
  const { selectedYear } = useData();
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <div className="logo-images">
                  <img src={psuLogo} alt="PSU Logo" className="footer-logo-img" />
                  <img src={sscLogo} alt="SSC Logo" className="footer-logo-img" />
                </div>
                <div className="logo-text">
                  <span className="logo-subtitle">PSU Urdaneta City Campus</span>
                  <span className="logo-title">Supreme Student Council</span>
                </div>
              </div>
              <p className="footer-description">
                Pangasinan State University - Urdaneta City Campus. Promoting transparency, 
                accountability, and student engagement through digital innovation. {formatAcademicYear(selectedYear)}
              </p>
              <div className="footer-social">
                <a href="https://facebook.com/PSUurdanetaSSC" className="social-link facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                  <FaFacebookF />
                </a>
                <a href="mailto:ssc.urdanetacampus@psu.edu.ph" className="social-link gmail" aria-label="Gmail">
                  <SiGmail />
                </a>
              </div>
            </div>

            <div className="footer-links">
              <h4 className="footer-title">Quick Links</h4>
              <ul>
                <li><Link to="/">Transparency Board</Link></li>
                <li><Link to="/calendar">Calendar of Activities</Link></li>
                <li><Link to="/ssc">About SSC</Link></li>
                <li><Link to="/ssc/resolutions">Resolutions</Link></li>
              </ul>
            </div>

            <div className="footer-links">
              <h4 className="footer-title">SSC Resources</h4>
              <ul>
                <li><Link to="/ssc/about">About SSC</Link></li>
                <li><Link to="/ssc/constitution">Constitution &amp; By-Laws</Link></li>
                <li><Link to="/ssc/resolutions">Resolutions</Link></li>
                <li><Link to="/ssc/accomplishments">Accomplishments</Link></li>
                <li><Link to="/ssc/request-letters">Request Letters</Link></li>
              </ul>
            </div>

            <div className="footer-contact">
              <h4 className="footer-title">Contact Us</h4>
              <div className="contact-item">
                <FiMapPin className="contact-icon" />
                <span>PSU Urdaneta City Campus, Pangasinan</span>
              </div>
              <div className="contact-item">
                <FiMail className="contact-icon" />
                <span>ssc.urdanetacampus@psu.edu.ph</span>
              </div>
              <div className="contact-item">
                <FiPhone className="contact-icon" />
                <span>(075) 123-4567</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {currentYear} PSU-UCC Supreme Student Council. All rights reserved.</p>
          {/* Two easter eggs share this line: the academic year opens the year
              wheel, the heart switches the theme. Neither is advertised, and
              both carry their own accessible name so they are still reachable. */}
          <p>
            <button
              type="button"
              className="footer-year-btn"
              onClick={() => setYearPickerOpen(true)}
              title="Browse another academic year"
              aria-label={`Browse another academic year — currently ${formatAcademicYear(selectedYear)}`}
            >
              {formatAcademicYear(selectedYear)}
            </button>
            {' '}| Developed with{' '}
            <button
              type="button"
              className={`theme-heart ${isDark ? 'is-dark' : ''}`}
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
            >
              ❤️
            </button>{' '}
            for Student Welfare
          </p>
          {yearPickerOpen && <YearWheel onClose={() => setYearPickerOpen(false)} />}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
