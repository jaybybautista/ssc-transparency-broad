import React, { useState } from 'react';
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiSend,
  FiLock,
  FiSearch,
  FiCheckCircle,
  FiCopy,
  FiInbox,
  FiMessageSquare
} from 'react-icons/fi';
import { FaFacebookF } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
import { contactInfo } from '../data/sampleData';
import { useData, TICKET_TYPES, SUGGESTION_CATEGORIES } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { useLanguage } from '../context/LanguageContext';
import './ContactUs.css';

const STATUS_LABELS = {
  new: { label: 'Received', hint: 'Your submission is queued for review by the council.' },
  'in-progress': { label: 'Being handled', hint: 'An officer is currently working on this.' },
  resolved: { label: 'Resolved', hint: 'The council has completed action on this.' },
  closed: { label: 'Closed', hint: 'This submission has been closed.' }
};

/** Firebase error codes are not something a student should ever have to read. */
const friendlyError = (error) => {
  if (error?.code === 'permission-denied' || /insufficient permissions/i.test(error?.message || '')) {
    return 'Submissions are not accepting entries right now. Please try again later, or contact the SSC Office directly.';
  }
  if (error?.code === 'unavailable' || /offline|network/i.test(error?.message || '')) {
    return 'You appear to be offline. Please check your connection and try again.';
  }
  return error?.message || 'Something went wrong. Please try again in a moment.';
};

const EMPTY_TICKET = {
  type: TICKET_TYPES[0],
  subject: '',
  message: '',
  studentName: '',
  studentEmail: '',
  program: '',
  yearLevel: ''
};

