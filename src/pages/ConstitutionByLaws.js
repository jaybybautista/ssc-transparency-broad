import React, { useState, useContext, useRef } from 'react';
import { FiBookOpen, FiCalendar, FiFileText, FiDownload, FiEdit2, FiTrash2, FiPlus, FiX, FiEye } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadFiles, downloadDocument, getLastUploadFailureReason } from '../lib/uploads';
import DocumentViewerModal, { getDriveFileId } from '../components/DocumentViewerModal';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import { richTextToPlain } from '../components/richText';
import { useLanguage } from '../context/LanguageContext';
import './ConstitutionByLaws.css';

const CATEGORIES = ['Constitution', 'By-Laws', 'Amendment', 'Implementing Rules'];

const ConstitutionByLaws = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { constitutionDocs, createConstitutionDoc, updateConstitutionDoc, deleteConstitutionDoc } = useData();
  const [viewerDoc, setViewerDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: 'Constitution',
    version: '',
    effectiveDate: '',
    description: '',
    fileName: '',
    fileUrl: ''
  });
  const fileInputRef = useRef(null);

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', category: 'Constitution', version: '', effectiveDate: '', description: '', fileName: '', fileUrl: '' });
    setSelectedFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || 'Constitution',
      version: item.version || '',
      effectiveDate: item.effectiveDate || '',
      description: item.description || '',
      fileName: item.fileName || '',
      fileUrl: item.fileUrl || ''
    });
    setSelectedFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete document?',
      message: 'This document comes off the site right away. You will have a few seconds to undo it.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteConstitutionDoc(id);
  };

  const handleRemoveExistingFile = () => {
    setFormData((prev) => ({ ...prev, fileName: '', fileUrl: '' }));
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checked explicitly rather than left to the inputs' `required` attribute:
    // that native validation bubble anchors unreliably on a field inside this
    // modal's fixed, scrolling layout, so a blank title or date could silently
    // block the submit with no visible message.
    if (!formData.title.trim() || !formData.effectiveDate) {
      notify('Please give it a title and an effective date before saving.');
      return;
    }
    setIsSaving(true);

    let uploadedUrl = '';
    if (selectedFile) {
      try {
        const [url] = await uploadFiles([selectedFile], 'constitution', ({ status, successCount, failedCount }) => {
          if (status === 'uploading') setUploadStatus('Uploading document...');
          if (status === 'done') setUploadStatus(`Document: ${successCount} uploaded, ${failedCount} skipped.`);
        });
        uploadedUrl = url || '';
      } catch (error) {
        uploadedUrl = '';
      }

      if (!uploadedUrl) {
        notify(getLastUploadFailureReason() || 'Failed to upload the document. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      ...formData,
      fileName: selectedFile?.name || formData.fileName || '',
      fileUrl: uploadedUrl || formData.fileUrl || ''
    };

    try {
      if (editItem) {
        await updateConstitutionDoc(editItem.id, payload);
      } else {
        await createConstitutionDoc(payload);
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

  const visibleDocs = isAdmin
    ? constitutionDocs.filter((item) =>
        matchesQuery(searchTerm, [item.title, item.category, item.version, richTextToPlain(item.description)])
      )
    : constitutionDocs;

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  return (
    <div className="constitution-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('con.title')}</h1>
          <p>{t('con.subtitle')}</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Document
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        <div className="constitution-info">
          <FiBookOpen className="info-icon" />
          <div>
            <h3>{t('con.about')}</h3>
            <p>
              These are the official governing documents of the SSC. They define the council's structure,
              the duties of every officer, and the rules that govern elections and proceedings. Tap any
              document to read it here on the site.
            </p>
          </div>
        </div>

        {isAdmin && !!constitutionDocs.length && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, category, or version..."
            resultCount={visibleDocs.length}
            totalCount={constitutionDocs.length}
          />
        )}

        {!constitutionDocs.length ? (
          <div className="constitution-empty">
            <FiBookOpen />
            <h3>{t('con.none')}</h3>
            <p>
              {isAdmin
                ? 'Use “Add Document” above to upload the constitution or by-laws.'
                : 'The constitution and by-laws will appear here once they are published.'}
            </p>
          </div>
        ) : !visibleDocs.length ? (
          <div className="admin-search-empty">
            No documents match <strong>"{searchTerm}"</strong>.
          </div>
        ) : (
          <div className="constitution-list">
            {visibleDocs.map((item, index) => (
              <div
                key={item.id}
                className="constitution-card"
                style={{ animationDelay: `${index * 0.08}s` }}
                onClick={() => (item.fileUrl ? setViewerDoc(item) : notify('No document file has been attached yet.'))}
              >
                <div className="constitution-icon">
                  <FiBookOpen />
                </div>

                <div className="constitution-body">
                  <div className="constitution-tags">
                    <span className="constitution-category">{item.category}</span>
                    {item.version && <span className="constitution-version">{item.version}</span>}
                  </div>
                  <h3 className="constitution-title">{item.title}</h3>
                  {item.description && (
                    <RichContent html={item.description} className="rich-preview constitution-description" />
                  )}
                  <div className="constitution-meta">
                    <span>
                      <FiCalendar /> Effective{' '}
                      {new Date(item.effectiveDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    {isAdmin && item.fileName && (
                      <span className="constitution-file">
                        <FiFileText /> {item.fileName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="constitution-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.fileUrl ? setViewerDoc(item) : notify('No document file has been attached yet.');
                    }}
                  >
                    <FiEye /> Read
                  </button>
                  {/* A Drive share link is not a direct file URL, so "Download"
                      would just send students to Drive. Admins keep it. */}
                  {(isAdmin || !getDriveFileId(item.fileUrl)) && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadDocument(item.fileUrl, item.fileName || item.title || 'constitution');
                      }}
                    >
                      <FiDownload /> Download
                    </button>
                  )}
                  {isAdmin && (
                    <div className="admin-actions">
                      <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                        <FiEdit2 />
                      </button>
                      <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerDoc && (
        <DocumentViewerModal
          fileUrl={viewerDoc.fileUrl}
          fileName={viewerDoc.fileName || viewerDoc.title}
          title={viewerDoc.title}
          onClose={() => setViewerDoc(null)}
        />
      )}

      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" ref={adminModalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Document' : 'Add Constitution / By-Laws Document'}</h3>
              <button className="admin-modal-close" onClick={() => setShowAdminModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-section">
                <div className="form-section-title">Document details</div>
                <div className="form-group">
                  <label className="is-required">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., SSC Constitution and By-Laws"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Version</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="e.g., 2026 Revision"
                    />
                  </div>
                  <div className="form-group">
                    <label className="is-required">Effective Date</label>
                    <input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Summary</div>
                <div className="form-group">
                  <RichTextEditor
                    value={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Briefly describe what this document covers."
                    minHeight={150}
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Document file</div>
                <div className="form-group">
                  <label>Upload PDF or Word document</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <small className="form-hint">PDF is recommended, it previews directly on the site.</small>
                  {selectedFile && (
                    <div className="selected-file-row">
                      <span>{selectedFile.name}</span>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        <FiX /> Remove
                      </button>
                    </div>
                  )}
                  {editItem && formData.fileUrl && !selectedFile && (
                    <div className="selected-file-row">
                      <span>{formData.fileName || 'Existing document'}</span>
                      <button type="button" className="remove-file-btn" onClick={handleRemoveExistingFile}>
                        <FiX /> Remove existing
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Or paste a link</label>
                  <input
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/.../view"
                  />
                  <small className="form-hint">
                    Google Drive links preview directly on the site. Set the file to
                    “Anyone with the link can view”. Use this for large documents.
                  </small>
                </div>
              </div>

              <div className="form-actions">
                {editItem && (
                  <button
                    type="button"
                    className="btn-delete-item"
                    onClick={() => {
                      handleDelete(editItem.id);
                      setShowAdminModal(false);
                    }}
                  >
                    <FiTrash2 /> Delete
                  </button>
                )}
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Document`}
                </button>
              </div>
              {!!uploadStatus && <p className={`upload-status-text ${isSaving ? 'uploading' : ''}`}>{uploadStatus}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstitutionByLaws;
