import React from 'react';
import { FiGrid, FiList } from 'react-icons/fi';
import './ViewToggle.css';

/**
 * Grid / list switcher. The chosen mode is remembered per storageKey so the
 * preference survives navigation and reloads.
 */
const ViewToggle = ({ value, onChange, className = '' }) => (
  <div className={`view-toggle ${className}`.trim()} role="group" aria-label="Change layout">
    <button
      type="button"
      className={`view-toggle-btn ${value === 'grid' ? 'active' : ''}`}
      onClick={() => onChange('grid')}
      aria-pressed={value === 'grid'}
      title="Grid view"
    >
      <FiGrid /> <span>Grid</span>
    </button>
    <button
      type="button"
      className={`view-toggle-btn ${value === 'list' ? 'active' : ''}`}
      onClick={() => onChange('list')}
      aria-pressed={value === 'list'}
      title="List view"
    >
      <FiList /> <span>List</span>
    </button>
  </div>
);

export default ViewToggle;
