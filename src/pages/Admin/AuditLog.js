import React, { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiInfo, FiPlus, FiEdit2, FiTrash2, FiSend, FiSettings } from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import AdminSearchBar, { matchesQuery } from '../../components/AdminSearchBar';
import Pagination from '../../components/Pagination';
import { paginate } from '../../lib/pagination';
import './AuditLog.css';

const PER_PAGE = 25;

const ACTION_META = {
  create: { label: 'Created', icon: FiPlus, tone: 'create' },
  update: { label: 'Edited', icon: FiEdit2, tone: 'update' },
  delete: { label: 'Deleted', icon: FiTrash2, tone: 'delete' },
  publish: { label: 'Published', icon: FiSend, tone: 'publish' },
  settings: { label: 'Changed a setting', icon: FiSettings, tone: 'settings' }
};

const COLLECTION_LABEL = {
  announcements: 'Announcement',
  events: 'Calendar activity',
  resolutions: 'Resolution',
  officers: 'Officer',
  meetings: 'Minutes of meeting',
  accomplishments: 'Accomplishment',
  requestTypes: 'Request letter type',
  memorandums: 'Memorandum order',
  narrativeReports: 'Narrative report',
  constitution: 'Constitution document',
  settings: 'Board settings'
};

const formatWhen = (value) => {
  if (!value) return 'N/A';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const AuditLog = () => {
  const { auditLog } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      auditLog
        .filter((entry) => actionFilter === 'all' || entry.action === actionFilter)
        .filter((entry) =>
          matchesQuery(searchTerm, [
            entry.email,
            entry.displayName,
            entry.target,
            COLLECTION_LABEL[entry.collectionName] || entry.collectionName
          ])
        ),
    [auditLog, actionFilter, searchTerm]
  );

  // Back to the first page whenever the list underneath changes shape, so a
  // filter never lands somebody on a page that no longer holds anything.
  useEffect(() => {
    setPage(1);
  }, [actionFilter, searchTerm]);

  const shown = paginate(rows, page, PER_PAGE);

  const exportCsv = () => {
    const header = ['When', 'Who', 'Action', 'Type', 'Item', 'Document ID'];
    const body = rows.map((entry) => [
      formatWhen(entry.at),
      entry.email,
      ACTION_META[entry.action]?.label || entry.action,
      COLLECTION_LABEL[entry.collectionName] || entry.collectionName,
      entry.target,
      entry.documentId
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Activity Log</h2>
        {!!rows.length && (
          <button className="btn-primary" onClick={exportCsv}>
            <FiDownload /> Export CSV
          </button>
        )}
      </div>

      <p className="audit-explainer">
        <FiInfo />
        <span>
          Who changed what, most recent first. Entries can never be edited or removed. The
          database refuses it, for admins too. Worth being straight about the limit: the log is
          written by the app, so it records what officers do through the dashboard. It is an
          accountability aid among colleagues, not a forensic trail.
        </span>
      </p>

      <div className="audit-filters">
        <button
          type="button"
          className={`audit-filter ${actionFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActionFilter('all')}
        >
          All ({auditLog.length})
        </button>
        {Object.entries(ACTION_META).map(([action, meta]) => {
          const count = auditLog.filter((entry) => entry.action === action).length;
          if (!count) return null;
          return (
            <button
              key={action}
              type="button"
              className={`audit-filter ${actionFilter === action ? 'active' : ''}`}
              onClick={() => setActionFilter(actionFilter === action ? 'all' : action)}
            >
              <meta.icon /> {meta.label} ({count})
            </button>
          );
        })}
      </div>

      <AdminSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by officer, item, or type..."
        resultCount={rows.length}
        totalCount={auditLog.length}
      />

      {!rows.length ? (
        <div className="admin-search-empty">
          {auditLog.length
            ? 'No entries match the current filters.'
            : 'Nothing recorded yet. Actions taken from the dashboard appear here.'}
        </div>
      ) : (
        <ol className="audit-list">
          {shown.items.map((entry) => {
            const meta = ACTION_META[entry.action] || { label: entry.action, icon: FiEdit2, tone: 'update' };
            return (
              <li key={entry.id} className="audit-entry">
                <span className={`audit-icon ${meta.tone}`}>
                  <meta.icon />
                </span>
                <div className="audit-body">
                  <p className="audit-line">
                    <strong>{entry.displayName || entry.email || 'Unknown officer'}</strong>
                    {' '}
                    <span className="audit-action">{meta.label.toLowerCase()}</span>
                    {' '}
                    <span className="audit-type">
                      {COLLECTION_LABEL[entry.collectionName] || entry.collectionName}
                    </span>
                    {entry.target ? <>: <span className="audit-target">{entry.target}</span></> : null}
                  </p>
                  <p className="audit-meta">
                    {formatWhen(entry.at)}
                    {entry.email && entry.displayName ? ` · ${entry.email}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination
        page={shown.page}
        pageCount={shown.pageCount}
        from={shown.from}
        to={shown.to}
        total={shown.total}
        unit="actions"
        onChange={setPage}
      />
    </div>
  );
};

export default AuditLog;
