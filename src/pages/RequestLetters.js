import React, { useContext, useState, useRef } from 'react';
import { FiFileText, FiPackage, FiHome, FiDollarSign, FiAward, FiUsers, FiChevronDown, FiChevronUp, FiDownload, FiEye, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import ContentLoader from '../components/ContentLoader';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadFiles, downloadDocument } from '../lib/uploads';
import DocumentViewerModal from '../components/DocumentViewerModal';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import { useLanguage } from '../context/LanguageContext';
import './RequestLetters.css';

const RequestLetters = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { requestTypes, createRequestType, updateRequestType, deleteRequestType, isCollectionLoading } = useData();
  const isLoadingList = isCollectionLoading('requestTypes');
  const [expandedType, setExpandedType] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ type: '', description: '', requirements: '', imageUrls: [], templateName: '', templateUrl: '' });
  const [selectedTemplateFile, setSelectedTemplateFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleRemoveSelectedFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedTemplateFile(null);
  };

  const handleRemoveExistingTemplate = () => {
    setFormData((prev) => ({ ...prev, templateName: '', templateUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedTemplateFile(null);
  };

  const icons = {
    'Borrowing of Equipment': FiPackage,
    'Venue Reservation': FiHome,
    'Financial Assistance': FiDollarSign,
    'Certificate Request': FiAward,
    'Partnership Request': FiUsers
  };

  const toggleExpand = (id) => {
    setExpandedType(expandedType === id ? null : id);
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ type: '', description: '', requirements: '', imageUrls: [], templateName: '', templateUrl: '' });
    setSelectedTemplateFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      type: item.type || '',
      description: item.description || '',
      requirements: Array.isArray(item.requirements) ? item.requirements.join('\n') : '',
      imageUrls: item.imageUrls || [],
      templateName: item.templateName || '',
      templateUrl: item.templateUrl || ''
    });
    setSelectedTemplateFile(null);
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete request type?',
      message: 'This request type comes off the site right away. You will have a few seconds to undo it.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteRequestType(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checked explicitly rather than left to these inputs' `required`
    // attribute: that native validation bubble anchors unreliably on a field
    // inside this modal's fixed, scrolling layout, so a blank field could
    // silently block the submit with no visible message.
    if (!formData.type.trim() || !formData.description.trim() || !formData.requirements.trim()) {
      notify('Please fill in the type, description and requirements before saving.');
      return;
    }
    setIsSaving(true);

    let uploadedTemplateUrl = '';
    if (selectedTemplateFile) {
      try {
        const [url] = await uploadFiles([selectedTemplateFile], 'request-templates', ({ status, successCount, failedCount }) => {
          if (status === 'uploading') setUploadStatus('Uploading template file...');
          if (status === 'done') setUploadStatus(`Template: ${successCount} uploaded, ${failedCount} skipped.`);
        });
        uploadedTemplateUrl = url || '';
      } catch (error) {
        uploadedTemplateUrl = '';
      }

      if (!uploadedTemplateUrl) {
        notify('Failed to upload the template file. If you are offline or Firebase is not configured, please ensure the file is under 800KB.');
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      type: formData.type,
      description: formData.description,
      requirements: formData.requirements.split('\n').map((item) => item.trim()).filter(Boolean),
      templateName: selectedTemplateFile?.name || formData.templateName || '',
      templateUrl: uploadedTemplateUrl || formData.templateUrl || ''
    };

    try {
      if (editItem) {
        await updateRequestType(editItem.id, payload);
      } else {
        await createRequestType(payload);
      }
      setShowAdminModal(false);
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase setup/rules and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleRequestTypes = isAdmin
    ? requestTypes.filter((requestType) =>
        matchesQuery(searchTerm, [
          requestType.type,
          requestType.description,
          requestType.templateName,
          requestType.requirements || []
        ])
      )
    : requestTypes;

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  return (
    <div className="request-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('req.title')}</h1>
          <p>{t('req.subtitle')}</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Request Type
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        <div className="request-info">
          <FiFileText className="info-icon" />
          <div>
            <h3>{t('req.heading')}</h3>
            <p>Select a request type below to learn more about the requirements and download the appropriate template. Submit completed forms to the SSC Office.</p>
          </div>
        </div>

        {isAdmin && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by request type, description, or requirements..."
            resultCount={visibleRequestTypes.length}
            totalCount={requestTypes.length}
          />
        )}

        {isAdmin && searchTerm && !visibleRequestTypes.length && (
          <div className="admin-search-empty">
            No request types match <strong>"{searchTerm}"</strong>.
          </div>
        )}

        {isLoadingList && <ContentLoader variant="cards" count={3} />}

        <div className="request-types">
          {visibleRequestTypes.map((requestType) => {
            const IconComponent = icons[requestType.type] || FiFileText;
            const isExpanded = expandedType === requestType.id;
            
            return (
              <div key={requestType.id} className={`request-type-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="type-header" onClick={() => toggleExpand(requestType.id)}>
                  <div className="type-icon">
                    <IconComponent />
                  </div>
                  <div className="type-info">
                    <h3>{requestType.type}</h3>
                    <p>{requestType.description}</p>
                  </div>
                  <button className="expand-btn">
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="type-details">
                    <div className="requirements">
                      <h4>{t('req.requirements')}</h4>
                      <ul>
                        {requestType.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="type-actions">
                      {requestType.templateUrl ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewerFile({ url: requestType.templateUrl, name: requestType.templateName, title: requestType.type });
                            }}
                          >
                            <FiEye /> {t('req.viewTemplate')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDocument(requestType.templateUrl, requestType.templateName || 'template');
                            }}
                          >
                            <FiDownload /> {t('req.downloadTemplate')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary disabled"
                          onClick={(e) => {
                            e.stopPropagation();
                            notify('No template file has been uploaded for this request type yet.');
                          }}
                        >
                          <FiDownload /> {t('req.downloadTemplate')}
                        </button>
                      )}
                      {isAdmin && requestType.templateName && <span className="template-name">{requestType.templateName}</span>}
                      {isAdmin && (
                        <>
                          <button type="button" className="admin-edit-btn" onClick={() => handleEdit(requestType)}>
                            <FiEdit2 />
                          </button>
                          <button type="button" className="admin-delete-btn" onClick={() => handleDelete(requestType.id)}>
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Guidelines */}
        <div className="guidelines-section">
          <h3>📋 Request Guidelines</h3>
          <div className="guidelines-grid">
            <div className="guideline">
              <span className="guideline-num">1</span>
              <p>Submit completed forms directly to the <strong>SSC Office</strong>.</p>
            </div>
            <div className="guideline">
              <span className="guideline-num">2</span>
              <p>Borrowed equipment must be returned in <strong>good condition</strong>.</p>
            </div>
            <div className="guideline">
              <span className="guideline-num">3</span>
              <p>Ensure all required information is <strong>complete and accurate</strong>.</p>
            </div>
          </div>
        </div>
      </div>

      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" ref={adminModalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Request Type' : 'Add Request Type'}</h3>
              <button className="admin-modal-close" onClick={() => setShowAdminModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-group"><label>Type</label><input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} /></div>
              <div className="form-group"><label>Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3" /></div>
              <div className="form-group"><label>Requirements (one per line)</label><textarea value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} rows="4" /></div>
              <div className="form-group">
                <label>Template File (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx"
                  onChange={(e) => setSelectedTemplateFile(e.target.files?.[0] || null)}
                />
                {selectedTemplateFile && (
                  <div className="selected-file-row">
                    <span>{selectedTemplateFile.name}</span>
                    <button type="button" className="remove-file-btn" onClick={handleRemoveSelectedFile}>
                      <FiX /> Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Or Template URL</label>
                <input
                  type="url"
                  value={formData.templateUrl}
                  onChange={(e) => setFormData({ ...formData, templateUrl: e.target.value })}
                  placeholder="https://..."
                />
                {editItem && (formData.templateUrl || formData.templateName) && (
                  <button type="button" className="clear-template-btn" onClick={handleRemoveExistingTemplate}>
                    <FiX /> Remove existing template
                  </button>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={isSaving}>{isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Type`}</button>
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

export default RequestLetters;
