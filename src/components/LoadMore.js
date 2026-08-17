import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import './LoadMore.css';

/**
 * "Load older" control for a paged collection.
 *
 * The listeners fetch a page at a time rather than the whole collection, so
 * without this the older documents would simply be unreachable. Renders nothing
 * when everything has already been fetched.
 *
 * @param {string} collectionKey  Firestore collection name, e.g. 'announcements'
 * @param {string} [label]        Plural noun for the button text
 * @param {number} [shownCount]   How many are on screen after filtering, so the
 *                                count reflects what the visitor can actually see
 */
const LoadMore = ({ collectionKey, label = 'items', shownCount }) => {
  const { hasMore, loadMore, pageSize } = useData();
  const [isLoading, setIsLoading] = useState(false);

  if (!hasMore?.[collectionKey]) return null;

  const handleClick = () => {
    setIsLoading(true);
    loadMore(collectionKey);
    // The snapshot arrives on its own; this only keeps the button from being
    // hammered while the re-subscription is in flight.
    setTimeout(() => setIsLoading(false), 1200);
  };

  return (
    <div className="load-more">
      <button type="button" className="load-more-btn" onClick={handleClick} disabled={isLoading}>
        <FiChevronDown />
        {isLoading ? 'Loading…' : `Load older ${label}`}
      </button>
      <span className="load-more-hint">
        {typeof shownCount === 'number' ? `Showing ${shownCount}. ` : ''}
        {pageSize} more at a time.
      </span>
    </div>
  );
};

export default LoadMore;
