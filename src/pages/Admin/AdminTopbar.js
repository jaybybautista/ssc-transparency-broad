import React from 'react';
import {
  FiChevronsLeft,
  FiChevronsRight,
  FiExternalLink,
  FiMenu,
  FiMoon,
  FiSun
} from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import './AdminShell.css';

/**
 * The bar above the working area.
 *
 * It carries context rather than decoration: the group name sits above the
 * section title, which is as much breadcrumb as a two level menu needs. The
 * bar is painted with the page surface, not the navy of the sidebar, so the
 * chrome is one dark column against a light workspace instead of a heavy dark
 * corner wrapping two sides of the screen.
 */
const AdminTopbar = ({ title, group, subtitle, collapsed, onToggleCollapse, onOpenMenu }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="admin-topbar">
      <button type="button" className="top-icon-btn top-menu" onClick={onOpenMenu} aria-label="Open menu">
        <FiMenu />
      </button>

      <button
        type="button"
        className="top-icon-btn top-collapse"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'}
        aria-pressed={collapsed}
      >
        {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
      </button>

      <div className="top-heading">
        {!!group && <p className="top-eyebrow">{group}</p>}
        <h1>{title}</h1>
      </div>

      <div className="top-actions">
        {!!subtitle && <span className="top-note">{subtitle}</span>}

        <a
          className="top-icon-btn"
          href="/"
          target="_blank"
          rel="noreferrer"
          title="Open the public site in a new tab"
          aria-label="Open the public site in a new tab"
        >
          <FiExternalLink />
        </a>

        <button
          type="button"
          className="top-icon-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <FiSun /> : <FiMoon />}
        </button>
      </div>
    </header>
  );
};

export default AdminTopbar;
