import React, { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiCheck, FiChevronDown, FiDownload, FiExternalLink } from 'react-icons/fi';
import {
  REMINDER_CHOICES,
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl
} from '../lib/calendarLinks';
import './AddToCalendar.css';

/**
 * "Add to calendar" for a single event.
 *
 * Google and Outlook take a prefilled web link; Apple Calendar, Outlook desktop
 * and every Android calendar app take an .ics file. The reminder choice is
 * written into the .ics as a VALARM and appended to the web links as part of the
 * event, since neither Google's nor Outlook's compose URL accepts a reminder
 * parameter — that one is called out in the UI rather than silently dropped.
 */
const AddToCalendar = ({ event, compact = false, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const [reminder, setReminder] = useState(24 * 60);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  if (!event?.date) return null;

  const googleUrl = googleCalendarUrl(event);

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const saveIcs = () => {
    downloadIcs(event, {
      reminderMinutes: reminder,
      calendarName: event.title || 'SSC Event'
    });
    setOpen(false);
  };

  const copyDetails = async () => {
    const text = [
      event.title,
      event.date,
      event.time,
      event.location,
      googleUrl
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <div className={`add-to-calendar ${compact ? 'compact' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="atc-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-expanded={open}
      >
        <FiCalendar />
        <span>{compact ? 'Add' : 'Add to my calendar'}</span>
        <FiChevronDown className={`atc-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className={`atc-menu ${align === 'right' ? 'align-right' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="atc-menu-section">
            <span className="atc-menu-label">Remind me</span>
            <select value={reminder} onChange={(e) => setReminder(Number(e.target.value))}>
              {REMINDER_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>{choice.label}</option>
              ))}
            </select>
            <small className="atc-reminder-note">
              Applied to the downloaded file. Google and Outlook use whatever default reminder
              your own calendar is set to.
            </small>
          </div>

          <div className="atc-divider" />

          <button type="button" className="atc-option" onClick={() => openExternal(googleUrl)}>
            <span className="atc-option-icon google">G</span>
            <span className="atc-option-text">
              <strong>Google Calendar</strong>
              <small>Opens with the details filled in</small>
            </span>
            <FiExternalLink />
          </button>

          <button type="button" className="atc-option" onClick={() => openExternal(outlookCalendarUrl(event, 'office'))}>
            <span className="atc-option-icon outlook">O</span>
            <span className="atc-option-text">
              <strong>Outlook (school account)</strong>
              <small>Microsoft 365 / outlook.office.com</small>
            </span>
            <FiExternalLink />
          </button>

          <button type="button" className="atc-option" onClick={() => openExternal(outlookCalendarUrl(event, 'live'))}>
            <span className="atc-option-icon outlook">O</span>
            <span className="atc-option-text">
              <strong>Outlook.com (personal)</strong>
              <small>Hotmail / Live / Outlook.com</small>
            </span>
            <FiExternalLink />
          </button>

          <button type="button" className="atc-option" onClick={saveIcs}>
            <span className="atc-option-icon apple"></span>
            <span className="atc-option-text">
              <strong>Apple Calendar &amp; others</strong>
              <small>Downloads an .ics file that any calendar app opens</small>
            </span>
            <FiDownload />
          </button>

          <div className="atc-divider" />

          <button type="button" className="atc-option subtle" onClick={copyDetails}>
            <span className="atc-option-text">
              <strong>{copied ? 'Copied' : 'Copy event details'}</strong>
            </span>
            {copied ? <FiCheck /> : null}
          </button>
        </div>
      )}
    </div>
  );
};

export default AddToCalendar;
