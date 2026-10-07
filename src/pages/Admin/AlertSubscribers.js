import React, { useMemo, useState } from 'react';
import {
  FiCheck,
  FiCopy,
  FiDownload,
  FiInfo,
  FiLogIn,
  FiMail,
  FiSend,
  FiShield,
  FiTrash2,
  FiUsers
} from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import { useVoterAuth } from '../../context/VoterAuthContext';
import { useDialog } from '../../components/DialogProvider';
import AdminSearchBar, { matchesQuery } from '../../components/AdminSearchBar';
import { ALERT_TOPICS } from '../../lib/notifications';
import { richTextToPlain } from '../../components/richText';
// The access gate, the verified banner and the delete button are the same
// components as the ticket inbox, so their styles come from there.
import './StudentSubmissions.css';
import './AlertSubscribers.css';

const formatWhen = (value) => {
  if (!value) return 'N/A';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/** mailto: has no formal limit but browsers and mail clients start failing well
 *  under 2000 characters, so recipients go out in batches. */
const BCC_BATCH_SIZE = 40;

/**
 * Alert subscriber roster.
 *
 * The site has no mail server, so this page is the send mechanism: pick a topic,
 * pick the post, and it opens the officer's own mail client with the subject,
 * body and BCC list already filled in. BCC rather than To, so students never see
 * each other's addresses.
 */
const AlertSubscribers = () => {
  const { subscribers, deleteSubscriber, announcements, memorandums } = useData();
  const { voter, signIn, signOut, isSscAdmin, isCheckingAdmin, authError } = useVoterAuth();
  const { confirm, notify } = useDialog();

  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [composeSource, setComposeSource] = useState('');
  const [copiedBatch, setCopiedBatch] = useState(-1);

  const rows = useMemo(
    () =>
      subscribers
        .filter((item) => topicFilter === 'all' || item.topics?.[topicFilter])
        .filter((item) => matchesQuery(searchTerm, [item.email, item.name, item.program])),
    [subscribers, topicFilter, searchTerm]
  );

  /**
   * Posts that can be mailed out, paired with the topics that cover them.
   * Declared before the access gate below so the hooks always run in the same
   * order — an early return above a hook is what React forbids.
   */
  const sendableItems = useMemo(
    () => [
      ...announcements.map((item) => ({
        key: `announcement:${item.id}`,
        group: 'Announcements',
        label: item.title || 'Untitled announcement',
        subject: `[PSU-UCC SSC] ${item.title || 'Announcement'}`,
        body: richTextToPlain(item.content || ''),
        link: '/announcements',
        topicIds: ['urgentAnnouncements', 'allAnnouncements']
      })),
      ...memorandums.map((item) => ({
        key: `memorandum:${item.id}`,
        group: 'Memorandum Orders',
        label: `${item.number ? `${item.number}: ` : ''}${item.title || 'Untitled memorandum'}`,
        subject: `[PSU-UCC SSC] Memorandum ${item.number || ''} ${item.title || ''}`.replace(/\s+/g, ' ').trim(),
        body: richTextToPlain(item.description || ''),
        link: '/memorandum',
        topicIds: ['memorandums']
      }))
    ],
    [announcements, memorandums]
  );

  const chosen = sendableItems.find((item) => item.key === composeSource) || null;

  /**
   * Recipients for the chosen post: anyone subscribed to a topic that covers it,
   * intersected with whatever filter is currently applied to the table.
   */
  const recipients = useMemo(() => {
    if (!chosen) return rows.map((item) => item.email).filter(Boolean);
    return rows
      .filter((item) => chosen.topicIds.some((topicId) => item.topics?.[topicId]))
      .map((item) => item.email)
      .filter(Boolean);
  }, [chosen, rows]);

  const batches = useMemo(() => {
    const chunks = [];
    for (let index = 0; index < recipients.length; index += BCC_BATCH_SIZE) {
      chunks.push(recipients.slice(index, index + BCC_BATCH_SIZE));
    }
    return chunks;
  }, [recipients]);

  // ---------- access gate ----------
  if (!isSscAdmin) {
    return (
      <div className="manager-content">
        <div className="manager-header">
          <h2>Alert Subscribers</h2>
        </div>

        <div className="submissions-gate">
          <FiShield className="submissions-gate-icon" />
          <h3>Verified sign-in required</h3>
          <p>
            The subscriber list is a roster of student email addresses, so the database only
            releases it to a Google account listed in the <code>admins</code> collection. The
            admin username and password cannot be checked by the server.
          </p>

          {voter ? (
            <>
              <p className="submissions-gate-current">
                Signed in as <strong>{voter.email}</strong>
                {isCheckingAdmin ? ': checking access…' : ': this account is not on the admin roster.'}
              </p>
              <div className="submissions-gate-actions">
                <button type="button" className="btn-secondary" onClick={signOut}>Sign out</button>
              </div>
              <p className="submissions-gate-help">
                To grant access, add a document to the <code>admins</code> collection whose
                document ID is this account's Firebase Auth UID. See SECURITY.md.
              </p>
            </>
          ) : (
            <div className="submissions-gate-actions">
              <button type="button" className="btn-primary" onClick={() => signIn({ enforceVoteDomain: false })}>
                <FiLogIn /> Sign in with Google
              </button>
            </div>
          )}

          {!!authError && <p className="submissions-error">{authError}</p>}
        </div>
      </div>
    );
  }

  // ---------- composing a blast ----------
  const mailtoFor = (batch) => {
    const origin = window.location.origin;
    const body = [
      chosen?.body || '',
      '',
      chosen ? `Read it on the SSC Virtual Board: ${origin}${chosen.link}` : `${origin}/announcements`,
      '',
      'PSU-Urdaneta City Campus Supreme Student Council',
      `To stop receiving these, open ${origin}/announcements and turn off email alerts.`
    ].join('\n');

    const params = new URLSearchParams({
      bcc: batch.join(','),
      subject: chosen?.subject || '[PSU-UCC SSC] Announcement',
      body
    });
    return `mailto:?${params.toString()}`;
  };

  const copyBatch = async (batch, index) => {
    try {
      await navigator.clipboard.writeText(batch.join(', '));
      setCopiedBatch(index);
      setTimeout(() => setCopiedBatch(-1), 2000);
    } catch (error) {
      notify({ title: 'Could not copy', message: 'Select the addresses manually instead.', tone: 'warning' });
    }
  };

  const removeSubscriber = async (item) => {
    const ok = await confirm({
      title: 'Remove this subscriber?',
      message: `${item.email} will stop receiving email alerts.`,
      confirmLabel: 'Remove',
      tone: 'danger'
    });
    if (ok) await deleteSubscriber(item.id);
  };

  const exportCsv = () => {
    const header = ['Email', 'Name', 'Program', ...ALERT_TOPICS.map((topic) => topic.label), 'Subscribed'];
    const body = rows.map((item) => [
      item.email,
      item.name,
      item.program,
      ...ALERT_TOPICS.map((topic) => (item.topics?.[topic.id] ? 'yes' : 'no')),
      formatWhen(item.createdAt)
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alert-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Alert Subscribers</h2>
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

      <div className="subscriber-stats">
        <button
          type="button"
          className={`subscriber-stat ${topicFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTopicFilter('all')}
        >
          <span className="subscriber-stat-number">{subscribers.length}</span>
          <span className="subscriber-stat-label">Total subscribers</span>
        </button>
        {ALERT_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className={`subscriber-stat ${topicFilter === topic.id ? 'active' : ''}`}
            onClick={() => setTopicFilter(topicFilter === topic.id ? 'all' : topic.id)}
          >
            <span className="subscriber-stat-number">
              {subscribers.filter((item) => item.topics?.[topic.id]).length}
            </span>
            <span className="subscriber-stat-label">{topic.label}</span>
          </button>
        ))}
      </div>

      {/* ---- compose ---- */}
      <div className="blast-panel">
        <h3><FiSend /> Send an email alert</h3>
        <p className="blast-explainer">
          <FiInfo /> The board has no mail server of its own, so this prepares the message in your
          own email app with the subscribers already in <strong>BCC</strong>, so students never see
          each other's addresses. Pick a post and only the students who asked about that topic are
          included.
        </p>

        <div className="blast-controls">
          <div className="blast-field">
            <label htmlFor="blast-source">Post to send</label>
            <select
              id="blast-source"
              value={composeSource}
              onChange={(e) => setComposeSource(e.target.value)}
            >
              <option value="">Blank message to everyone shown below</option>
              {['Announcements', 'Memorandum Orders'].map((group) => (
                <optgroup key={group} label={group}>
                  {sendableItems
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="blast-recipients">
            <strong>{recipients.length}</strong> recipient{recipients.length === 1 ? '' : 's'}
            {batches.length > 1 && <small>sent in {batches.length} batches of {BCC_BATCH_SIZE}</small>}
          </div>
        </div>

        {!recipients.length ? (
          <p className="blast-empty">
            No subscriber matches this selection yet.
          </p>
        ) : (
          <div className="blast-batches">
            {batches.map((batch, index) => (
              <div key={index} className="blast-batch">
                <span className="blast-batch-label">
                  Batch {index + 1} · {batch.length} address{batch.length === 1 ? '' : 'es'}
                </span>
                <a className="btn-primary" href={mailtoFor(batch)}>
                  <FiMail /> Open in mail app
                </a>
                <button type="button" className="btn-secondary" onClick={() => copyBatch(batch, index)}>
                  {copiedBatch === index ? <FiCheck /> : <FiCopy />}
                  {copiedBatch === index ? 'Copied' : 'Copy addresses'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by email, name, or program..."
        resultCount={rows.length}
        totalCount={subscribers.length}
      />

      {!rows.length ? (
        <div className="admin-search-empty">
          {subscribers.length
            ? 'No subscriber matches the current filters.'
            : 'Nobody has subscribed to email alerts yet. Students opt in from the "Notify me" button on the Announcements and Memorandum Orders pages.'}
        </div>
      ) : (
        <div className="table-container subscriber-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Subscribed to</th>
                <th>Since</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="subscriber-identity">
                      <span className="subscriber-avatar"><FiUsers /></span>
                      <div>
                        <strong>{item.name || 'Unnamed student'}</strong>
                        <small>{item.email}</small>
                        {!!item.program && <small className="subscriber-program">{item.program}</small>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="subscriber-topics">
                      {ALERT_TOPICS.filter((topic) => item.topics?.[topic.id]).map((topic) => (
                        <span key={topic.id} className="subscriber-topic-chip">{topic.label}</span>
                      ))}
                      {!ALERT_TOPICS.some((topic) => item.topics?.[topic.id]) && (
                        <span className="subscriber-topic-chip muted">None</span>
                      )}
                    </div>
                  </td>
                  <td className="subscriber-since">{formatWhen(item.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="submission-delete"
                      onClick={() => removeSubscriber(item)}
                      title="Remove subscriber"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlertSubscribers;
