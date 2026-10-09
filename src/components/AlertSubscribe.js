import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiBell, FiCheck, FiInfo, FiMail, FiX } from 'react-icons/fi';
import { useData, isValidEmail } from '../context/DataContext';
import useModalBehaviour from './useModalBehaviour';
import { ALERT_TOPICS, loadAlertPrefs, saveAlertPrefs } from '../lib/notifications';
import './AlertSubscribe.css';

/**
 * Email alert sign-up.
 *
 * The copy is deliberate about the one limitation: the board has no mail server,
 * so an officer sends the batch from the dashboard. That makes these alerts
 * "same day" rather than "the same second", and saying so beats promising
 * real-time delivery and quietly under-delivering.
 */
const AlertSubscribe = ({ onClose }) => {
  const { subscribeToAlerts, unsubscribeFromAlerts, isCloudMode } = useData();

  const [prefs, setPrefs] = useState(() => loadAlertPrefs());
  const [emailForm, setEmailForm] = useState(() => {
    const stored = loadAlertPrefs();
    return { email: stored.email, name: '', program: '' };
  });
  const [emailState, setEmailState] = useState('idle'); // idle | saving | saved | removed
  const [emailError, setEmailError] = useState('');

  const dialogRef = useRef(null);
  useModalBehaviour(true, onClose, dialogRef);

  useEffect(() => {
    saveAlertPrefs(prefs);
  }, [prefs]);

  const toggleTopic = (id) => {
    setPrefs((prev) => ({ ...prev, topics: { ...prev.topics, [id]: !prev.topics[id] } }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    if (!isValidEmail(emailForm.email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (!Object.values(prefs.topics).some(Boolean)) {
      setEmailError('Pick at least one topic above first.');
      return;
    }

    setEmailState('saving');
    try {
      const address = await subscribeToAlerts({
        email: emailForm.email,
        name: emailForm.name,
        program: emailForm.program,
        topics: prefs.topics
      });
      setPrefs((prev) => ({ ...prev, email: address }));
      setEmailState('saved');
    } catch (error) {
      setEmailState('idle');
      setEmailError(
        error?.code === 'permission-denied'
          ? 'The server refused the subscription. The SSC may not have deployed the new database rules yet.'
          : error?.message || 'Could not save your subscription. Please try again.'
      );
    }
  };

  const handleUnsubscribe = async () => {
    setEmailError('');
    setEmailState('saving');
    try {
      await unsubscribeFromAlerts(emailForm.email || prefs.email);
      setPrefs((prev) => ({ ...prev, email: '' }));
      setEmailState('removed');
    } catch (error) {
      setEmailState('idle');
      setEmailError(error?.message || 'Could not remove your subscription.');
    }
  };

  const anyTopic = Object.values(prefs.topics).some(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content alert-subscribe-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Email alerts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3><FiBell /> Email alerts</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        <div className="modal-body alert-subscribe-body">
          <p className="alert-intro">
            Get an email when the SSC posts something you care about, so you don't have to keep
            checking the board.
          </p>

          {/* ---- what to be told about ---- */}
          <section className="alert-section">
            <h4>What should we tell you about?</h4>

            <div className="alert-topics">
              {ALERT_TOPICS.map((topic) => (
                <label key={topic.id} className={`alert-topic ${prefs.topics[topic.id] ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.topics[topic.id])}
                    onChange={() => toggleTopic(topic.id)}
                  />
                  <span className="alert-topic-box">
                    <FiCheck />
                  </span>
                  <span className="alert-topic-text">
                    <strong>{topic.label}</strong>
                    <small>{topic.hint}</small>
                  </span>
                </label>
              ))}
            </div>

            {!anyTopic && (
              <p className="alert-inline-warning">
                <FiAlertTriangle /> Nothing is selected, so no alerts will be sent.
              </p>
            )}
          </section>

          {/* ---- where to send it ---- */}
          <section className="alert-section">
            <div className="alert-channel-head">
              <span className="alert-channel-icon email"><FiMail /></span>
              <div>
                <h4>Where should we send it?</h4>
                <p className="alert-section-hint">
                  The SSC sends these out to subscribers, so allow a short delay rather than the
                  instant of posting.
                </p>
              </div>
              <span className={`alert-channel-state ${prefs.email ? 'on' : 'off'}`}>
                {prefs.email ? 'Subscribed' : 'Off'}
              </span>
            </div>

            {!isCloudMode ? (
              <p className="alert-note">
                <FiInfo /> Email alerts need the cloud database, which is not configured on
                this copy of the site.
              </p>
            ) : emailState === 'saved' ? (
              <div className="alert-success">
                <FiCheck />
                <div>
                  <strong>You're subscribed.</strong>
                  <p>
                    We'll email <b>{prefs.email}</b> about the topics you picked. You can come back
                    here any time to change them or unsubscribe.
                  </p>
                  <button type="button" className="alert-text-btn" onClick={() => setEmailState('idle')}>
                    Change my details
                  </button>
                </div>
              </div>
            ) : emailState === 'removed' ? (
              <div className="alert-success neutral">
                <FiCheck />
                <div>
                  <strong>Unsubscribed.</strong>
                  <p>Your address has been removed from the alert list.</p>
                  <button type="button" className="alert-text-btn" onClick={() => setEmailState('idle')}>
                    Subscribe again
                  </button>
                </div>
              </div>
            ) : (
              <form className="alert-email-form" onSubmit={handleEmailSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="alert-email">Email address</label>
                  <input
                    id="alert-email"
                    type="email"
                    className="form-input"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    placeholder="you@psu.edu.ph"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="alert-form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="alert-name">Name <span>(optional)</span></label>
                    <input
                      id="alert-name"
                      type="text"
                      className="form-input"
                      value={emailForm.name}
                      onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="alert-program">Program / year <span>(optional)</span></label>
                    <input
                      id="alert-program"
                      type="text"
                      className="form-input"
                      value={emailForm.program}
                      onChange={(e) => setEmailForm({ ...emailForm, program: e.target.value })}
                      placeholder="BSIT 3rd Year"
                    />
                  </div>
                </div>

                {!!emailError && <p className="alert-note warning"><FiAlertTriangle /> {emailError}</p>}

                <div className="alert-email-actions">
                  <button type="submit" className="btn-primary" disabled={emailState === 'saving'}>
                    <FiMail /> {emailState === 'saving' ? 'Saving…' : prefs.email ? 'Update subscription' : 'Subscribe'}
                  </button>
                  {!!prefs.email && (
                    <button
                      type="button"
                      className="alert-text-btn danger"
                      onClick={handleUnsubscribe}
                      disabled={emailState === 'saving'}
                    >
                      Unsubscribe
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

/**
 * The "Notify me" pill dropped into a page header. Owns the modal so pages
 * don't each need their own open/close state.
 */
export const AlertSubscribeButton = ({ label = 'Notify me' }) => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => loadAlertPrefs());

  const close = () => {
    setPrefs(loadAlertPrefs());
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="alert-subscribe-trigger" onClick={() => setOpen(true)}>
        {prefs.email ? <span className="trigger-dot" /> : <FiBell />}
        {prefs.email ? 'Alerts on' : label}
      </button>
      {/* Rendered into <body>: the button sits inside a page header, whose
          white header text and layout would otherwise leak into the dialog
          (the intro paragraph came out white on white). */}
      {open && createPortal(<AlertSubscribe onClose={close} />, document.body)}
    </>
  );
};

export default AlertSubscribe;
