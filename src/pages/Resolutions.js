import React, { useState, useContext, useRef } from 'react';
import { FiFileText, FiCheckCircle, FiClock, FiThumbsUp, FiThumbsDown, FiMinus, FiEye, FiX, FiCalendar, FiEdit2, FiTrash2, FiPlus, FiDownload, FiLock, FiLogIn, FiUser } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import ContentLoader from '../components/ContentLoader';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { useVoterAuth } from '../context/VoterAuthContext';
import { uploadImages, uploadFiles, downloadDocument } from '../lib/uploads';
import DocumentViewerModal from '../components/DocumentViewerModal';
import ImageCarousel from '../components/ImageCarousel';
import RichContent from '../components/RichContent';
import LoadMore from '../components/LoadMore';
import { useLanguage } from '../context/LanguageContext';
import './Resolutions.css';

const Resolutions = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const {
    resolutions,
    createResolution,
    updateResolution,
    deleteResolution,
    castResolutionVote,
    retractResolutionVote,
    getResolutionTally,
    getMyResolutionVote, getViewCount: getSharedViewCount, trackView, isCollectionLoading } = useData();
  const isLoadingList = isCollectionLoading('resolutions');
  const { voter, signIn, signOut, authError, isVotingAvailable, allowedVoteDomains: voteDomains } = useVoterAuth();
  const [voteError, setVoteError] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    status: 'pending',
    votesFor: 0,
    votesAgainst: 0,
    abstain: 0,
    imageUrls: [],
    fileName: '',
    fileUrl: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [manualImageUrls, setManualImageUrls] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const docFileInputRef = useRef(null);

  // Admin CRUD handlers
  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', description: '', date: '', status: 'pending', votesFor: 0, votesAgainst: 0, abstain: 0, imageUrls: [], fileName: '', fileUrl: '' });
    setSelectedFiles([]);
    setManualImageUrls('');
    setUploadStatus('');
    setSelectedDocFile(null);
    setShowAdminModal(true);
  };

  const handleEdit = (resolution) => {
    setEditItem(resolution);
    setFormData({
      title: resolution.title,
      description: resolution.description,
      date: resolution.date,
      status: resolution.status,
      votesFor: resolution.votesFor || 0,
      votesAgainst: resolution.votesAgainst || 0,
      abstain: resolution.abstain || 0,
      imageUrls: resolution.imageUrls || [],
      fileName: resolution.fileName || '',
      fileUrl: resolution.fileUrl || ''
    });
    setSelectedFiles([]);
    // Saved images are managed by the thumbnail grid below, so this box starts
    // empty and is only for adding new URLs.
    setManualImageUrls('');
    setUploadStatus('');
    setSelectedDocFile(null);
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete resolution?',
      message: 'This resolution comes off the site right away. You will have a few seconds to undo it.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteResolution(id);
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
    // Checked explicitly rather than left to these inputs' `required`
    // attribute: that native validation bubble anchors unreliably on a field
    // inside this modal's fixed, scrolling layout, so a blank field could
    // silently block the submit with no visible message.
    if (!formData.title.trim() || !formData.description.trim() || !formData.date) {
      notify('Please fill in the title, description and date before saving.');
      return;
    }
    setIsSaving(true);

    let uploadedUrls = [];
    if (selectedFiles.length) {
      try {
        uploadedUrls = await uploadImages(selectedFiles, 'resolutions', ({ current, total, successCount, failedCount, status }) => {
          if (status === 'uploading') setUploadStatus(`Uploading image ${current}/${total}...`);
          if (status === 'done') setUploadStatus(`${successCount} uploaded, ${failedCount} skipped.`);
        });
      } catch (error) {
        uploadedUrls = [];
      }
    }

    let uploadedFileUrl = '';
    if (selectedDocFile) {
      try {
        const [url] = await uploadFiles([selectedDocFile], 'resolution-documents', ({ status, successCount, failedCount }) => {
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

    const pastedUrls = manualImageUrls.split('\n').map((line) => line.trim()).filter(Boolean);
    const payload = {
      ...formData,
      imageUrls: [...(formData.imageUrls || []), ...uploadedUrls, ...pastedUrls],
      fileName: selectedDocFile?.name || formData.fileName || '',
      fileUrl: uploadedFileUrl || formData.fileUrl || ''
    };

    try {
      if (editItem) {
        await updateResolution(editItem.id, payload);
      } else {
        await createResolution(payload);
      }
      setShowAdminModal(false);
      setEditItem(null);
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase rules/config and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Votes are keyed to the signed-in Google account, so casting the same choice
   * again retracts it and a different choice replaces it. Nothing is trusted
   * from the browser — firestore.rules re-checks the account server-side.
   */
  const handleVote = async (type) => {
    if (!selectedResolution) {
      return;
    }

    let currentVoter = voter;
    if (!currentVoter) {
      const signedIn = await signIn();
      if (!signedIn) return;
      currentVoter = signedIn;
    }

    setVoteError('');
    setIsVoting(true);
    try {
      const existing = getMyResolutionVote(selectedResolution.id, currentVoter.uid);
      if (existing?.choice === type) {
        await retractResolutionVote(selectedResolution.id, currentVoter);
      } else {
        await castResolutionVote(selectedResolution.id, type, currentVoter);
      }
    } catch (error) {
      setVoteError(
        error?.code === 'permission-denied'
          ? 'Your vote was rejected by the server. Make sure you are signed in with an eligible account.'
          : error?.message || 'Vote not saved. Please try again.'
      );
    } finally {
      setIsVoting(false);
    }
  };

  // Shared view counts, held in Firestore. These used to be per-device
  // localStorage numbers, which meant everyone saw a different figure.
  const getViewCount = (id) => getSharedViewCount('resolutions', id);
  const incrementViewCount = (id) => trackView('resolutions', id);


  const openModal = (resolution) => {
    setSelectedResolution(resolution);
    setModalOpen(true);
    incrementViewCount(resolution.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedResolution(null);
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <FiCheckCircle className="status-icon approved" />;
      case 'pending':
        return <FiClock className="status-icon pending" />;
      default:
        return <FiFileText className="status-icon" />;
    }
  };

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  return (
    <div className="resolutions-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('res.title')}</h1>
          <p>{t('res.subtitle')}</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Resolution
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        <div className="resolutions-info">
          <FiFileText className="info-icon" />
          <div>
            <h3>{t('res.about')}</h3>
            <p>Resolutions are formal expressions of the opinion or will of the Student Supreme Council. Each resolution undergoes deliberation and voting before being passed.</p>
          </div>
        </div>

        {isLoadingList && <ContentLoader variant="list" count={3} />}

        <div className="resolutions-list">
          {resolutions.map((resolution, index) => (
            <div key={resolution.id} className="resolution-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="resolution-card-content" onClick={() => openModal(resolution)}>
                <div className="resolution-header">
                  <div className="resolution-number">
                    <FiFileText />
                    <span>{resolution.number}</span>
                  </div>
                  <div className="resolution-header-right">
                    <span className="resolution-views">
                      <FiEye /> {getViewCount(resolution.id)}
                    </span>
                    <div className={`resolution-status ${resolution.status.toLowerCase()}`}>
                      {getStatusIcon(resolution.status)}
                      <span>{resolution.status}</span>
                    </div>
                  </div>
                </div>
                
                <h3 className="resolution-title">{resolution.title}</h3>
                <p className="resolution-description">{resolution.description}</p>
                {!!resolution.imageUrls?.length && (
                  <div className="resolution-image-grid">
                    {[...new Set(resolution.imageUrls)].slice(0, 2).map((img, imgIndex) => (
                      <img key={`${img}-${imgIndex}`} src={img} alt={resolution.title} />
                    ))}
                  </div>
                )}

                {resolution.fileUrl && (
                  <div className="resolution-file-badge" onClick={(e) => e.stopPropagation()}>
                    <FiFileText />
                    <span>{isAdmin && resolution.fileName ? resolution.fileName : t('common.attachedDocument')}</span>
                  </div>
                )}
                
                <div className="resolution-footer">
                  <span className="resolution-date">
                    📅 {new Date(resolution.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  
                  <div className="voting-results">
                    <span className="vote for">
                      <FiThumbsUp /> {getResolutionTally(resolution.id).for}
                    </span>
                    <span className="vote against">
                      <FiThumbsDown /> {getResolutionTally(resolution.id).against}
                    </span>
                    <span className="vote abstain">
                      <FiMinus /> {getResolutionTally(resolution.id).abstain}
                    </span>
                  </div>
                </div>

                <div className="resolution-actions-row">
                  <button className="see-more-btn" onClick={(e) => { e.stopPropagation(); openModal(resolution); }}>{t('common.seeMore')}</button>
                  {resolution.fileUrl && (
                    <>
                      <button
                        type="button"
                        className="resolution-download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerFile({ url: resolution.fileUrl, name: resolution.fileName, title: resolution.title });
                        }}
                      >
                        <FiEye /> View
                      </button>
                      <button
                        type="button"
                        className="resolution-download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadDocument(resolution.fileUrl, resolution.fileName || 'resolution-document');
                        }}
                      >
                        <FiDownload /> Download
                      </button>
                    </>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="admin-actions">
                  <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(resolution); }}>
                    <FiEdit2 />
                  </button>
                  <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(resolution.id); }}>
                    <FiTrash2 />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* The listener fetches a page at a time, so older records
            need a way to be reached. */}
        <LoadMore collectionKey="resolutions" label="resolutions" shownCount={resolutions.length} />
      </div>

      {/* Modal */}
      {modalOpen && selectedResolution && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-tag-row">
                  <span className="modal-number-tag">{selectedResolution.number}</span>
                  <div className={`resolution-status ${selectedResolution.status.toLowerCase()}`}>
                    {getStatusIcon(selectedResolution.status)}
                    <span>{selectedResolution.status}</span>
                  </div>
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount(selectedResolution.id)} views
                  </span>
                </div>
                <h2 className="blog-article-title">{selectedResolution.title}</h2>
                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {new Date(selectedResolution.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="blog-article-body">
              {!!selectedResolution.imageUrls?.length && (
                <ImageCarousel images={selectedResolution.imageUrls} alt={selectedResolution.title} />
              )}
              <RichContent html={selectedResolution.description} />
              {selectedResolution.fileUrl && (
                <div className="modal-section" style={{ marginTop: '1.25rem' }}>
                  <h4>{t('common.attachedDocument')}</h4>
                  <div className="modal-file-download">
                    <FiFileText className="file-icon" />
                    <span className="file-name">{isAdmin && selectedResolution.fileName ? selectedResolution.fileName : t('common.attachedDocument')}</span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setViewerFile({ url: selectedResolution.fileUrl, name: selectedResolution.fileName, title: selectedResolution.title })}
                    >
                      <FiEye /> View
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => downloadDocument(selectedResolution.fileUrl, selectedResolution.fileName || 'resolution-document')}
                    >
                      <FiDownload /> Download
                    </button>
                  </div>
                </div>
              )}
              {(() => {
                const tally = getResolutionTally(selectedResolution.id);
                const myVote = getMyResolutionVote(selectedResolution.id, voter?.uid);
                const voteButtons = [
                  { choice: 'for', icon: <FiThumbsUp />, label: 'Vote For' },
                  { choice: 'against', icon: <FiThumbsDown />, label: 'Vote Against' },
                  { choice: 'abstain', icon: <FiMinus />, label: 'Abstain' }
                ];

                return (
                  <div className="modal-voting">
                    <h4>{t('res.votingResults')}</h4>
                    <div className="voting-results-modal">
                      <div className="vote-item for">
                        <FiThumbsUp />
                        <span className="vote-count">{tally.for}</span>
                        <span className="vote-label">For</span>
                      </div>
                      <div className="vote-item against">
                        <FiThumbsDown />
                        <span className="vote-count">{tally.against}</span>
                        <span className="vote-label">Against</span>
                      </div>
                      <div className="vote-item abstain">
                        <FiMinus />
                        <span className="vote-count">{tally.abstain}</span>
                        <span className="vote-label">Abstain</span>
                      </div>
                    </div>

                    <p className="vote-total-line">
                      {tally.total === 0
                        ? 'No verified votes yet.'
                        : `${tally.total} verified vote${tally.total === 1 ? '' : 's'} from signed-in Google accounts.`}
                    </p>

                    {!isVotingAvailable ? (
                      <p className="vote-notice">Voting is unavailable because the cloud database is not configured.</p>
                    ) : !voter ? (
                      <div className="vote-signin">
                        <p>
                          <FiLock /> Sign in with your Google account to vote. One vote per account.
                          {!!voteDomains.length && (
                            <> Only {voteDomains.map((d) => `@${d}`).join(' or ')} accounts are eligible.</>
                          )}
                        </p>
                        <button type="button" className="btn btn-primary google-signin-btn" onClick={signIn}>
                          <FiLogIn /> {t('res.signInToVote')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="vote-identity">
                          {voter.photoURL ? (
                            <img src={voter.photoURL} alt="" />
                          ) : (
                            <span className="vote-identity-fallback"><FiUser /></span>
                          )}
                          <span className="vote-identity-email">
                            Voting as <strong>{voter.email}</strong>
                          </span>
                          <button type="button" className="vote-signout" onClick={signOut}>
                            Sign out
                          </button>
                        </div>

                        <div className="vote-actions">
                          {voteButtons.map((button) => (
                            <button
                              key={button.choice}
                              type="button"
                              className={`btn btn-outline ${myVote?.choice === button.choice ? 'active-vote' : ''}`}
                              onClick={() => handleVote(button.choice)}
                              disabled={isVoting}
                            >
                              {button.icon} {button.label}
                            </button>
                          ))}
                        </div>

                        {myVote && (
                          <p className="vote-notice">
                            Your vote: <strong>{myVote.choice}</strong>. Click it again to withdraw, or pick another option to change it.
                          </p>
                        )}
                      </>
                    )}

                    {!!(voteError || authError) && <p className="vote-error">{voteError || authError}</p>}
                  </div>
                );
              })()}
              {isAdmin && (
                <div className="modal-admin-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-modal-edit"
                    onClick={() => {
                      closeModal();
                      handleEdit(selectedResolution);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
                  >
                    <FiEdit2 /> Edit Resolution
                  </button>
                  <button
                    type="button"
                    className="btn-modal-delete"
                    onClick={async () => {
                      const shouldDelete = await confirm({
                        title: 'Delete resolution?',
                        message: 'This resolution and its recorded votes come off the site right away. You will have a few seconds to undo it.',
                        confirmLabel: 'Delete',
                        tone: 'danger'
                      });
                      if (!shouldDelete) return;
                      deleteResolution(selectedResolution.id);
                      closeModal();
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                  >
                    <FiTrash2 /> Delete Resolution
                  </button>
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
              <h3>{editItem ? 'Edit Resolution' : 'Add New Resolution'}</h3>
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
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Upload Images (multiple)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
                {!!formData.imageUrls?.length && (
                  <div className="existing-images-grid">
                    {formData.imageUrls.map((url, urlIndex) => (
                      <div key={`${url}-${urlIndex}`} className="existing-image">
                        <img src={url} alt="Resolution" />
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
                <textarea value={manualImageUrls} onChange={(e) => setManualImageUrls(e.target.value)} rows="3" />
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
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className="form-group">
                <p className="vote-notice" style={{ margin: 0 }}>
                  Vote counts are no longer entered by hand. They are tallied live from verified
                  Google sign-ins. See <strong>Resolution Votes</strong> in the sidebar for the list of accounts.
                </p>
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
                    <FiTrash2 /> Delete Resolution
                  </button>
                )}
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Resolution`}
                </button>
              </div>
              {!!uploadStatus && <p className={`upload-status-text ${uploadStatus.startsWith('Uploading') ? 'uploading' : ''}`}>{uploadStatus}</p>}
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

export default Resolutions;
