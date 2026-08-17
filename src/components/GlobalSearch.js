import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiX,
  FiBell,
  FiCalendar,
  FiFileText,
  FiUsers,
  FiClipboard,
  FiBook,
  FiAward,
  FiMail,
  FiBookOpen,
  FiCornerDownLeft
} from 'react-icons/fi';
import { useData } from '../context/DataContext';
import { richTextToPlain } from './richText';
import { formatAcademicYear } from '../lib/academicYear';
import useModalBehaviour from './useModalBehaviour';
import './GlobalSearch.css';

/**
 * One search across the whole board.
 *
 * Runs over what the app has already loaded rather than querying the database.
 * Firestore has no full-text search — matching "venue" inside a paragraph would
 * need an external index like Algolia — so this searches the current academic
 * year's loaded pages, and says so when there is more behind them. That is
 * honest and instant; the alternative is a paid dependency.
 */
const SECTIONS = [
  { key: 'announcements', label: 'Announcement', icon: FiBell, path: '/announcements',
    fields: (item) => [item.title, richTextToPlain(item.content), item.category] },
  { key: 'events', label: 'Activity', icon: FiCalendar, path: '/calendar',
    fields: (item) => [item.title, richTextToPlain(item.description), item.location] },
  { key: 'memorandums', label: 'Memorandum', icon: FiFileText, path: '/memorandum',
    fields: (item) => [item.number, item.title, richTextToPlain(item.description)] },
  { key: 'resolutions', label: 'Resolution', icon: FiFileText, path: '/ssc/resolutions',
    fields: (item) => [item.number, item.title, richTextToPlain(item.description)] },
  { key: 'officers', label: 'Officer', icon: FiUsers, path: '/ssc/about',
    fields: (item) => [item.name, item.position, item.course, item.division] },
  { key: 'meetings', label: 'Minutes', icon: FiClipboard, path: '/ssc/minutes-of-meeting',
    fields: (item) => [item.title, richTextToPlain(item.summary), item.location] },
  { key: 'narrativeReports', label: 'Report', icon: FiBook, path: '/ssc/narrative-reports',
    fields: (item) => [item.title, richTextToPlain(item.summary), item.event] },
  { key: 'accomplishments', label: 'Accomplishment', icon: FiAward, path: '/ssc/accomplishments',
    fields: (item) => [item.title, richTextToPlain(item.description), item.category] },
  { key: 'requestTypes', label: 'Request letter', icon: FiMail, path: '/ssc/request-letters',
    fields: (item) => [item.type, richTextToPlain(item.description)] },
  { key: 'constitution', label: 'Constitution', icon: FiBookOpen, path: '/ssc/constitution',
    fields: (item) => [item.title, item.category, richTextToPlain(item.description)] }
];

/** A short excerpt around the first match, so a hit in a paragraph is visible. */
const excerpt = (text, needle) => {
  const plain = String(text || '').replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  const at = plain.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return plain.slice(0, 110);
  const from = Math.max(0, at - 40);
  return `${from ? '…' : ''}${plain.slice(from, from + 130)}${plain.length > from + 130 ? '…' : ''}`;
};

const GlobalSearch = ({ onClose }) => {
  const data = useData();
  const { selectedYear, hasMore } = data;
  const navigate = useNavigate();

  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const dialogRef = useRef(null);
  useModalBehaviour(true, onClose, dialogRef);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) return [];

    const found = [];
    SECTIONS.forEach((section) => {
      const list = data[section.key] || [];
      list.forEach((item) => {
        const values = section.fields(item).filter(Boolean);
        const haystack = values.join(' ').toLowerCase();
        if (!haystack.includes(needle)) return;

        found.push({
          id: `${section.key}-${item.id}`,
          section,
          title: values[0] || 'Untitled',
          snippet: excerpt(values.slice(1).join(' — '), needle),
          date: item.date || item.effectiveDate || ''
        });
      });
    });

    // Title matches first, then most recent.
    return found
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(needle) ? 0 : 1;
        const bTitle = b.title.toLowerCase().includes(needle) ? 0 : 1;
        if (aTitle !== bTitle) return aTitle - bTitle;
        return new Date(b.date || 0) - new Date(a.date || 0);
      })
      .slice(0, 40);
  }, [term, data]);

  useEffect(() => setActiveIndex(0), [term]);

  const go = (result) => {
    navigate(result.section.path);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  const somethingUnloaded = Object.values(hasMore || {}).some(Boolean);

  return (
    <div className="modal-overlay global-search-overlay" onClick={onClose}>
      <div
        className="global-search"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search the board"
      >
        <div className="gs-input-row">
          <FiSearch className="gs-input-icon" />
          <input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search announcements, resolutions, officers, activities…"
            aria-label="Search the board"
            aria-controls="gs-results"
          />
          <button type="button" className="gs-close" onClick={onClose} aria-label="Close search">
            <FiX />
          </button>
        </div>

        <div className="gs-body" id="gs-results" role="listbox">
          {term.trim().length < 2 ? (
            <div className="gs-hint">
              <p>Type at least two letters.</p>
              <p className="gs-hint-small">
                Searching {formatAcademicYear(selectedYear)}. Use <kbd>↑</kbd> <kbd>↓</kbd> to move
                and <kbd>Enter</kbd> to open.
              </p>
            </div>
          ) : !results.length ? (
            <div className="gs-hint">
              <p>Nothing found for “{term.trim()}”.</p>
              <p className="gs-hint-small">
                This searches {formatAcademicYear(selectedYear)}
                {somethingUnloaded ? ', and only the records loaded so far — try “Load older” on the section you expect it in, or' : '. Try'}
                {' '}another academic year from the switcher.
              </p>
            </div>
          ) : (
            <>
              <div className="gs-count">
                {results.length} result{results.length === 1 ? '' : 's'} in {formatAcademicYear(selectedYear)}
              </div>
              <ul className="gs-results">
                {results.map((result, index) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`gs-result ${index === activeIndex ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(result)}
                    >
                      <span className="gs-result-icon"><result.section.icon /></span>
                      <span className="gs-result-text">
                        <span className="gs-result-title">{result.title}</span>
                        {!!result.snippet && <span className="gs-result-snippet">{result.snippet}</span>}
                      </span>
                      <span className="gs-result-type">{result.section.label}</span>
                      {index === activeIndex && <FiCornerDownLeft className="gs-enter" />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The search control in the navbar. Also binds Ctrl/Cmd+K and "/" so the
 * keyboard reaches it without touching the mouse.
 */
export const GlobalSearchButton = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(input|textarea|select)$/i.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="gs-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search the board"
        title="Search (Ctrl+K)"
      >
        <FiSearch />
        <span className="gs-trigger-label">Search</span>
        <kbd className="gs-trigger-kbd">Ctrl K</kbd>
      </button>
      {open && <GlobalSearch onClose={() => setOpen(false)} />}
    </>
  );
};

export default GlobalSearch;
