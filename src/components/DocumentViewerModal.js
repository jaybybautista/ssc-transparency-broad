import React, { useContext } from 'react';
import { FiX, FiDownload, FiExternalLink, FiFileText } from 'react-icons/fi';
import { AuthContext } from '../App';
import { downloadDocument } from '../lib/uploads';
import './DocumentViewerModal.css';

const extractExtension = (source) => {
  if (!source) return '';
  const clean = source.split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
};

const getExtension = (fileUrl, fileName) =>
  extractExtension(fileUrl) || extractExtension(fileName);

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

/**
 * Pulls the file id out of any of the Google Drive link shapes people paste:
 *   /file/d/<id>/view    ?id=<id>    /open?id=<id>    /uc?id=<id>
 */
export const getDriveFileId = (url) => {
  if (!/drive\.google\.com|docs\.google\.com/i.test(url || '')) return '';
  const pathMatch = url.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return queryMatch ? queryMatch[1] : '';
};

const DocumentViewerModal = ({ fileUrl, fileName, title, onClose }) => {
  // Only admins get the links that lead out to the file's real location
  // (Google Drive, the storage URL). Students read it inline instead.
  const { isAdmin } = useContext(AuthContext) || {};

  if (!fileUrl) return null;

  const extension = getExtension(fileUrl, fileName);
  const isDataUrl = fileUrl.startsWith('data:');

  // A normal Drive share link cannot be framed, but Drive's /preview endpoint
  // can — so a pasted Drive link still reads inline on the site.
  const driveFileId = getDriveFileId(fileUrl);
  const drivePreviewUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/preview` : '';

  const isPdf = !driveFileId && (extension === 'pdf' || (isDataUrl && fileUrl.startsWith('data:application/pdf')));
  const isImage =
    !driveFileId && (IMAGE_EXTENSIONS.includes(extension) || (isDataUrl && fileUrl.startsWith('data:image/')));
  const isOffice = !driveFileId && OFFICE_EXTENSIONS.includes(extension);
  const canUseOfficeOnlineViewer = isOffice && !isDataUrl;
  const officeViewerUrl = canUseOfficeOnlineViewer
    ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : '';

  const handleDownload = () => downloadDocument(fileUrl, fileName || 'document');

  return (
    <div className="doc-viewer-overlay" onClick={onClose}>
      <div className="doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-viewer-header">
          <div className="doc-viewer-title">
            <FiFileText />
            {/* Never fall back to the raw filename for students */}
            <span>{title || (isAdmin ? fileName : '') || 'Document Preview'}</span>
          </div>
          <div className="doc-viewer-header-actions">
            {isAdmin && !isDataUrl && (isPdf || canUseOfficeOnlineViewer || driveFileId) && (
              <a className="doc-viewer-btn" href={fileUrl} target="_blank" rel="noopener noreferrer">
                <FiExternalLink /> {driveFileId ? 'Open in Drive' : 'Open in New Tab'}
              </a>
            )}
            {/* Drive serves its own download control inside the preview frame,
                and a share link is not a direct file URL. */}
            {!driveFileId && (
              <button type="button" className="doc-viewer-btn" onClick={handleDownload}>
                <FiDownload /> Download
              </button>
            )}
            <button type="button" className="doc-viewer-close" onClick={onClose}>
              <FiX />
            </button>
          </div>
        </div>

        <div className="doc-viewer-body">
          {driveFileId && (
            <iframe
              src={drivePreviewUrl}
              title={fileName || 'Document preview'}
              className="doc-viewer-frame"
              allow="autoplay"
            />
          )}

          {isPdf && (
            <iframe src={fileUrl} title={fileName || 'Document preview'} className="doc-viewer-frame" />
          )}

          {isImage && (
            <div className="doc-viewer-image-wrap">
              <img src={fileUrl} alt={fileName || 'Document preview'} />
            </div>
          )}

          {canUseOfficeOnlineViewer && (
            <iframe src={officeViewerUrl} title={fileName || 'Document preview'} className="doc-viewer-frame" />
          )}

          {!driveFileId && !isPdf && !isImage && !canUseOfficeOnlineViewer && (
            <div className="doc-viewer-fallback">
              <FiFileText className="doc-viewer-fallback-icon" />
              <p>Inline preview isn't available for this file{extension ? ` (.${extension})` : ''}.</p>
              <div className="doc-viewer-fallback-actions">
                <button type="button" className="doc-viewer-btn primary" onClick={handleDownload}>
                  <FiDownload /> Download File
                </button>
                {isAdmin && !isDataUrl && (
                  <a className="doc-viewer-btn" href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <FiExternalLink /> Open in New Tab
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
