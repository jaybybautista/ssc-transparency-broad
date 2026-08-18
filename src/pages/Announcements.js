import React, { useState, useContext , useRef } from 'react';
import { FiFilter, FiBell, FiAward, FiCreditCard, FiAlertCircle, FiInfo, FiSearch, FiEdit2, FiTrash2, FiPlus, FiX, FiCalendar } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import { uploadImages } from '../lib/uploads';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import RichContent from '../components/RichContent';
import ImageCarousel from '../components/ImageCarousel';
import RichTextEditor from '../components/RichTextEditor';
import { richTextToPlain } from '../components/richText';
import { AlertSubscribeButton } from '../components/AlertSubscribe';
import LoadMore from '../components/LoadMore';
import { useLanguage } from '../context/LanguageContext';
import './Announcements.css';

const Announcements = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    isLoading
  } = useData();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [readItem, setReadItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Admin Announcements',
    isPinned: false,
    imageUrls: []
  });
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [manualImageUrls, setManualImageUrls] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', content: '', category: 'Admin Announcements', isPinned: false, imageUrls: [] });
    setSelectedImageFiles([]);
    setManualImageUrls('');
    setUploadStatus('');
    setShowModal(true);
  };

  const handleEdit = (announcement) => {
    setEditItem(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      isPinned: announcement.isPinned,
      imageUrls: announcement.imageUrls || []
    });
    setSelectedImageFiles([]);
    // Saved images are managed by the thumbnail grid below.
    setManualImageUrls('');
    setUploadStatus('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete announcement?',
      message: 'This announcement will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteAnnouncement(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!richTextToPlain(formData.content).trim()) {
      notify('Please write the announcement content before saving.');
      return;
    }

    setIsSaving(true);

    let uploadedImageUrls = [];
    if (selectedImageFiles.length) {
      try {
        uploadedImageUrls = await uploadImages(selectedImageFiles, 'announcements', ({ current, total, successCount, failedCount, status }) => {
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

    const payload = {
      ...formData,
      imageUrls: [...(formData.imageUrls || []), ...uploadedImageUrls, ...pastedImageUrls]
    };

    try {
      if (editItem) {
        await updateAnnouncement(editItem.id, payload);
      } else {
        await createAnnouncement({
          ...payload,
          date: new Date().toISOString().split('T')[0]
        });
      }
      setShowModal(false);
      setEditItem(null);
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase setup/rules and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { name: 'All', icon: FiFilter },
    { name: 'Admin Announcements', icon: FiBell },
    { name: 'Vacancies for Scholarships', icon: FiAward },
    { name: 'ID/UNIFORM', icon: FiCreditCard },
    { name: 'Leniencies', icon: FiAlertCircle },
    { name: 'Advisory', icon: FiInfo }
  ];

  const categoryIcons = {
    'Admin Announcements': FiBell,
    'Vacancies for Scholarships': FiAward,
    'ID/UNIFORM': FiCreditCard,
    'Leniencies': FiAlertCircle,
    'Advisory': FiInfo
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesFilter = activeFilter === 'All' || announcement.category === activeFilter;
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         richTextToPlain(announcement.content).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showModal, () => setShowModal(false), adminModalRef);

  return (
    <div className="announcements-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('ann.title')}</h1>
          <p>{t('ann.subtitle')}</p>
          <div className="page-header-actions">
            {!isAdmin && <AlertSubscribeButton label="Notify me" />}
            {isAdmin && (
              <button className="admin-add-btn" onClick={handleAdd}>
                <FiPlus /> Add Announcement
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container section">
        {/* Search and Filter */}
        <div className="filter-section">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder={t('ann.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-tabs">
            {categories.map((category) => (
              <button
                key={category.name}
                className={`filter-tab ${activeFilter === category.name ? 'active' : ''}`}
                onClick={() => setActiveFilter(category.name)}
              >
                <category.icon />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="results-info">
          <span>{isLoading ? 'Loading announcements...' : `Showing ${filteredAnnouncements.length} announcement${filteredAnnouncements.length !== 1 ? 's' : ''}`}</span>
          {activeFilter !== 'All' && (
            <button className="clear-filter" onClick={() => setActiveFilter('All')}>
              {t('common.clearFilter')}
            </button>
          )}
        </div>

        {/* Pinned Announcements */}
        {pinnedAnnouncements.length > 0 && (
          <div className="announcements-section">
            <h2 className="section-label">📌 Pinned</h2>
            <div className="announcements-list">
              {pinnedAnnouncements.map((announcement) => {
                const IconComponent = categoryIcons[announcement.category] || FiBell;
                return (
                  <div key={announcement.id} className="announcement-item pinned">
                    <div className="announcement-icon">
                      <IconComponent />
                    </div>
                    <div className="announcement-body">
                      <div className="announcement-header">
                        <span className="announcement-category">{announcement.category}</span>
                        <span className="announcement-date">
                          {new Date(announcement.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <h3 className="announcement-title">{announcement.title}</h3>
                      <RichContent html={announcement.content} className="rich-preview announcement-content" />
                      {!!announcement.imageUrls?.length && (
                        <div className="announcement-image-preview">
                          {[...new Set(announcement.imageUrls)].slice(0, 3).map((img, imgIndex) => (
                            <img key={`${img}-${imgIndex}`} src={img} alt={announcement.title} />
                          ))}
                          {announcement.imageUrls.length > 3 && (
                            <span className="announcement-image-more">+{announcement.imageUrls.length - 3}</span>
                          )}
                        </div>
                      )}
                      <button type="button" className="announcement-read-more" onClick={() => setReadItem(announcement)}>
                        {t('common.readMore')}
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="admin-actions">
                        <button className="admin-edit-btn" onClick={() => handleEdit(announcement)}>
                          <FiEdit2 />
                        </button>
                        <button className="admin-delete-btn" onClick={() => handleDelete(announcement.id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Announcements */}
        <div className="announcements-section">
          {pinnedAnnouncements.length > 0 && <h2 className="section-label">{t('ann.recent')}</h2>}
          {regularAnnouncements.length > 0 ? (
            <div className="announcements-list">
              {regularAnnouncements.map((announcement) => {
                const IconComponent = categoryIcons[announcement.category] || FiBell;
                return (
                  <div key={announcement.id} className="announcement-item">
                    <div className="announcement-icon">
                      <IconComponent />
                    </div>
                    <div className="announcement-body">
                      <div className="announcement-header">
                        <span className="announcement-category">{announcement.category}</span>
                        <span className="announcement-date">
                          {new Date(announcement.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <h3 className="announcement-title">{announcement.title}</h3>
                      <RichContent html={announcement.content} className="rich-preview announcement-content" />
                      {!!announcement.imageUrls?.length && (
                        <div className="announcement-image-preview">
                          {[...new Set(announcement.imageUrls)].slice(0, 3).map((img, imgIndex) => (
                            <img key={`${img}-${imgIndex}`} src={img} alt={announcement.title} />
                          ))}
                          {announcement.imageUrls.length > 3 && (
                            <span className="announcement-image-more">+{announcement.imageUrls.length - 3}</span>
                          )}
                        </div>
                      )}
                      <button type="button" className="announcement-read-more" onClick={() => setReadItem(announcement)}>
                        {t('common.readMore')}
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="admin-actions">
                        <button className="admin-edit-btn" onClick={() => handleEdit(announcement)}>
                          <FiEdit2 />
                        </button>
                        <button className="admin-delete-btn" onClick={() => handleDelete(announcement.id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-results">
              <p>{t('ann.none')}</p>
            </div>
          )}

          {/* The listener fetches a page at a time, so older posts need a way
              to be reached. */}
          <LoadMore
            collectionKey="announcements"
            label="announcements"
            shownCount={announcements.length}
          />
        </div>
      </div>

      {/* Reading Modal */}
      {readItem && (
        <div className="modal-overlay" onClick={() => setReadItem(null)}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setReadItem(null)}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-tag-row">
                  <span className="modal-category-tag">{readItem.category}</span>
                  {readItem.isPinned && <span className="modal-category-tag">📌 Pinned</span>}
                </div>
                <h2 className="blog-article-title">{readItem.title}</h2>
                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {new Date(readItem.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="blog-article-body">
                {!!readItem.imageUrls?.length && (
                  <ImageCarousel images={readItem.imageUrls} alt={readItem.title} />
                )}
                <RichContent html={readItem.content} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" ref={adminModalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem ? 'Edit Announcement' : 'Add New Announcement'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>
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
                <label>Content</label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                  placeholder="Write the announcement. Use the toolbar for bold, italics, headings and lists."
                  minHeight={220}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Admin Announcements">Admin Announcements</option>
                  <option value="Vacancies for Scholarships">Vacancies for Scholarships</option>
                  <option value="ID/UNIFORM">ID/UNIFORM</option>
                  <option value="Leniencies">Leniencies</option>
                  <option value="Advisory">Advisory</option>
                </select>
              </div>
              <div className="form-group">
                <label>Photos (you can select multiple)</label>
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
                        <img src={url} alt="Announcement" />
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
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  />
                  Pin this announcement
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Announcement`}
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

export default Announcements;