const ContactUs = () => {
  const { t } = useLanguage();
  const { createTicket, lookupTicket, createSuggestion } = useData();
  const { notify } = useDialog();

  const [activeTab, setActiveTab] = useState('ticket');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticket form
  const [ticket, setTicket] = useState(EMPTY_TICKET);
  const [submittedCode, setSubmittedCode] = useState('');

  // Anonymous suggestion
  const [suggestion, setSuggestion] = useState({ category: SUGGESTION_CATEGORIES[0], message: '' });
  const [suggestionSent, setSuggestionSent] = useState(false);

  // Tracking
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [isLooking, setIsLooking] = useState(false);

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const code = await createTicket(ticket);
      setSubmittedCode(code);
      setTicket(EMPTY_TICKET);
    } catch (error) {
      notify({
        title: "Couldn't submit",
        message: friendlyError(error),
        tone: 'warning'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createSuggestion(suggestion);
      setSuggestion({ category: SUGGESTION_CATEGORIES[0], message: '' });
      setSuggestionSent(true);
    } catch (error) {
      notify({
        title: "Couldn't submit",
        message: friendlyError(error),
        tone: 'warning'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setIsLooking(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const found = await lookupTicket(lookupCode);
      if (found) setLookupResult(found);
      else setLookupError('No submission found with that reference code. Please check it and try again.');
    } catch (error) {
      setLookupError('Could not look that up right now. Please try again in a moment.');
    } finally {
      setIsLooking(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(submittedCode);
      notify({ title: 'Copied', message: `${submittedCode} is on your clipboard.`, tone: 'success' });
    } catch (error) {
      notify({ title: 'Copy failed', message: `Please write it down: ${submittedCode}`, tone: 'info' });
    }
  };

  const tabs = [
    { id: 'ticket', label: 'Submit a Request', icon: <FiSend /> },
    { id: 'suggestion', label: 'Anonymous Suggestion', icon: <FiLock /> },
    { id: 'track', label: 'Track a Submission', icon: <FiSearch /> }
  ];

  return (
    <div className="contact-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('contact.title')}</h1>
          <p>
            Send the council an inquiry, a venue or equipment request, or a formal grievance — or drop an
            anonymous suggestion. Every submission reaches the SSC directly.
          </p>
        </div>
      </div>

      <div className="container section">
        <div className="portal-card">
          <div className="portal-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`portal-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ---------------- Ticket ---------------- */}
          {activeTab === 'ticket' && (
            <div className="portal-panel">
              {submittedCode ? (
                <div className="portal-success">
                  <FiCheckCircle className="portal-success-icon" />
                  <h3>Submission received</h3>
                  <p>Keep this reference code — you'll need it to check the status of your request.</p>
                  <div className="reference-code">
                    <code>{submittedCode}</code>
                    <button type="button" onClick={copyCode} title="Copy reference code">
                      <FiCopy /> Copy
                    </button>
                  </div>
                  <p className="portal-success-note">
                    The council reviews submissions during office hours. Save the code somewhere safe —
                    it is the only way to look this up later.
                  </p>
                  <button type="button" className="btn btn-outline" onClick={() => setSubmittedCode('')}>
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="portal-form">
                  <div className="portal-form-row">
                    <div className="portal-field">
                      <label className="is-required" htmlFor="ticket-type">What is this about?</label>
                      <select
                        id="ticket-type"
                        value={ticket.type}
                        onChange={(e) => setTicket({ ...ticket, type: e.target.value })}
                      >
                        {TICKET_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="portal-field">
                      <label className="is-required" htmlFor="ticket-subject">Subject</label>
                      <input
                        id="ticket-subject"
                        type="text"
                        maxLength={200}
                        required
                        value={ticket.subject}
                        onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                        placeholder="A short summary"
                      />
                    </div>
                  </div>

                  <div className="portal-form-row">
                    <div className="portal-field">
                      <label className="is-required" htmlFor="ticket-name">Your name</label>
                      <input
                        id="ticket-name"
                        type="text"
                        maxLength={120}
                        required
                        value={ticket.studentName}
                        onChange={(e) => setTicket({ ...ticket, studentName: e.target.value })}
                      />
                    </div>
                    <div className="portal-field">
                      <label className="is-required" htmlFor="ticket-email">Email</label>
                      <input
                        id="ticket-email"
                        type="email"
                        maxLength={200}
                        required
                        value={ticket.studentEmail}
                        onChange={(e) => setTicket({ ...ticket, studentEmail: e.target.value })}
                        placeholder="you@psu.edu.ph"
                      />
                    </div>
                  </div>

                  <div className="portal-form-row">
                    <div className="portal-field">
                      <label htmlFor="ticket-program">Program / Course</label>
                      <input
                        id="ticket-program"
                        type="text"
                        value={ticket.program}
                        onChange={(e) => setTicket({ ...ticket, program: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="portal-field">
                      <label htmlFor="ticket-year">Year Level</label>
                      <input
                        id="ticket-year"
                        type="text"
                        value={ticket.yearLevel}
                        onChange={(e) => setTicket({ ...ticket, yearLevel: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="portal-field">
                    <label className="is-required" htmlFor="ticket-message">Details</label>
                    <textarea
                      id="ticket-message"
                      rows="7"
                      maxLength={5000}
                      required
                      value={ticket.message}
                      onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                      placeholder="Explain your request or concern. For venue and equipment requests, include the date, time and purpose."
                    />
                    <small className="portal-hint">{ticket.message.length}/5000 characters</small>
                  </div>

                  <p className="portal-privacy">
                    <FiInbox /> Your name and email are shared with SSC officers so they can respond.
                    If you would rather not be identified, use the <strong>Anonymous Suggestion</strong> tab.
                  </p>

                  <button type="submit" className="btn btn-primary portal-submit" disabled={isSubmitting}>
                    <FiSend /> {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ---------------- Anonymous suggestion ---------------- */}
          {activeTab === 'suggestion' && (
            <div className="portal-panel">
              {suggestionSent ? (
                <div className="portal-success">
                  <FiCheckCircle className="portal-success-icon" />
                  <h3>Thank you — your suggestion was sent anonymously</h3>
                  <p>
                    Nothing identifying was recorded, so there is no reference code and no way to trace
                    this back to you. That also means the council cannot reply directly.
                  </p>
                  <button type="button" className="btn btn-outline" onClick={() => setSuggestionSent(false)}>
                    Send another suggestion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSuggestionSubmit} className="portal-form">
                  <div className="portal-anon-banner">
                    <FiLock />
                    <div>
                      <strong>This is genuinely anonymous.</strong>
                      <span>
                        No name, email or account is attached — and no sign-in is required. Because of
                        that, the council cannot reply to you, so use the Submit a Request tab if you
                        need an answer.
                      </span>
                    </div>
                  </div>

                  <div className="portal-field">
                    <label className="is-required" htmlFor="suggestion-category">Topic</label>
                    <select
                      id="suggestion-category"
                      value={suggestion.category}
                      onChange={(e) => setSuggestion({ ...suggestion, category: e.target.value })}
                    >
                      {SUGGESTION_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="portal-field">
                    <label className="is-required" htmlFor="suggestion-message">Your suggestion</label>
                    <textarea
                      id="suggestion-message"
                      rows="8"
                      maxLength={5000}
                      required
                      value={suggestion.message}
                      onChange={(e) => setSuggestion({ ...suggestion, message: e.target.value })}
                      placeholder="What would you like the council to consider or improve?"
                    />
                    <small className="portal-hint">
                      {suggestion.message.length}/5000 characters · Avoid including your name if you want
                      to stay anonymous.
                    </small>
                  </div>

                  <button type="submit" className="btn btn-primary portal-submit" disabled={isSubmitting}>
                    <FiLock /> {isSubmitting ? 'Sending...' : 'Send Anonymously'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ---------------- Track ---------------- */}
          {activeTab === 'track' && (
            <div className="portal-panel">
              <form onSubmit={handleLookup} className="portal-form">
                <div className="portal-field">
                  <label className="is-required" htmlFor="lookup-code">Reference code</label>
                  <input
                    id="lookup-code"
                    type="text"
                    required
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                    placeholder="SSC-XXXX-XXXX"
                    className="portal-code-input"
                  />
                  <small className="portal-hint">
                    This was shown when you submitted your request. Anonymous suggestions have no code.
                  </small>
                </div>
                <button type="submit" className="btn btn-primary portal-submit" disabled={isLooking}>
                  <FiSearch /> {isLooking ? 'Looking up...' : 'Check Status'}
                </button>
              </form>

              {!!lookupError && <p className="portal-error">{lookupError}</p>}

              {lookupResult && (
                <div className="tracking-result">
                  <div className={`tracking-status status-${lookupResult.status}`}>
                    {STATUS_LABELS[lookupResult.status]?.label || lookupResult.status}
                  </div>
                  <h3>{lookupResult.subject}</h3>
                  <dl className="tracking-meta">
                    <div>
                      <dt>Reference</dt>
                      <dd><code>{lookupResult.referenceCode}</code></dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{lookupResult.type}</dd>
                    </div>
                  </dl>
                  <p className="tracking-hint">{STATUS_LABELS[lookupResult.status]?.hint}</p>

                  <div className="tracking-section">
                    <h4>What you submitted</h4>
                    <p className="tracking-message">{lookupResult.message}</p>
                  </div>

                  {lookupResult.adminResponse ? (
                    <div className="tracking-section response">
                      <h4><FiMessageSquare /> Reply from the SSC</h4>
                      <p className="tracking-message">{lookupResult.adminResponse}</p>
                    </div>
                  ) : (
                    <p className="tracking-hint">No written reply has been posted yet.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="contact-info-section">
          <h2>{t('contact.otherWays')}</h2>
          <p className="info-intro">
            Prefer to talk in person? Visit the SSC Office during office hours, or reach us through any
            of the channels below.
          </p>

          <div className="info-cards-grid">
            <div className="info-card">
              <div className="info-icon">
                <FiMapPin />
              </div>
              <div className="info-content">
                <h4>{t('contact.office')}</h4>
                <p>{contactInfo.office}</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">
                <FiMail />
              </div>
              <div className="info-content">
                <h4>{t('contact.email')}</h4>
                <p>{contactInfo.email}</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">
                <FiPhone />
              </div>
              <div className="info-content">
                <h4>{t('contact.phone')}</h4>
                <p>{contactInfo.phone}</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">
                <FiClock />
              </div>
              <div className="info-content">
                <h4>{t('contact.hours')}</h4>
                <p>{contactInfo.officeHours}</p>
              </div>
            </div>
          </div>

          <div className="social-section">
            <h4>{t('contact.connect')}</h4>
            <div className="social-links">
              <a href="https://facebook.com/PSUurdanetaSSC" className="social-link facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <FaFacebookF />
              </a>
              <a href="mailto:ssc.urdanetacampus@psu.edu.ph" className="social-link gmail" aria-label="Gmail">
                <SiGmail />
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>{t('contact.faq')}</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>How can I request documents from SSC?</h4>
              <p>Submit a Document Request through the portal above, or visit our office during office hours.</p>
            </div>
            <div className="faq-item">
              <h4>How do I borrow equipment?</h4>
              <p>Submit an Equipment Borrowing Request above at least 3 days before the intended use date. Templates are on the Request Letters page.</p>
            </div>
            <div className="faq-item">
              <h4>Can I attend SSC meetings?</h4>
              <p>General assembly meetings are open to all students. For regular council meetings, submit a General Inquiry above.</p>
            </div>
            <div className="faq-item">
              <h4>How can I become part of SSC?</h4>
              <p>Elections are held annually. Watch out for announcements regarding candidacy filing during the election period.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
