import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { pageNumbers } from '../lib/pagination';
import './Pagination.css';

/**
 * Page controls for an admin list.
 *
 * Takes the already-computed shape from `paginate`, so the component never
 * decides what page anyone is on. That keeps the arithmetic, which is the part
 * with edge cases, testable without rendering anything.
 */
const Pagination = ({ page, pageCount, from, to, total, unit = 'entries', onChange }) => {
  // One page is not a choice, and a row of controls offering it is noise.
  if (pageCount <= 1) return null;

  const go = (next) => {
    if (next < 1 || next > pageCount || next === page) return;
    onChange(next);
  };

  return (
    <nav className="pager" aria-label="Pages">
      <p className="pager-count">
        Showing <strong>{from}</strong> to <strong>{to}</strong> of <strong>{total}</strong> {unit}
      </p>

      <div className="pager-controls">
        <button
          type="button"
          className="pager-step"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <FiChevronLeft />
        </button>

        {pageNumbers(page, pageCount).map((entry, index) =>
          entry === '...' ? (
            // Not a button: there is nothing to press, and a screen reader
            // announcing "ellipsis, button" is worse than silence.
            // eslint-disable-next-line react/no-array-index-key
            <span key={`gap-${index}`} className="pager-gap" aria-hidden="true">
              &middot;&middot;&middot;
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`pager-page${entry === page ? ' is-current' : ''}`}
              onClick={() => go(entry)}
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? 'page' : undefined}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          className="pager-step"
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <FiChevronRight />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
