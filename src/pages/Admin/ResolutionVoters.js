import React, { useMemo, useState } from 'react';
import { FiThumbsUp, FiThumbsDown, FiMinus, FiUser, FiUsers, FiDownload } from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import AdminSearchBar, { matchesQuery } from '../../components/AdminSearchBar';
import './ResolutionVoters.css';

const choiceMeta = {
  for: { label: 'For', icon: <FiThumbsUp />, className: 'choice-for' },
  against: { label: 'Against', icon: <FiThumbsDown />, className: 'choice-against' },
  abstain: { label: 'Abstain', icon: <FiMinus />, className: 'choice-abstain' }
};

const formatWhen = (value) => {
  if (!value) return '—';
  // Firestore Timestamp or an ISO string / Date
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

const ResolutionVoters = () => {
  const { resolutionVotes, resolutions } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [resolutionFilter, setResolutionFilter] = useState('all');

  const resolutionTitle = (id) => {
    const match = resolutions.find((item) => String(item.id) === String(id));
    return match ? `${match.number || ''} ${match.title}`.trim() : 'Deleted resolution';
  };

  const rows = useMemo(() => {
    const sorted = [...resolutionVotes].sort((a, b) => {
      const aTime = typeof a.updatedAt?.toDate === 'function' ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
      const bTime = typeof b.updatedAt?.toDate === 'function' ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
      return bTime - aTime;
    });

    return sorted
      .filter((vote) => resolutionFilter === 'all' || String(vote.resolutionId) === resolutionFilter)
      .filter((vote) =>
        matchesQuery(searchTerm, [vote.email, vote.displayName, vote.choice, resolutionTitle(vote.resolutionId)])
      );
  }, [resolutionVotes, resolutions, searchTerm, resolutionFilter]);

  const uniqueAccounts = useMemo(
    () => new Set(resolutionVotes.map((vote) => vote.email || vote.uid)).size,
    [resolutionVotes]
  );

  const exportCsv = () => {
    const header = ['Email', 'Name', 'Resolution', 'Vote', 'Recorded'];
    const body = rows.map((vote) => [
      vote.email || '',
      vote.displayName || '',
      resolutionTitle(vote.resolutionId),
      vote.choice || '',
      formatWhen(vote.updatedAt)
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resolution-votes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Resolution Votes</h2>
        {!!rows.length && (
          <button className="btn-primary" onClick={exportCsv}>
            <FiDownload /> Export CSV
          </button>
        )}
      </div>

      <div className="voter-stats">
        <div className="voter-stat">
          <FiUsers className="voter-stat-icon" />
          <div>
            <span className="voter-stat-number">{uniqueAccounts}</span>
            <span className="voter-stat-label">Google accounts</span>
          </div>
        </div>
        <div className="voter-stat">
          <FiThumbsUp className="voter-stat-icon" />
          <div>
            <span className="voter-stat-number">{resolutionVotes.filter((v) => v.choice === 'for').length}</span>
            <span className="voter-stat-label">For</span>
          </div>
        </div>
        <div className="voter-stat">
          <FiThumbsDown className="voter-stat-icon" />
          <div>
            <span className="voter-stat-number">{resolutionVotes.filter((v) => v.choice === 'against').length}</span>
            <span className="voter-stat-label">Against</span>
          </div>
        </div>
        <div className="voter-stat">
          <FiMinus className="voter-stat-icon" />
          <div>
            <span className="voter-stat-number">{resolutionVotes.filter((v) => v.choice === 'abstain').length}</span>
            <span className="voter-stat-label">Abstain</span>
          </div>
        </div>
      </div>

      <AdminSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by email, name, or resolution..."
        resultCount={rows.length}
        totalCount={resolutionVotes.length}
      />

      <div className="voter-filter">
        <label htmlFor="voter-resolution-filter">Resolution</label>
        <select
          id="voter-resolution-filter"
          value={resolutionFilter}
          onChange={(e) => setResolutionFilter(e.target.value)}
        >
          <option value="all">All resolutions</option>
          {resolutions.map((resolution) => (
            <option key={resolution.id} value={String(resolution.id)}>
              {resolution.number ? `${resolution.number} — ` : ''}
              {resolution.title}
            </option>
          ))}
        </select>
      </div>

      {rows.length ? (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Google Account</th>
                <th>Resolution</th>
                <th>Vote</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((vote) => {
                const meta = choiceMeta[vote.choice] || { label: vote.choice, icon: null, className: '' };
                return (
                  <tr key={vote.id}>
                    <td>
                      <div className="voter-cell">
                        {vote.photoURL ? (
                          <img src={vote.photoURL} alt="" />
                        ) : (
                          <span className="voter-avatar-fallback"><FiUser /></span>
                        )}
                        <div>
                          <div className="voter-email">{vote.email || '(no email)'}</div>
                          {vote.displayName && <div className="voter-name">{vote.displayName}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-title">{resolutionTitle(vote.resolutionId)}</div>
                    </td>
                    <td>
                      <span className={`choice-badge ${meta.className}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td>{formatWhen(vote.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-search-empty">
          {resolutionVotes.length
            ? 'No votes match the current filters.'
            : 'No votes have been cast yet. Votes appear here once students sign in with Google and vote.'}
        </div>
      )}
    </div>
  );
};

export default ResolutionVoters;
