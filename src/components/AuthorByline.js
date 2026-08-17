import React from 'react';
import { FiUser } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import './AuthorByline.css';

/**
 * Resolves the stored author fields against the live officers list.
 *
 * When the author was picked from the SSC officer roster we keep their id and
 * read the current name/position/photo, so edits to the officer flow through.
 * The snapshot saved alongside it is the fallback if that officer is removed,
 * and it is the only source for manually typed authors.
 */
export const useResolvedAuthor = (item) => {
  const { officers } = useData();
  if (!item) return null;

  const officer = item.authorOfficerId
    ? officers.find((entry) => String(entry.id) === String(item.authorOfficerId))
    : null;

  const name = officer?.name || item.authorName || '';
  if (!name) return null;

  return {
    name,
    position: officer?.position || item.authorPosition || '',
    image: officer?.image || item.authorImage || '',
    isOfficer: Boolean(officer)
  };
};

const AuthorByline = ({ item, date, size = 'md', className = '' }) => {
  const author = useResolvedAuthor(item);

  if (!author) return null;

  return (
    <div className={`author-byline author-byline-${size} ${className}`.trim()}>
      <div className="author-avatar">
        {author.image ? (
          <img
            src={author.image}
            alt={author.name}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <span className="author-avatar-fallback" style={{ display: author.image ? 'none' : 'flex' }}>
          <FiUser />
        </span>
      </div>
      <div className="author-details">
        <span className="author-name">{author.name}</span>
        <span className="author-sub">
          {author.position && <span className="author-position">{author.position}</span>}
          {author.position && date && <span className="author-dot">·</span>}
          {date && <span className="author-date">{date}</span>}
        </span>
      </div>
    </div>
  );
};

export default AuthorByline;
