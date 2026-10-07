import React, { useMemo, useState } from 'react';
import { FiLogOut, FiSearch, FiX } from 'react-icons/fi';
import { filterNav } from './adminNav';
import sscLogo from '../../assets/ssc_logo.svg';
import './AdminShell.css';

/**
 * The admin navigation rail.
 *
 * Three states, not two: a full column on desktop, a narrow icon rail when the
 * council collapses it to win back width for a wide table, and an off canvas
 * drawer below 1024px. The drawer always shows labels, because a bare icon
 * strip on a phone is a guessing game.
 */
const AdminSidebar = ({
  activeSection,
  onSelect,
  open,
  onClose,
  collapsed,
  adminEmail,
  onLogout,
  badges = {},
  academicYear
}) => {
  const [query, setQuery] = useState('');

  const sections = useMemo(() => filterNav(collapsed ? '' : query), [query, collapsed]);
  const firstMatch = sections[0]?.items[0];

  const go = (id) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  // Type, then Enter, without reaching for the mouse. Escape clears rather
  // than closing the drawer, so a mistyped query is one key from fixed.
  const onSearchKeyDown = (event) => {
    if (event.key === 'Enter' && firstMatch) {
      event.preventDefault();
      go(firstMatch.id);
    }
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
    }
  };

  const initial = (adminEmail || 'A').charAt(0).toUpperCase();

  return (
    <aside
      className={`admin-sidebar${open ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Admin sections"
    >
      <div className="side-brand">
        <img src={sscLogo} alt="" className="side-brand-mark" />
        <span className="side-brand-text">
          <strong>PSU-UCC</strong>
          <small>Admin Console</small>
        </span>
        <button type="button" className="side-close" onClick={onClose} aria-label="Close menu">
          <FiX />
        </button>
      </div>

      <div className="side-search">
        <FiSearch aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Jump to a section"
          aria-label="Filter admin sections"
        />
        {!!query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear filter">
            <FiX />
          </button>
        )}
      </div>

      <nav className="side-nav">
        {sections.map((section) => (
          <div className="side-group" key={section.group}>
            <p className="side-group-label">{section.group}</p>
            {section.items.map((item) => {
              const count = badges[item.id] || 0;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`side-link${isActive ? ' is-active' : ''}`}
                  onClick={() => go(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  /* A fallback for the collapsed rail on a device with no
                     hover, where the flyout never opens. */
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon aria-hidden="true" />
                  <span className="side-link-text">{item.label}</span>
                  {count > 0 && (
                    <span className="side-count" aria-label={`${count} new`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {!sections.length && (
          <p className="side-empty">
            Nothing matches that.
            <button type="button" onClick={() => setQuery('')}>Clear</button>
          </p>
        )}
      </nav>

      <div className="side-foot">
        {/* Ambient status rather than a control. It sits down here because the
            brand row has no width to spare once the wordmark is in it. */}
        {!!academicYear && (
          <p className="side-year">
            Academic year <strong>{academicYear}</strong>
          </p>
        )}

        <div className="side-user" title={adminEmail || 'Admin'}>
          <span className="side-avatar" aria-hidden="true">{initial}</span>
          <span className="side-user-text">
            <strong>{adminEmail || 'Admin'}</strong>
            <small>Signed in</small>
          </span>
        </div>
        <button type="button" className="side-logout" onClick={onLogout} title={collapsed ? 'Log out' : undefined}>
          <FiLogOut aria-hidden="true" />
          <span className="side-link-text">Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
