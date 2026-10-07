import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ContentLoader.css';

/**
 * Placeholder shown while a page's records are still on their way.
 *
 * An empty list and a list that has not arrived yet look identical, and the
 * first reads as "the council has posted nothing". The shimmering shapes stand
 * in for the cards that are coming, so the page does not jump when they land.
 *
 * `variant` picks the shape: `cards` for photo cards in a grid, `list` for
 * full-width rows of text, `people` for officer portraits.
 */
const ContentLoader = ({ variant = 'cards', count = 3 }) => {
  const { t } = useLanguage();

  return (
    <div className={`content-loader content-loader--${variant}`} role="status" aria-live="polite" aria-busy="true">
      <p className="content-loader-caption">
        <span className="content-loader-spinner" aria-hidden="true" />
        {t('common.loading')}…
      </p>
      <div className="content-loader-items" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div className="content-loader-item" key={index}>
            {variant === 'people' ? (
              <>
                <span className="skeleton skeleton-avatar" />
                <span className="skeleton skeleton-line skeleton-line--short" />
                <span className="skeleton skeleton-line skeleton-line--tiny" />
              </>
            ) : (
              <>
                {variant === 'cards' && <span className="skeleton skeleton-media" />}
                <span className="skeleton skeleton-line skeleton-line--title" />
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-line skeleton-line--short" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentLoader;
