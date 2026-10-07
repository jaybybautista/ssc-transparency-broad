import React, { useRef } from 'react';
import { FiMail, FiX } from 'react-icons/fi';
import OfficerAvatar from './OfficerAvatar';
import useModalBehaviour from './useModalBehaviour';
import { useLanguage } from '../context/LanguageContext';
import './OfficerDetailModal.css';

/**
 * One officer's details.
 *
 * Shared because the officers list exists twice — the public page under About
 * SSC, and the management copy in the admin dashboard. Those two already carry
 * near-identical grids; adding a third near-identical dialog to each is how
 * they drift apart, so this lives in one place.
 *
 * It exists mainly for the chart view, where a plate has to stay narrow enough
 * to line up with its row and cannot carry a course, year and quote as well.
 */
const OfficerDetailModal = ({ officer, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  useModalBehaviour(Boolean(officer), onClose, dialogRef);

  if (!officer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="officer-detail-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={officer.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="close-btn officer-detail-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <FiX />
        </button>

        <div className="officer-detail-photo">
          <OfficerAvatar src={officer.image} alt={officer.name} />
        </div>

        <h3 className="officer-detail-name">{officer.name}</h3>
        {!!officer.position && <p className="officer-detail-position">{officer.position}</p>}

        {/* Only the facts that were actually filled in: an empty row reads as
            missing data rather than as "not applicable". */}
        <dl className="officer-detail-facts">
          {!!officer.division && (
            <div><dt>{t('off.division')}</dt><dd>{officer.division}</dd></div>
          )}
          {!!officer.course && (
            <div><dt>{t('off.program')}</dt><dd>{officer.course}</dd></div>
          )}
          {!!officer.yearLevel && (
            <div><dt>{t('off.yearLevel')}</dt><dd>{officer.yearLevel}</dd></div>
          )}
        </dl>

        {!!officer.quote && <blockquote className="officer-detail-quote">{officer.quote}</blockquote>}

        {!!officer.email && (
          <a href={`mailto:${officer.email}`} className="btn-primary officer-detail-mail">
            <FiMail /> {officer.email}
          </a>
        )}
      </div>
    </div>
  );
};

export default OfficerDetailModal;
