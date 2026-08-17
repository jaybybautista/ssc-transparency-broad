import React, { useMemo, useState } from 'react';
import {
  FiInbox,
  FiLock,
  FiLogIn,
  FiMail,
  FiTrash2,
  FiSend,
  FiShield,
  FiClock,
  FiDownload
} from 'react-icons/fi';
import { useData, TICKET_STATUSES } from '../../context/DataContext';
import { useVoterAuth } from '../../context/VoterAuthContext';
import { useDialog } from '../../components/DialogProvider';
import AdminSearchBar, { matchesQuery } from '../../components/AdminSearchBar';
import './StudentSubmissions.css';

const formatWhen = (value) => {
  if (!value) return '—';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const STATUS_LABEL = {
  new: 'New',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  closed: 'Closed'
};

/**
 * @param {object} props
 * @param {'tickets'|'suggestions'} props.mode
 */
const StudentSubmissions = ({ mode = 'tickets' }) => {
  const { tickets, suggestions, updateTicket, deleteTicket, updateSuggestion, deleteSuggestion } = useData();
  const { voter, signIn, signOut, isSscAdmin, isCheckingAdmin, authError } = useVoterAuth();
  const { confirm, notify } = useDialog();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState('');

  const isTickets = mode === 'tickets';

  const rows = useMemo(() => {
    if (isTickets) {
      return tickets
        .filter((t) => statusFilter === 'all' || t.status === statusFilter)
        .filter((t) =>
          matchesQuery(searchTerm, [t.referenceCode, t.subject, t.message, t.studentName, t.studentEmail, t.type])
        );
    }
    return suggestions
      .filter((s) => statusFilter === 'all' || s.status === statusFilter)
      .filter((s) => matchesQuery(searchTerm, [s.category, s.message]));
  }, [isTickets, tickets, suggestions, searchTerm, statusFilter]);

  const source = isTickets ? tickets : suggestions;

  // ---------- access gate ----------
  if (!isSscAdmin) {
    return (
      <div className="manager-content">
        <div className="manager-header">
          <h2>{isTickets ? 'Student Tickets' : 'Suggestion Box'}</h2>
        </div>

        <div className="submissions-gate">
          <FiShield className="submissions-gate-icon" />
          <h3>Verified sign-in required</h3>
          <p>
            {isTickets
              ? 'Student tickets contain names, emails and formal grievances.'
              : 'Suggestions are submitted in confidence.'}{' '}
            The database only releases them to a Google account listed in the <code>admins</code>
            {' '}collection — the admin username and password cannot be checked by the server.
          </p>

          {voter ? (
            <>
              <p className="submissions-gate-current">
                Signed in as <strong>{voter.email}</strong>
                {isCheckingAdmin ? ' — checking access…' : ' — this account is not on the admin roster.'}
              </p>
              <div className="submissions-gate-actions">
                <button type="button" className="btn-secondary" onClick={signOut}>
                  Sign out
                </button>
              </div>
              <p className="submissions-gate-help">
                To grant access, add a document to the <code>admins</code> collection in the Firebase
                console whose <strong>document ID is this account's Firebase Auth UID</strong>. See
                SECURITY.md for the steps.
              </p>
            </>
          ) : (
            <div className="submissions-gate-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => signIn({ enforceVoteDomain: false })}
              >
                <FiLogIn /> Sign in with Google
              </button>
            </div>
          )}

          {!!authError && <p className="submissions-error">{authError}</p>}
        </div>
      </div>
    );
  }

  // ---------- actions ----------
  const changeStatus = async (id, status) => {
    setSavingId(id);
    try {
      await updateTicket(id, { status });
    } catch (error) {
      notify({ title: 'Update failed', message: error.message, tone: 'warning' });
    } finally {
      setSavingId('');
    }
  };

  const sendReply = async (id) => {
    const text = (replyDrafts[id] || '').trim();
    if (!text) {
      notify({ title: 'Nothing to send', message: 'Write a reply first.', tone: 'info' });
      return;
    }
    setSavingId(id);
    try {
      await updateTicket(id, { adminResponse: text, status: 'resolved' });
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      notify({
        title: 'Reply saved',
        message: 'The student will see it when they check their reference code.',
        tone: 'success'
      });
    } catch (error) {
      notify({ title: 'Could not save reply', message: error.message, tone: 'warning' });
    } finally {
      setSavingId('');
    }
  };

  const removeItem = async (id) => {
    const ok = await confirm({
      title: isTickets ? 'Delete this ticket?' : 'Delete this suggestion?',
      message: 'This submission will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!ok) return;
    if (isTickets) await deleteTicket(id);
    else await deleteSuggestion(id);
  };

  const exportCsv = () => {
    const header = isTickets
      ? ['Reference', 'Type', 'Status', 'Subject', 'Name', 'Email', 'Program', 'Year', 'Message', 'Reply', 'Received']
      : ['Topic', 'Status', 'Suggestion', 'Received'];
    const body = rows.map((r) =>
      isTickets
        ? [r.referenceCode, r.type, r.status, r.subject, r.studentName, r.studentEmail, r.program, r.yearLevel, r.message, r.adminResponse, formatWhen(r.createdAt)]
        : [r.category, r.status, r.message, formatWhen(r.createdAt)]
    );
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isTickets ? 'student-tickets' : 'suggestions'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const statusOptions = isTickets ? TICKET_STATUSES : ['new', 'reviewed'];

  return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>{isTickets ? 'Student Tickets' : 'Suggestion Box'}</h2>
        {!!rows.length && (
          <button className="btn-primary" onClick={exportCsv}>
            <FiDownload /> Export CSV
          </button>
        )}
      </div>

      <p className="submissions-signed-in">
        <FiShield /> Verified as <strong>{voter?.email}</strong>
        <button type="button" onClick={signOut}>Sign out</button>
      </p>

      <div className="submissions-stats">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            className={`submissions-stat ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
          >
            <span className="submissions-stat-number">
              {source.filter((item) => item.status === status).length}
            </span>
            <span className="submissions-stat-label">{STATUS_LABEL[status] || status}</span>
          </button>
        ))}
      </div>

      <AdminSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={isTickets ? 'Search by reference, name, email, or text...' : 'Search suggestions...'}
        resultCount={rows.length}
        totalCount={source.length}
      />

      {!rows.length ? (
        <div className="admin-search-empty">
          {source.length
            ? 'No submissions match the current filters.'
            : isTickets
              ? 'No tickets yet. Student requests submitted from the Connect with SSC page appear here.'
              : 'No suggestions yet. Anonymous submissions appear here.'}
        </div>
      ) : (
        <div className="submissions-list">
          {rows.map((item) => (
            <article key={item.id} className="submission-card">
              <header className="submission-head">
                <div className="submission-head-main">
                  {isTickets ? (
                    <>
                      <code className="submission-ref">{item.referenceCode}</code>
                      <span className="submission-type">{item.type}</span>
                    </>
                  ) : (
                    <span className="submission-type">{item.category}</span>
                  )}
                  <span className={`submission-status status-${item.status}`}>
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                </div>
                <span className="submission-when">
                  <FiClock /> {formatWhen(item.createdAt)}
                </span>
              </header>

              {isTickets && <h3 className="submission-subject">{item.subject}</h3>}

              {isTickets ? (
                <p className="submission-from">
                  <FiMail /> {item.studentName || 'Unnamed'} · {item.studentEmail || 'no email'}
                  {item.program ? ` · ${item.program}` : ''}
                  {item.yearLevel ? ` · ${item.yearLevel}` : ''}
                </p>
              ) : (
                <p className="submission-from anonymous">
                  <FiLock /> Anonymous — no identifying information was recorded
                </p>
              )}

              <p className="submission-message">{item.message}</p>

              {isTickets ? (
                <>
                  {item.adminResponse && (
                    <div className="submission-existing-reply">
                      <h4>Current reply</h4>
                      <p>{item.adminResponse}</p>
                    </div>
                  )}

                  <div className="submission-reply">
                    <label htmlFor={`reply-${item.id}`}>
                      {item.adminResponse ? 'Replace the reply' : 'Write a reply'}
                    </label>
                    <textarea
                      id={`reply-${item.id}`}
                      rows="3"
                      value={replyDrafts[item.id] ?? ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="The student sees this when they look up their reference code."
                    />
                  </div>

                  <footer className="submission-actions">
                    <select
                      value={item.status}
                      onChange={(e) => changeStatus(item.id, e.target.value)}
                      disabled={savingId === item.id}
                      aria-label="Change status"
                    >
                      {TICKET_STATUSES.map((status) => (
                        <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => sendReply(item.id)}
                      disabled={savingId === item.id}
                    >
                      <FiSend /> {savingId === item.id ? 'Saving...' : 'Save reply'}
                    </button>
                    <a className="btn-secondary" href={`mailto:${item.studentEmail}?subject=Re: ${encodeURIComponent(item.subject)}`}>
                      <FiMail /> Email student
                    </a>
                    <button type="button" className="submission-delete" onClick={() => removeItem(item.id)}>
                      <FiTrash2 />
                    </button>
                  </footer>
                </>
              ) : (
                <footer className="submission-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => updateSuggestion(item.id, { status: item.status === 'reviewed' ? 'new' : 'reviewed' })}
                  >
                    <FiInbox /> Mark as {item.status === 'reviewed' ? 'new' : 'reviewed'}
                  </button>
                  <button type="button" className="submission-delete" onClick={() => removeItem(item.id)}>
                    <FiTrash2 />
                  </button>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;
