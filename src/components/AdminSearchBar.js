import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import './AdminSearchBar.css';

/**
 * Case-insensitive "does any of these values contain the query" helper.
 * Arrays are flattened so list fields (agenda, requirements) are searchable too.
 */
export const matchesQuery = (query, values) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  return values
    .flat()
    .filter((value) => value !== null && value !== undefined && value !== '')
    .some((value) => String(value).toLowerCase().includes(q));
};

const AdminSearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  resultCount = null,
  totalCount = null
}) => (
  <div className="admin-search-bar">
    <div className="admin-search-field">
      <FiSearch className="admin-search-icon" />
      <input
        type="text"
        className="admin-search-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {!!value && (
        <button
          type="button"
          className="admin-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <FiX />
        </button>
      )}
    </div>
    {!!value && resultCount !== null && (
      <span className="admin-search-count">
        {resultCount} of {totalCount} match
      </span>
    )}
  </div>
);

export default AdminSearchBar;
