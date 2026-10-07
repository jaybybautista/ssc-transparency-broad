import React, { useState, useContext, useRef } from 'react';
import { FiBook, FiCalendar, FiUsers, FiFileText, FiEye, FiX, FiEdit2, FiTrash2, FiPlus, FiDownload } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadFiles, uploadImages, downloadDocument } from '../lib/uploads';
import DocumentViewerModal from '../components/DocumentViewerModal';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import ImageCarousel from '../components/ImageCarousel';
import AuthorByline from '../components/AuthorByline';
import AuthorPicker, { EMPTY_AUTHOR } from '../components/AuthorPicker';
import { richTextToPlain } from '../components/richText';
import LoadMore from '../components/LoadMore';
import { useLanguage } from '../context/LanguageContext';
import './NarrativeReports.css';

const NarrativeReports = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { narrativeReports: reports, createNarrativeReport, updateNarrativeReport, deleteNarrativeReport, getViewCount: getSharedViewCount, trackView} = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    eventType: '',
    description: '',
    participants: '',
    imageUrls: [],
    fileName: '',
    fileUrl: '',
    ...EMPTY_AUTHOR
  });
  const [authorImageFile, setAuthorImageFile] = useState(null);
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [manualImageUrls, setManualImageUrls] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const docFileInputRef = useRef(null);

  // Admin CRUD handlers
  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', date: '', eventType: '', description: '', participants: '', imageUrls: [], fileName: '', fileUrl: '', ...EMPTY_AUTHOR });
    setSelectedImageFiles([]);
    setManualImageUrls('');
    setSelectedDocFile(null);
    setAuthorImageFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleEdit = (report) => {
    setEditItem(report);
    setFormData({
      title: report.title,
      date: report.date,
      eventType: report.eventType || report.event || '',
      description: report.description || report.summary || '',
      participants: report.participants || '',
      imageUrls: report.imageUrls || [],
      fileName: report.fileName || '',
      fileUrl: report.fileUrl || '',
      authorOfficerId: report.authorOfficerId || '',
      authorName: report.authorName || '',
      authorPosition: report.authorPosition || '',
      authorImage: report.authorImage || ''
    });
    setSelectedDocFile(null);
    setAuthorImageFile(null);
    setSelectedImageFiles([]);
    // Saved images are managed by the thumbnail grid, so this box is only
    // for adding new URLs.
    setManualImageUrls('');
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete report?',
      message: 'This report comes off the site right away. You will have a few seconds to undo it.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteNarrativeReport(id);
  };

  const handleRemoveDocFile = () => {
    setSelectedDocFile(null);
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  const handleRemoveExistingDoc = () => {
    setFormData((prev) => ({ ...prev, fileName: '', fileUrl: '' }));
    setSelectedDocFile(null);
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Checked explicitly rather than left to the inputs' `required` attribute:
    // that native validation bubble anchors unreliably on a field inside this
    // modal's fixed, scrolling layout, so a blank title or date could silently
    // block the submit with no visible message.
    if (!formData.title.trim() || !formData.date) {
      notify('Please give it a title and a date before saving.');
      return;
    }

    if (!richTextToPlain(formData.description).trim()) {
      notify('Please write the description/summary before saving.');
      return;
    }

    setIsSaving(true);

    let uploadedFileUrl = '';
    if (selectedDocFile) {
      try {
        const [url] = await uploadFiles([selectedDocFile], 'narrative-documents', ({ status, successCount, failedCount }) => {
          if (status === 'uploading') setUploadStatus('Uploading document...');
          if (status === 'done') setUploadStatus(`Document: ${successCount} uploaded, ${failedCount} skipped.`);
        });
        uploadedFileUrl = url || '';
      } catch (error) {
        uploadedFileUrl = '';
      }

      if (!uploadedFileUrl) {
        notify('Failed to upload the document file. Please ensure the file is under 800KB if offline, or check Firebase setup.');
        setIsSaving(false);
        return;
      }
    }

    let uploadedImageUrls = [];
    if (selectedImageFiles.length) {
      try {
        uploadedImageUrls = await uploadImages(selectedImageFiles, 'narrative-reports', ({ current, total, successCount, failedCount, status }) => {
          if (status === 'uploading') setUploadStatus(`Uploading image ${current}/${total}...`);
          if (status === 'done') setUploadStatus(`${successCount} uploaded, ${failedCount} skipped.`);
        });
      } catch (error) {
        uploadedImageUrls = [];
      }
    }

    const pastedImageUrls = manualImageUrls
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    let uploadedAuthorImage = '';
    if (authorImageFile) {
      try {
        const [url] = await uploadFiles([authorImageFile], 'authors', ({ status }) => {
          if (status === 'uploading') setUploadStatus('Uploading author photo...');
        });
        uploadedAuthorImage = url || '';
      } catch (error) {
        uploadedAuthorImage = '';
      }
    }

    const payload = {
      ...formData,
      event: formData.eventType,
      eventType: formData.eventType,
      summary: formData.description,
      participants: Number(formData.participants) || 0,
      imageUrls: [...(formData.imageUrls || []), ...uploadedImageUrls, ...pastedImageUrls],
      fileName: selectedDocFile?.name || formData.fileName || '',
      fileUrl: uploadedFileUrl || formData.fileUrl || '',
      authorImage: uploadedAuthorImage || formData.authorImage || ''
    };

    try {
      if (editItem) {
        await updateNarrativeReport(editItem.id, payload);
      } else {
        await createNarrativeReport(payload);
      }
      setShowAdminModal(false);
      setEditItem(null);
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase setup/rules and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Shared view counts, held in Firestore. These used to be per-device
  // localStorage numbers, which meant everyone saw a different figure.
  const getViewCount = (id) => getSharedViewCount('narrativeReports', id);
  const incrementViewCount = (id) => trackView('narrativeReports', id);


  const openModal = (report) => {
    setSelectedReport(report);
    setModalOpen(true);
    incrementViewCount(report.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedReport(null);
  };

  const visibleReports = isAdmin
    ? reports.filter((report) =>
        matchesQuery(searchTerm, [
          report.title,
          report.event,
          report.eventType,
          richTextToPlain(report.summary),
          richTextToPlain(report.description),
          report.fileName,
          report.authorName
        ])
      )
    : reports;

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  return (
    <div className="narrative-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('nar.title')}</h1>
          <p>{t('nar.subtitle')}</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Report
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        <div className="narrative-info">
          <FiBook className="info-icon" />
          <div>
            <h3>{t('nar.about')}</h3>
            <p>Narrative reports provide detailed documentation of SSC-organized events and activities. These reports include objectives, proceedings, outcomes, and recommendations for future improvements.</p>
          </div>
        </div>

        {isAdmin && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, event type, or summary..."
            resultCount={visibleReports.length}
            totalCount={reports.length}
          />
        )}

        {isAdmin && searchTerm && !visibleReports.length && (
          <div className="admin-search-empty">
            No reports match <strong>"{searchTerm}"</strong>.
          </div>
        )}

        <div className="reports-grid">
          {visibleReports.map((report, index) => (
            <div key={report.id} className="report-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="report-card-content" onClick={() => openModal(report)}>
                <div className="report-header">
                  <span className="report-type">{report.event || report.eventType}</span>
                  <span className="report-views">
                    <FiEye /> {getViewCount(report.id)}
                  </span>
                </div>

                <h3 className="report-title">{report.title}</h3>
                
                <span className="report-date">
                  <FiCalendar />
                  {new Date(report.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>

                <AuthorByline item={report} size="sm" className="report-card-byline" />

                <RichContent html={report.summary || report.description} className="rich-preview report-summary" />

                {!!report.imageUrls?.length && (
                  <div className="report-image-preview">
                    {[...new Set(report.imageUrls)].slice(0, 3).map((img, imgIndex) => (
                      <img key={`${img}-${imgIndex}`} src={img} alt={report.title} />
                    ))}
                    {report.imageUrls.length > 3 && (
                      <span className="report-image-more">+{report.imageUrls.length - 3}</span>
                    )}
                  </div>
                )}

                {report.participants > 0 && (
                  <div className="report-stats">
                    <div className="stat">
                      <FiUsers />
                      <span>
                        {report.participants} participant{report.participants === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                )}

                {report.fileUrl && (
                  <div className="report-file-badge" onClick={(e) => e.stopPropagation()}>
                    <FiFileText />
                    <span>{isAdmin && report.fileName ? report.fileName : t('common.attachedDocument')}</span>
                  </div>
                )}

                <div className="report-actions">
                  <button type="button" className="see-more-btn">
                    <FiFileText /> {t('common.seeMore')}
                  </button>
                  {report.fileUrl && (
                    <div className="report-doc-actions">
                      <button
                        type="button"
                        className="report-download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerFile({ url: report.fileUrl, name: report.fileName, title: report.title });
                        }}
                      >
                        <FiEye /> View
                      </button>
                      <button
                        type="button"
                        className="report-download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadDocument(report.fileUrl, report.fileName || 'narrative-report');
                        }}
                      >
                        <FiDownload /> Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="admin-actions">
                  <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(report); }}>
                    <FiEdit2 />
                  </button>
                  <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}>
                    <FiTrash2 />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* The listener fetches a page at a time, so older records
            need a way to be reached. */}
        <LoadMore collectionKey="narrativeReports" label="reports" shownCount={visibleReports.length} />
      </div>

      {/* Modal */}
      {modalOpen && selectedReport && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-tag-row">
                  <span className="modal-event-tag">{selectedReport.event || selectedReport.eventType}</span>
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount(selectedReport.id)} views
                  </span>
                </div>
                <h2 className="blog-article-title">{selectedReport.title}</h2>

                <AuthorByline
                  item={selectedReport}
                  size="md"
                  className="blog-article-byline"
                  date={new Date(selectedReport.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                />

                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {new Date(selectedReport.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="blog-meta-item">
                    <FiUsers /> {selectedReport.participants} Participants
                  </span>
                </div>
              </div>

              <div className="blog-article-body">
                {!!selectedReport.imageUrls?.length && (
                  <ImageCarousel images={selectedReport.imageUrls} alt={selectedReport.title} />
                )}
                <RichContent html={selectedReport.summary || selectedReport.description} />
              {selectedReport.fileUrl && (
                <div className="modal-section" style={{ marginTop: '1.25rem' }}>
                  <h4>{t('common.attachedDocument')}</h4>
                  <div className="modal-file-download">
                    <FiFileText className="file-icon" />
                    <span className="file-name">{isAdmin && selectedReport.fileName ? selectedReport.fileName : t('common.attachedDocument')}</span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setViewerFile({ url: selectedReport.fileUrl, name: selectedReport.fileName, title: selectedReport.title })}
                    >
                      <FiEye /> View
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => downloadDocument(selectedReport.fileUrl, selectedReport.fileName || 'narrative-report')}
                    >
                      <FiDownload /> Download
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" ref={adminModalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Report' : 'Add New Report'}</h3>
              <button className="admin-modal-close" onClick={() => setShowAdminModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Event Type</label>
                <input
                  type="text"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  placeholder="e.g., Seminar, Workshop"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Number of Participants</label>
                <input
                  type="text"
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Author</label>
                <AuthorPicker
                  key={editItem?.id || 'new-report'}
                  value={formData}
                  onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))}
                  imageFile={authorImageFile}
                  onImageFileChange={setAuthorImageFile}
                />
              </div>
              <div className="form-group">
                <label>Description/Summary</label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Write the narrative report. Use the toolbar for bold, italics, headings and lists."
                  minHeight={220}
                />
              </div>
              <div className="form-group">
                <label>Event Photos (you can select multiple)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setSelectedImageFiles(Array.from(e.target.files || []))}
                />
                <small className="form-hint">
                  These appear as a swipeable carousel that readers can tap to zoom.
                </small>
                {!!selectedImageFiles.length && (
                  <small>{selectedImageFiles.length} new image(s) ready to upload.</small>
                )}
                {!!formData.imageUrls?.length && (
                  <div className="existing-images-grid">
                    {formData.imageUrls.map((url, urlIndex) => (
                      <div key={`${url}-${urlIndex}`} className="existing-image">
                        <img src={url} alt="Report" />
                        <button
                          type="button"
                          title="Remove this image"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              imageUrls: (prev.imageUrls || []).filter((item) => item !== url)
                            }))
                          }
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Or paste image URLs (one per line)</label>
                <textarea
                  value={manualImageUrls}
                  onChange={(e) => setManualImageUrls(e.target.value)}
                  rows="2"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="form-group">
                <label>Upload Document File (PDF, Word, etc.)</label>
                <input
                  ref={docFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx"
                  onChange={(e) => setSelectedDocFile(e.target.files?.[0] || null)}
                />
                {selectedDocFile && (
                  <div className="selected-file-row">
                    <span>{selectedDocFile.name}</span>
                    <button type="button" className="remove-file-btn" onClick={handleRemoveDocFile}>
                      <FiX /> Remove
                    </button>
                  </div>
                )}
                {editItem && (formData.fileUrl || formData.fileName) && !selectedDocFile && (
                  <div className="selected-file-row">
                    <span>{formData.fileName || 'Existing document'}</span>
                    <button type="button" className="remove-file-btn" onClick={handleRemoveExistingDoc}>
                      <FiX /> Remove existing
                    </button>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Report`}
                </button>
              </div>
              {!!uploadStatus && <p className={`upload-status-text ${isSaving ? 'uploading' : ''}`}>{uploadStatus}</p>}
            </form>
          </div>
        </div>
      )}

      {viewerFile && (
        <DocumentViewerModal
          fileUrl={viewerFile.url}
          fileName={viewerFile.name}
          title={viewerFile.title}
          onClose={() => setViewerFile(null)}
        />
      )}
    </div>
  );
};

export default NarrativeReports;
