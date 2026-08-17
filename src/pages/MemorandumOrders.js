import React, { useState, useContext, useRef } from 'react';
import { FiFileText, FiCalendar, FiClock, FiDownload, FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadFiles, downloadDocument } from '../lib/uploads';
import DocumentViewerModal from '../components/DocumentViewerModal';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import { richTextToPlain } from '../components/richText';
import { AlertSubscribeButton } from '../components/AlertSubscribe';
import './MemorandumOrders.css';

const MemorandumOrders = () => {
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { memorandums: memos, createMemorandum, updateMemorandum, deleteMemorandum } = useData();
  const [viewerMemo, setViewerMemo] = useState(null);
  const [readMemo, setReadMemo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    title: '',
    description: '',
    date: '',
    effectiveDate: '',
    pdfUrl: ''
  });
  const fileInputRef = useRef(null);

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ number: '', title: '', description: '', date: '', effectiveDate: '', pdfUrl: '' });
    setSelectedPdfFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleEdit = (memo) => {
    setEditItem(memo);
    setFormData({
      number: memo.number,
      title: memo.title,
      description: memo.description,
      date: memo.date,
      effectiveDate: memo.effectiveDate,
      pdfUrl: memo.pdfUrl || ''
    });
    setSelectedPdfFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete memorandum?',
      message: 'This memorandum will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteMemorandum(id);
  };

  const handleRemoveSelectedFile = () => {
    setSelectedPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExistingPdf = () => {
    setFormData((prev) => ({ ...prev, pdfUrl: '' }));
    setSelectedPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!richTextToPlain(formData.description).trim()) {
      notify('Please write the description before saving.');
      return;
    }

    setIsSaving(true);

    let uploadedPdfUrl = '';
    if (selectedPdfFile) {
      try {
        const [url] = await uploadFiles([selectedPdfFile], 'memorandums', ({ status, successCount, failedCount }) => {
          if (status === 'uploading') setUploadStatus('Uploading PDF file...');
          if (status === 'done') setUploadStatus(`File: ${successCount} uploaded, ${failedCount} skipped.`);
        });
        uploadedPdfUrl = url || '';
      } catch (error) {
        uploadedPdfUrl = '';
      }

      if (!uploadedPdfUrl) {
        notify('Failed to upload the file. If offline, please ensure the file is under 800KB.');
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      ...formData,
      pdfUrl: uploadedPdfUrl || formData.pdfUrl
    };

    try {
      if (editItem) {
        await updateMemorandum(editItem.id, payload);
      } else {
        await createMemorandum(payload);
      }
      setShowAdminModal(false);
      setEditItem(null);
    } catch (error) {
      notify('Saving memorandum failed: ' + error.message + '\n\nPlease check Firebase rules/setup and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleMemos = isAdmin
    ? memos.filter((memo) => matchesQuery(searchTerm, [memo.number, memo.title, richTextToPlain(memo.description)]))
    : memos;

  useModalBehaviour(showAdminModal, () => setShowAdminModal(false));

  return (
    <div className="memorandum-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>Memorandum Orders</h1>
          <p>Official directives, policies, and guidelines issued by the administration. Stay compliant and informed with the latest memorandums.</p>
          <div className="page-header-actions">
            {!isAdmin && <AlertSubscribeButton label="Notify me of new memoranda" />}
            {isAdmin && (
              <button className="admin-add-btn" onClick={handleAdd}>
                <FiPlus /> Add Memorandum
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container section">
        <div className="memo-info-banner">
          <FiFileText className="info-icon" />
          <div>
            <h3>About Memorandum Orders</h3>
            <p>Memorandum orders are official documents containing directives, policies, and guidelines that all students must follow. Please read and understand each memorandum carefully.</p>
          </div>
        </div>

        {isAdmin && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by memo number, title, or description..."
            resultCount={visibleMemos.length}
            totalCount={memos.length}
          />
        )}

        {isAdmin && searchTerm && !visibleMemos.length && (
          <div className="admin-search-empty">
            No memorandums match <strong>"{searchTerm}"</strong>.
          </div>
        )}

        <div className="memos-container">
          {visibleMemos.map((memo, index) => (
            <div
              key={memo.id}
              className="memo-item"
              style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
              onClick={() => setReadMemo(memo)}
            >
              <div className="memo-left">
                <div className="memo-badge">
                  <FiFileText />
                  <span>{memo.number}</span>
                </div>
              </div>

              <div className="memo-middle">
                <h3 className="memo-title">{memo.title}</h3>
                <RichContent html={memo.description} className="rich-preview memo-description" />
                <div className="memo-dates">
                  <span className="memo-date">
                    <FiCalendar />
                    Issued: {new Date(memo.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="memo-date effective">
                    <FiClock />
                    Effective: {new Date(memo.effectiveDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="memo-right">
                <button
                  className="download-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDocument(memo.pdfUrl, `${memo.number || 'memo'}-${memo.title || 'document'}`);
                  }}
                >
                  <FiDownload />
                  <span>Download PDF</span>
                </button>
                {isAdmin && (
                  <div className="admin-actions">
                    <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(memo); }}>
                      <FiEdit2 />
                    </button>
                    <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(memo.id); }}>
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="memo-footer">
          <p>
            <strong>Note:</strong> For questions or clarifications regarding any memorandum order, 
            please visit the SSC Office or contact us through our official channels.
          </p>
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Memorandum' : 'Add New Memorandum'}</h3>
              <button className="admin-modal-close" onClick={() => setShowAdminModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-group">
                <label>Memo Number</label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="e.g., MO-2024-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Describe this memorandum. Use the toolbar for bold, italics, headings and lists."
                />
              </div>
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Effective Date</label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Upload PDF / Document File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                />
                {selectedPdfFile && (
                  <div className="selected-file-row">
                    <span>{selectedPdfFile.name}</span>
                    <button type="button" className="remove-file-btn" onClick={handleRemoveSelectedFile}>
                      <FiX /> Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Or PDF / Document URL</label>
                <input
                  type="url"
                  value={formData.pdfUrl}
                  onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                  placeholder="https://..."
                />
                {editItem && formData.pdfUrl && !selectedPdfFile && (
                  <button type="button" className="clear-template-btn" onClick={handleRemoveExistingPdf}>
                    <FiX /> Remove existing document link
                  </button>
                )}
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
                    style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.25rem', border: 'none', borderRadius: 'var(--radius-md)', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                  >
                    <FiTrash2 /> Delete Memorandum
                  </button>
                )}
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Uploading...' : `${editItem ? 'Update' : 'Add'} Memorandum`}
                </button>
              </div>
              {!!uploadStatus && <p className={`upload-status-text ${isSaving ? 'uploading' : ''}`}>{uploadStatus}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Reading Modal */}
      {readMemo && (
        <div className="modal-overlay" onClick={() => setReadMemo(null)}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setReadMemo(null)}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-tag-row">
                  <span className="modal-category-tag">{readMemo.number}</span>
                </div>
                <h2 className="blog-article-title">{readMemo.title}</h2>
                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    Issued {new Date(readMemo.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="blog-meta-item">
                    <FiClock />
                    Effective {new Date(readMemo.effectiveDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="blog-article-body">
                <RichContent html={readMemo.description} />

                <div className="blog-section">
                  <div className="blog-section-title">Official Document</div>
                  {readMemo.pdfUrl ? (
                    <>
                      <div className="memo-doc-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setViewerMemo(readMemo)}
                        >
                          <FiFileText /> Open Full Screen
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() =>
                            downloadDocument(readMemo.pdfUrl, `${readMemo.number || 'memo'}-${readMemo.title || 'document'}`)
                          }
                        >
                          <FiDownload /> Download
                        </button>
                      </div>
                      <iframe
                        src={readMemo.pdfUrl}
                        title={`${readMemo.number} document`}
                        className="memo-doc-frame"
                      />
                    </>
                  ) : (
                    <p className="memo-doc-empty">No document file has been attached to this memorandum yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewerMemo && (
        <DocumentViewerModal
          fileUrl={viewerMemo.pdfUrl}
          fileName={`${viewerMemo.number || 'memo'}-${viewerMemo.title || 'document'}`}
          title={viewerMemo.title}
          onClose={() => setViewerMemo(null)}
        />
      )}
    </div>
  );
};

export default MemorandumOrders;
