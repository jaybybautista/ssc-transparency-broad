import React, { useRef } from 'react';
import { FiX } from 'react-icons/fi';
import useModalBehaviour from './useModalBehaviour';
import { directImageUrl } from '../lib/siteProfile';
import { useLanguage } from '../context/LanguageContext';
import './OrgChartModal.css';

/**
 * The council's printed organisational chart, shown as the picture and nothing
 * else.
 *
 * Deliberately not the Google Drive viewer: that frames the file in Drive's own
 * interface, filename included, and the name of the council's working file is
 * not something students need to see. `directImageUrl` rewrites a Drive share
 * link to the endpoint that returns the image alone.
 */
const OrgChartModal = ({ url, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  useModalBehaviour(Boolean(url), onClose, dialogRef);

  if (!url) return null;

  return (
    <div className="modal-overlay orgchart-modal-overlay" onClick={onClose}>
      <div
        className="orgchart-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('off.chartTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="orgchart-modal-head">
          <h3>{t('off.chartTitle')}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label={t('common.close')}>
            <FiX />
          </button>
        </div>
        <div className="orgchart-modal-body">
          <img src={directImageUrl(url)} alt={t('off.chartTitle')} />
        </div>
      </div>
    </div>
  );
};

export default OrgChartModal;
