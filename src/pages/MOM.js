import React, { useState, useEffect, useContext, useRef } from 'react';
import { FiClipboard, FiUsers, FiMapPin, FiCalendar, FiFileText, FiEye, FiX, FiEdit2, FiTrash2, FiPlus, FiDownload } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadImages, uploadFiles, downloadDocument } from '../lib/uploads';
import DocumentViewerModal from '../components/DocumentViewerModal';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import ImageCarousel from '../components/ImageCarousel';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import AuthorByline from '../components/AuthorByline';
import AuthorPicker, { EMPTY_AUTHOR } from '../components/AuthorPicker';
import { richTextToPlain } from '../components/richText';
import LoadMore from '../components/LoadMore';
import './MOM.css';

const MOM = () => {
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { meetings, createMeeting, updateMeeting, deleteMeeting } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    location: '',
    attendees: '',
    agenda: '',
    summary: '',
    imageUrls: [],
    fileName: '',
    fileUrl: '',
    ...EMPTY_AUTHOR
  });
  const [authorImageFile, setAuthorImageFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [manualImageUrls, setManualImageUrls] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const docFileInputRef = useRef(null);

  // Admin CRUD handlers
  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', date: '', location: '', attendees: '', agenda: '', summary: '', imageUrls: [], fileName: '', fileUrl: '', ...EMPTY_AUTHOR });
    setSelectedFiles([]);
    setManualImageUrls('');
    setUploadStatus('');
    setSelectedDocFile(null);
    setAuthorImageFile(null);
    setShowAdminModal(true);
  };

  const handleEdit = (meeting) => {
    setEditItem(meeting);
    setFormData({
      title: meeting.title,
      date: meeting.date,
      location: meeting.location || '',
      attendees: meeting.attendees || '',
      agenda: Array.isArray(meeting.agenda) ? meeting.agenda.join('\n') : meeting.agenda || '',
      summary: meeting.summary || '',
      imageUrls: meeting.imageUrls || [],
      fileName: meeting.fileName || '',
      fileUrl: meeting.fileUrl || '',
      authorOfficerId: meeting.authorOfficerId || '',
      authorName: meeting.authorName || '',
      authorPosition: meeting.authorPosition || '',
      authorImage: meeting.authorImage || ''
    });
    setSelectedFiles([]);
    // Saved images are managed by the thumbnail grid below, so this box starts
    // empty and is only for adding new URLs.
    setManualImageUrls('');
    setUploadStatus('');
    setSelectedDocFile(null);
    setAuthorImageFile(null);
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete meeting record?',
      message: 'This meeting record will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteMeeting(id);
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
    setIsUploading(true);

    let uploadedUrls = [];
    if (selectedFiles.length) {
      try {
        uploadedUrls = await uploadImages(selectedFiles, 'meetings', ({ current, total, successCount, failedCount, status }) => {
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
        const [url] = await uploadFiles([selectedDocFile], 'meeting-documents', ({ status, successCount, failedCount }) => {
          if (status === 'uploading') setUploadStatus('Uploading document...');
          if (status === 'done') setUploadStatus(`Document: ${successCount} uploaded, ${failedCount} skipped.`);
        });
        uploadedFileUrl = url || '';
      } catch (error) {
        uploadedFileUrl = '';
      }

      if (!uploadedFileUrl) {
        notify('Failed to upload the document file. Please ensure the file is under 800KB if offline, or check Firebase setup.');
        setIsUploading(false);
        return;
      }
    }

    let uploadedAuthorImage = '';
    if (authorImageFile) {
      try {
        const [url] = await uploadImages([authorImageFile], 'authors', ({ status }) => {
          if (status === 'uploading') setUploadStatus('Uploading author photo...');
        });
        uploadedAuthorImage = url || '';
      } catch (error) {
        uploadedAuthorImage = '';
      }
    }

    const pastedUrls = manualImageUrls
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const processedData = {
      ...formData,
      attendees: Number(formData.attendees) || 0,
      agenda: formData.agenda.split('\n').filter(item => item.trim()),
      imageUrls: [...(formData.imageUrls || []), ...uploadedUrls, ...pastedUrls],
      fileName: selectedDocFile?.name || formData.fileName || '',
      fileUrl: uploadedFileUrl || formData.fileUrl || '',
      authorImage: uploadedAuthorImage || formData.authorImage || ''
    };
    try {
      if (editItem) {
        await updateMeeting(editItem.id, processedData);
      } else {
        await createMeeting(processedData);
      }
      setShowAdminModal(false);
      setEditItem(null);
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase setup/rules and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // View counts state (persisted in localStorage)
  const [viewCounts, setViewCounts] = useState(() => {
    const saved = localStorage.getItem('momViewCounts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('momViewCounts', JSON.stringify(viewCounts));
  }, [viewCounts]);

  const getViewCount = (id) => {
    return viewCounts[`mom-${id}`] || 0;
  };

  const incrementViewCount = (id) => {
    setViewCounts(prev => ({
      ...prev,
      [`mom-${id}`]: (prev[`mom-${id}`] || 0) + 1
    }));
  };

  const openModal = (meeting) => {
    setSelectedMeeting(meeting);
    setModalOpen(true);
    incrementViewCount(meeting.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedMeeting(null);
  };

  const visibleMeetings = isAdmin
    ? meetings.filter((meeting) =>
        matchesQuery(searchTerm, [
          meeting.title,
          meeting.location,
          richTextToPlain(meeting.summary),
          meeting.fileName,
          meeting.authorName,
          meeting.agenda || []
        ])
      )
    : meetings;

  useModalBehaviour(showAdminModal, () => setShowAdminModal(false));

  return (
    <div className="mom-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>Minutes of Meeting</h1>
          <p>Official records of Student Supreme Council meetings, documenting discussions, decisions, and action items.</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Meeting Record
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        <div className="mom-info">
          <FiClipboard className="info-icon" />
          <div>
            <h3>About Minutes of Meeting</h3>
            <p>Minutes of Meeting (M.O.M) serve as the official record of SSC council meetings. They document attendance, discussions, decisions made, and tasks assigned during each meeting.</p>
          </div>
        </div>

        {isAdmin && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, location, agenda, or summary..."
            resultCount={visibleMeetings.length}
            totalCount={meetings.length}
          />
        )}

        {isAdmin && searchTerm && !visibleMeetings.length && (
          <div className="admin-search-empty">
            No meeting records match <strong>"{searchTerm}"</strong>.
          </div>
        )}

        <div className="mom-list">
          {visibleMeetings.map((meeting, index) => (
            <div key={meeting.id} className="mom-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="mom-card-content" onClick={() => openModal(meeting)}>
                <div className="mom-header">
                  <h3>{meeting.title}</h3>
                  <div className="mom-header-right">
                    <span className="mom-views">
                      <FiEye /> {getViewCount(meeting.id)}
                    </span>
                    <span className="mom-date">
                      <FiCalendar />
                      {new Date(meeting.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <AuthorByline item={meeting} size="sm" className="mom-card-byline" />

                <div className="mom-meta">
                  <span className="meta-item">
                    <FiUsers /> {meeting.attendees} Attendees
                  </span>
                  <span className="meta-item">
                    <FiMapPin /> {meeting.location}
                  </span>
                </div>

                <div className="mom-agenda">
                  <h4>Agenda</h4>
                  <ul>
                    {meeting.agenda.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mom-summary">
                  <h4>Summary</h4>
                  <RichContent html={meeting.summary} className="rich-preview" />
                </div>
                {!!meeting.imageUrls?.length && (
                  <div className="mom-image-preview mom-image-grid">
                    {[...new Set(meeting.imageUrls)].slice(0, 3).map((img, imgIndex) => (
                      <img key={`${img}-${imgIndex}`} src={img} alt={meeting.title} />
                    ))}
                  </div>
                )}

                {meeting.fileUrl && (
                  <div className="mom-file-badge" onClick={(e) => e.stopPropagation()}>
                    <FiFileText />
                    <span>{isAdmin && meeting.fileName ? meeting.fileName : 'Attached Document'}</span>
                  </div>
                )}

                <div className="mom-actions">
                  <button className="see-more-btn">
                    <FiFileText /> See More
                  </button>
                  {meeting.fileUrl && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerFile({ url: meeting.fileUrl, name: meeting.fileName, title: meeting.title });
                        }}
                      >
                        <FiEye /> View
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadDocument(meeting.fileUrl, meeting.fileName || 'meeting-document');
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
                  <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(meeting); }}>
                    <FiEdit2 />
                  </button>
                  <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(meeting.id); }}>
                    <FiTrash2 />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* The listener fetches a page at a time, so older records
            need a way to be reached. */}
        <LoadMore collectionKey="meetings" label="minutes" shownCount={visibleMeetings.length} />
      </div>

      {/* Modal */}
      {modalOpen && selectedMeeting && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-tag-row">
                  <span className="modal-meeting-tag">Minutes of Meeting</span>
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount(selectedMeeting.id)} views
                  </span>
                </div>
                <h2 className="blog-article-title">{selectedMeeting.title}</h2>

                <AuthorByline
                  item={selectedMeeting}
                  size="md"
                  className="blog-article-byline"
                  date={new Date(selectedMeeting.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                />

                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {new Date(selectedMeeting.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="blog-meta-item">
                    <FiUsers /> {selectedMeeting.attendees} Attendees
                  </span>
                  {selectedMeeting.location && (
                    <span className="blog-meta-item">
                      <FiMapPin /> {selectedMeeting.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="blog-article-body">
                {!!selectedMeeting.imageUrls?.length && (
                  <ImageCarousel images={selectedMeeting.imageUrls} alt={selectedMeeting.title} />
                )}

                {!!selectedMeeting.agenda?.length && (
                  <div className="modal-section">
                    <h4>Agenda</h4>
                    <ul className="modal-agenda-list">
                      {selectedMeeting.agenda.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="modal-section">
                  <h4>Summary</h4>
                  <RichContent html={selectedMeeting.summary} />
                </div>
              {selectedMeeting.fileUrl && (
                <div className="modal-section">
                  <h4>Attached Document</h4>
                  <div className="modal-file-download">
                    <FiFileText className="file-icon" />
                    <span className="file-name">{isAdmin && selectedMeeting.fileName ? selectedMeeting.fileName : 'Attached Document'}</span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setViewerFile({ url: selectedMeeting.fileUrl, name: selectedMeeting.fileName, title: selectedMeeting.title })}
                    >
                      <FiEye /> View
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => downloadDocument(selectedMeeting.fileUrl, selectedMeeting.fileName || 'meeting-document')}
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
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Meeting Record' : 'Add New Meeting Record'}</h3>
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
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Number of Attendees</label>
                <input
                  type="text"
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Agenda (one item per line)</label>
                <textarea
                  value={formData.agenda}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  rows="4"
                  placeholder="Enter each agenda item on a new line"
                />
              </div>
              <div className="form-group">
                <label>Author</label>
                <AuthorPicker
                  key={editItem?.id || 'new-meeting'}
                  value={formData}
                  onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))}
                  imageFile={authorImageFile}
                  onImageFileChange={setAuthorImageFile}
                />
              </div>
              <div className="form-group">
                <label>Summary</label>
                <RichTextEditor
                  value={formData.summary}
                  onChange={(html) => setFormData({ ...formData, summary: html })}
                  placeholder="Write the meeting summary. Use the toolbar for bold, italics, headings and lists."
                />
              </div>
              <div className="form-group">
                <label>Upload Images (multiple)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
                {!!formData.imageUrls?.length && (
                  <div className="existing-images-grid">
                    {formData.imageUrls.map((url, urlIndex) => (
                      <div key={`${url}-${urlIndex}`} className="existing-image">
                        <img src={url} alt="Meeting" />
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
                  rows="3"
                  placeholder="https://example.com/image1.jpg"
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
                <button type="submit" className="btn-submit" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : `${editItem ? 'Update' : 'Add'} Meeting Record`}
                </button>
              </div>
              {!!uploadStatus && <p className={`upload-status-text ${isUploading ? 'uploading' : ''}`}>{uploadStatus}</p>}
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

export default MOM;
