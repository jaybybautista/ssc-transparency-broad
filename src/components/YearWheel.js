import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiArchive, FiCheck } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import { formatAcademicYear } from '../lib/academicYear';
import useModalBehaviour from './useModalBehaviour';
import './YearWheel.css';

const ITEM_HEIGHT = 46;
const MAX_VISIBLE_ITEMS = 5;

/**
 * iOS-style scrolling year picker.
 *
 * The wheel is a plain scroll container with CSS scroll-snap rather than a
 * physics simulation: the browser already provides the momentum and the magnetic
 * settle, and doing it by hand would fight the platform's own touch handling on
 * exactly the phones this is meant for. Spacers above and below let the first
 * and last entries reach the middle.
 *
 * Rendered into <body>, not where it sits in the tree — the footer is inside a
 * stacking context, and the same containing-block trap that put the search
 * panel off-screen applies to anything position:fixed here too.
 */
const YearWheel = ({ onClose }) => {
  const { selectedYear, setSelectedYear, availableYears, currentYear } = useData();
  const years = availableYears?.length ? availableYears : [currentYear];
  // Only as tall as the years need: one year shows one row, not a five-row
  // wheel that is mostly empty and pushes the buttons off a phone screen.
  // Always odd, so the selection sits in the middle.
  const visibleItems = Math.min(MAX_VISIBLE_ITEMS, years.length * 2 - 1);
  const spacerHeight = ITEM_HEIGHT * ((visibleItems - 1) / 2);

  const listRef = useRef(null);
  const dialogRef = useRef(null);
  const settleTimer = useRef(null);
  const [index, setIndex] = useState(() => Math.max(0, years.indexOf(selectedYear)));

  useModalBehaviour(true, onClose, dialogRef);

  // Open with the current selection already under the highlight.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const start = Math.max(0, years.indexOf(selectedYear));
    list.scrollTop = start * ITEM_HEIGHT;
    setIndex(start);
    // Only on mount: afterwards the scroll handler owns this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    // Track the highlighted row live so it lights up mid-scroll...
    const live = Math.round(list.scrollTop / ITEM_HEIGHT);
    setIndex(Math.min(Math.max(live, 0), years.length - 1));

    // ...and only commit once the scrolling has actually stopped.
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const settled = Math.round(list.scrollTop / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(settled, 0), years.length - 1);
      setIndex(clamped);
      list.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
    }, 120);
  };

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const scrollToIndex = (next) => {
    const clamped = Math.min(Math.max(next, 0), years.length - 1);
    setIndex(clamped);
    listRef.current?.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToIndex(index + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToIndex(index - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    }
  };

  const confirm = () => {
    setSelectedYear(years[index]);
    onClose();
  };

  return createPortal(
    <div className="modal-overlay year-wheel-overlay" onClick={onClose}>
      <div
        className="year-wheel"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose an academic year"
      >
        <header className="yw-head">
          <FiArchive />
          <div>
            <h3>Academic year</h3>
            <p>Browse another council&rsquo;s term.</p>
          </div>
        </header>

        <div
          className="yw-wheel"
          style={{ height: ITEM_HEIGHT * visibleItems }}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="listbox"
          aria-label="Academic year"
          aria-activedescendant={`yw-option-${index}`}
        >
          {/* The lit band the selection settles into. */}
          <div className="yw-highlight" style={{ height: ITEM_HEIGHT }} aria-hidden="true" />

          <div className={`yw-list${visibleItems === 1 ? ' yw-list--single' : ''}`} ref={listRef} onScroll={handleScroll}>
            {/* Spacers so the first and last entries can reach the middle. */}
            {!!spacerHeight && <div style={{ height: spacerHeight }} aria-hidden="true" />}

            {years.map((year, itemIndex) => {
              const distance = Math.abs(itemIndex - index);
              return (
                <button
                  key={year}
                  id={`yw-option-${itemIndex}`}
                  type="button"
                  role="option"
                  aria-selected={itemIndex === index}
                  className={`yw-item ${itemIndex === index ? 'active' : ''}`}
                  style={{
                    height: ITEM_HEIGHT,
                    // The rows away from centre fade and shrink, which is what
                    // reads as a wheel rather than a list.
                    opacity: Math.max(0.25, 1 - distance * 0.32),
                    transform: `scale(${Math.max(0.82, 1 - distance * 0.08)})`
                  }}
                  onClick={() => (itemIndex === index ? confirm() : scrollToIndex(itemIndex))}
                >
                  {formatAcademicYear(year)}
                  {year === currentYear && <span className="yw-tag">Current</span>}
                </button>
              );
            })}

            {!!spacerHeight && <div style={{ height: spacerHeight }} aria-hidden="true" />}
          </div>
        </div>

        <footer className="yw-actions">
          <button type="button" className="yw-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="yw-confirm" onClick={confirm}>
            <FiCheck /> View {formatAcademicYear(years[index])}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default YearWheel;
