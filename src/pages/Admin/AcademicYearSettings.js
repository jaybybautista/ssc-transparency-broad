import React, { useState } from 'react';
import { FiArchive, FiCalendar, FiCheck, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import { useDialog } from '../../components/DialogProvider';
import { academicYearOf, formatAcademicYear } from '../../lib/academicYear';
import './AcademicYearSettings.css';

/**
 * Handover control.
 *
 * Nothing here deletes anything. Declaring a new academic year simply changes
 * which year the board opens on; every earlier year stays reachable from the
 * switcher in the navbar. That is the whole point — the alternative a council
 * reaches for is deleting last year's content to "start clean", which cannot be
 * undone.
 */
const AcademicYearSettings = () => {
  const {
    selectedYear,
    setSelectedYear,
    currentYear,
    availableYears,
    setActiveAcademicYear,
    announcements,
    events,
    resolutions,
    meetings,
    narrativeReports,
    memorandums,
    accomplishments,
    officers,
    isCloudMode
  } = useData();
  const { confirm, notify } = useDialog();
  const [isSaving, setIsSaving] = useState(false);

  // The calendar's opinion, offered as a suggestion rather than imposed.
  const derived = academicYearOf(new Date());
  const [startYear] = String(currentYear).split('-').map(Number);
  const nextYear = `${startYear + 1}-${startYear + 2}`;

  const counts = [
    ['Announcements', announcements.length],
    ['Calendar activities', events.length],
    ['Resolutions', resolutions.length],
    ['Minutes of meeting', meetings.length],
    ['Narrative reports', narrativeReports.length],
    ['Memorandum orders', memorandums.length],
    ['Accomplishments', accomplishments.length],
    ['Officers', officers.length]
  ];

  const handleRollover = async (year) => {
    const ok = await confirm({
      title: `Make ${formatAcademicYear(year)} the current year?`,
      message:
        `The board will open on ${formatAcademicYear(year)} for everyone. ` +
        'Nothing is deleted — every earlier year stays browsable from the year switcher, ' +
        'and you can change this back at any time.',
      confirmLabel: 'Make it current',
      tone: 'info'
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      await setActiveAcademicYear(year);
      notify({
        title: 'Academic year updated',
        message: `The board now opens on ${formatAcademicYear(year)}.`,
        tone: 'success'
      });
    } catch (error) {
      notify({
        title: 'Could not update the year',
        message: error?.message || 'Please try again.',
        tone: 'warning'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Academic Year</h2>
      </div>

      {!isCloudMode && (
        <p className="ay-settings-note warning">
          <FiAlertTriangle /> The cloud database is not configured, so this setting cannot be saved.
        </p>
      )}

      <div className="ay-settings-grid">
        <section className="ay-settings-card">
          <h3><FiCalendar /> Current year</h3>
          <p className="ay-settings-big">{formatAcademicYear(currentYear)}</p>
          <p className="ay-settings-hint">
            This is what the board opens on for every visitor.
          </p>

          {derived !== currentYear && (
            <p className="ay-settings-note">
              <FiInfo /> By the calendar it is now {formatAcademicYear(derived)}. The board does
              not switch on its own — a council hands over on its own schedule, not on 1 August.
            </p>
          )}

          <div className="ay-settings-actions">
            {derived !== currentYear && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleRollover(derived)}
                disabled={isSaving}
              >
                Move to {formatAcademicYear(derived)}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleRollover(nextYear)}
              disabled={isSaving}
            >
              Start {formatAcademicYear(nextYear)}
            </button>
          </div>
        </section>

        <section className="ay-settings-card">
          <h3><FiArchive /> Browse a year</h3>
          <p className="ay-settings-hint">
            Switches what the dashboard and the public board show. Everyone else keeps seeing the
            current year until you change it above.
          </p>
          <div className="ay-year-list">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                className={`ay-year-chip ${year === selectedYear ? 'active' : ''}`}
                onClick={() => setSelectedYear(year)}
              >
                {formatAcademicYear(year)}
                {year === currentYear && <span className="ay-chip-tag">Current</span>}
                {year === selectedYear && <FiCheck />}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="ay-settings-card">
        <h3>In {formatAcademicYear(selectedYear)}</h3>
        <p className="ay-settings-hint">
          What this year holds right now. Counts reflect the page currently loaded, so a year with
          a lot of content may show more once you scroll and load older records.
        </p>
        <div className="ay-counts">
          {counts.map(([label, count]) => (
            <div key={label} className="ay-count">
              <span className="ay-count-number">{count}</span>
              <span className="ay-count-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="ay-settings-note">
        <FiInfo /> Dated content belongs to a year by its own date, so nothing had to be tagged by
        hand. Officers carry the year explicitly, since they have no date — set it on each officer
        when you add next year's council. The constitution and request-letter templates are not
        year-scoped: they are standing documents and show under every year.
      </p>
    </div>
  );
};

export default AcademicYearSettings;
