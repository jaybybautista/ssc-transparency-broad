import React from 'react';
import { FiGrid, FiList, FiShare2 } from 'react-icons/fi';
import './ViewToggle.css';

/**
 * Layout switcher. The chosen mode is remembered by the caller so the
 * preference survives navigation and reloads.
 *
 * `showChart` adds a third option, used on the officers page: grid and list
 * both answer "who is on the council", while the chart answers "how is it
 * organised". Pages without a hierarchy to show leave it off.
 */
const ViewToggle = ({ value, onChange, className = '', showChart = false }) => (
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
    {showChart && (
      <button
        type="button"
        className={`view-toggle-btn ${value === 'chart' ? 'active' : ''}`}
        onClick={() => onChange('chart')}
        aria-pressed={value === 'chart'}
        title="Organisational chart view"
      >
        <FiShare2 /> <span>Chart</span>
      </button>
    )}
  </div>
);

export default ViewToggle;
