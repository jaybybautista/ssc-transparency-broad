import React, { useEffect, useRef, useState } from 'react';
import { FiArchive, FiCheck, FiChevronDown, FiClock } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import { formatAcademicYear } from '../lib/academicYear';
import './AcademicYearPicker.css';

/**
 * Switches the board between academic years.
 *
 * Renders nothing when there is only one year of content, so it stays invisible
 * until the first handover actually makes it meaningful.
 */
const AcademicYearPicker = () => {
  const { selectedYear, setSelectedYear, availableYears, currentYear, isViewingArchive } = useData();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  if (!availableYears || availableYears.length < 2) return null;

  return (
    <div className={`ay-picker ${isViewingArchive ? 'is-archive' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="ay-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {isViewingArchive ? <FiArchive /> : <FiClock />}
        <span>{formatAcademicYear(selectedYear)}</span>
        <FiChevronDown className={`ay-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="ay-menu" role="listbox" aria-label="Academic year">
          <div className="ay-menu-header">Academic year</div>
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              role="option"
              aria-selected={year === selectedYear}
              className={`ay-option ${year === selectedYear ? 'selected' : ''}`}
              onClick={() => {
                setSelectedYear(year);
                setOpen(false);
              }}
            >
              <span className="ay-option-label">
                {formatAcademicYear(year)}
                {year === currentYear && <span className="ay-current-tag">Current</span>}
              </span>
              {year === selectedYear && <FiCheck className="ay-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Banner shown across the top of the content while an earlier year is selected,
 * so nobody mistakes archived material for what the council is doing now.
 */
export const ArchiveNotice = () => {
  const { selectedYear, setSelectedYear, currentYear, isViewingArchive } = useData();

  if (!isViewingArchive) return null;

  return (
    <div className="archive-notice" role="status">
      <FiArchive />
      <span>
        You are viewing the archive for <strong>{formatAcademicYear(selectedYear)}</strong>.
        This is not the current council's work.
      </span>
      <button type="button" onClick={() => setSelectedYear(currentYear)}>
        Back to {formatAcademicYear(currentYear)}
      </button>
    </div>
  );
};

export default AcademicYearPicker;
