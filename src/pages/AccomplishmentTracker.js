import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiEye,
  FiX,
  FiExternalLink,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiLink,
  FiImage,
  FiUser
} from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import { uploadImages } from '../lib/uploads';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import { richTextToPlain } from '../components/richText';
import ImageCarousel from '../components/ImageCarousel';
import LoadMore from '../components/LoadMore';
import ContentLoader from '../components/ContentLoader';
import { useLanguage } from '../context/LanguageContext';
import {
  ACCOMPLISHMENT_STATUSES,
  categoryOptions,
  evidenceLabel,
  evidenceUrl,
  groupByMonth,
  staggerDelay,
  statusCounts,
  statusLabel,
  statusSlug
} from '../lib/accomplishments';
import './AccomplishmentTracker.css';

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  status: 'Upcoming',
  date: '',
  linkUrl: '',
  linkLabel: '',
  modifiedBy: '',
  imageUrls: []
};

/* The stored value maps to a translation key; the English label in the lib is
   the fallback for anything saved outside these three. */
const STATUS_KEYS = {
  Upcoming: 'acc.upcoming',
  'In Progress': 'acc.inProgress',
  Completed: 'acc.completed'
};

const AccomplishmentTracker = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const {
    accomplishments,
    createAccomplishment,
    updateAccomplishment,
    deleteAccomplishment,
    getViewCount: getSharedViewCount,
    trackView,
    hasMore,
    isCollectionLoading
  } = useData();
  const isLoadingList = isCollectionLoading('accomplishments');

  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [manualImageUrls, setManualImageUrls] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const label = (status) => (STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : statusLabel(status));

  // Admin CRUD handlers
  const handleAdd = () => {
    setEditItem(null);
    setFormData(EMPTY_FORM);
    setSelectedImageFiles([]);
    setManualImageUrls('');
    setShowAdminModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      status: item.status || 'Upcoming',
      date: item.date || '',
      linkUrl: item.linkUrl || '',
      linkLabel: item.linkLabel || '',
      modifiedBy: item.modifiedBy || '',
      imageUrls: item.imageUrls || []
    });
    setSelectedImageFiles([]);
    setManualImageUrls('');
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete accomplishment?',
      message: 'This accomplishment comes off the site right away. You will have a few seconds to undo it.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteAccomplishment(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checked explicitly rather than left to the title input's `required`
    // attribute: that native validation bubble anchors unreliably on a field
    // inside this modal's fixed, scrolling layout, so a blank title could
    // silently block the submit with no visible message.
    if (!formData.title.trim()) {
      notify('Please give it a title before saving.');
      return;
    }
    if (!richTextToPlain(formData.description).trim()) {
      notify('Please write the description before saving.');
      return;
    }

    setIsSaving(true);

    let uploadedImageUrls = [];
    if (selectedImageFiles.length) {
      try {
        uploadedImageUrls = await uploadImages(
          selectedImageFiles,
          'accomplishments',
          ({ current, total, successCount, failedCount, status }) => {
            if (status === 'uploading') setUploadStatus(`Uploading photo ${current}/${total}...`);
            if (status === 'done') setUploadStatus(`${successCount} uploaded, ${failedCount} skipped.`);
          }
        );
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
      // Stored as typed and made safe at the point of use, so an admin who
      // pastes a bare domain still sees exactly what they pasted when editing.
      imageUrls: [...(formData.imageUrls || []), ...uploadedImageUrls, ...pastedImageUrls]
    };

    try {
      if (editItem) {
        await updateAccomplishment(editItem.id, payload);
      } else {
        await createAccomplishment(payload);
      }
      setShowAdminModal(false);
      setEditItem(null);
      setSelectedImageFiles([]);
      setManualImageUrls('');
      setUploadStatus('');
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase setup/rules and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Shared view counts, held in Firestore. These used to be per-device
  // localStorage numbers, which meant everyone saw a different figure.
  const getViewCount = (id) => getSharedViewCount('accomplishments', id);
  const incrementViewCount = (id) => trackView('accomplishments', id);

  const openModal = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
    incrementViewCount(item.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const getStatusIcon = (status) => {
    switch (statusSlug(status)) {
      case 'completed': return <FiCheckCircle />;
      case 'in-progress': return <FiClock />;
      case 'upcoming': return <FiCalendar />;
      default: return <FiAward />;
    }
  };

  const formatDate = (value, withWeekday = false) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString('en-US', {
      ...(withWeekday ? { weekday: 'long' } : {}),
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const counts = useMemo(() => statusCounts(accomplishments), [accomplishments]);
  const categories = useMemo(() => categoryOptions(accomplishments), [accomplishments]);

  const visible = useMemo(() => {
    let list = accomplishments;
    if (filter !== 'all') list = list.filter((item) => (item.status || 'Upcoming') === filter);
    if (categoryFilter !== 'all') list = list.filter((item) => (item.category || '') === categoryFilter);
    return list;
  }, [accomplishments, filter, categoryFilter]);

  const filteredAccomplishments = useMemo(
    () =>
      isAdmin
        ? visible.filter((item) =>
            matchesQuery(searchTerm, [
              item.title,
              richTextToPlain(item.description),
              item.category,
              item.status,
              label(item.status)
            ])
          )
        : visible,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, isAdmin, searchTerm]
  );

  const months = useMemo(() => groupByMonth(filteredAccomplishments), [filteredAccomplishments]);

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  const filterChips = [
    { key: 'all', text: t('acc.all'), count: counts.all },
    ...ACCOMPLISHMENT_STATUSES.map((entry) => ({
      key: entry.value,
      text: label(entry.value),
      count: counts[entry.value]
    }))
  ];

  const renderCard = (item, index) => {
    const photoCount = (item.imageUrls || []).length;
    const link = evidenceUrl(item.linkUrl);
    return (
      <div
        key={item.id}
        className={`accomplishment-card status-${statusSlug(item.status)}`}
        style={{ animationDelay: staggerDelay(index) }}
      >
        <div className="accomplishment-card-content" onClick={() => openModal(item)}>
          <div className="accomplishment-header">
            <div className="accomplishment-status">
              {getStatusIcon(item.status)}
              <span>{label(item.status)}</span>
            </div>
            <span className="accomplishment-views">
              <FiEye /> {getViewCount(item.id)}
            </span>
          </div>

          <div className="accomplishment-content">
            {!!item.category && <span className="accomplishment-category">{item.category}</span>}
            <h3>{item.title}</h3>
            <RichContent html={item.description} className="rich-preview" />
            <span className="accomplishment-date">
              <FiCalendar />
              {formatDate(item.date)}
            </span>

            {/* Says evidence exists without turning the card into a gallery. */}
            {(photoCount > 0 || !!link) && (
              <div className="accomplishment-evidence">
                {photoCount > 0 && (
                  <span className="evidence-chip">
                    <FiImage /> {photoCount} {t('acc.photoCount')}
                  </span>
                )}
                {!!link && (
                  <span className="evidence-chip">
                    <FiLink /> {t('acc.evidence')}
                  </span>
                )}
              </div>
            )}
          </div>
          <button className="see-more-btn">{t('common.seeMore')}</button>
        </div>
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
    );
  };

  return (
    <div className="accomplishment-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('acc.title')}</h1>
          <p>{t('acc.subtitle')}</p>
          <div className="acc-header-actions">
            {isAdmin && (
              <button className="admin-add-btn" onClick={handleAdd}>
                <FiPlus /> Add Accomplishment
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container section">
        {/* One row, not two. The old page carried a stats block and a filter
            bar that named the same three states, and the stats counted only
            the records already fetched without saying so. */}
        <div className="acc-toolbar">
          <div className="acc-filters" role="group" aria-label="Filter by status">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                /* "All" carries no status class. Routing it through statusSlug('')
                   gave it status-upcoming, which made it and Planned the same
                   thing to the stylesheet. */
                className={`acc-chip${chip.key === 'all' ? '' : ` status-${statusSlug(chip.key)}`}${
                  filter === chip.key ? ' is-active' : ''
                }`}
                onClick={() => setFilter(chip.key)}
                aria-pressed={filter === chip.key}
              >
                {chip.key !== 'all' && getStatusIcon(chip.key)}
                <span>{chip.text}</span>
                {/* A count of 0 before the records arrive would be wrong. */}
                {!isLoadingList && <span className="acc-chip-count">{chip.count}</span>}
              </button>
            ))}
          </div>

          {categories.length > 1 && (
            <select
              className="acc-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">{t('acc.allCategories')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          )}
        </div>

        {hasMore?.accomplishments && (
          <p className="acc-partial-note">{t('acc.partialCounts')}</p>
        )}

        {isAdmin && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, category, status, or description..."
            resultCount={filteredAccomplishments.length}
            totalCount={visible.length}
          />
        )}

        {isAdmin && searchTerm && !filteredAccomplishments.length && (
          <div className="admin-search-empty">
            No accomplishments match <strong>"{searchTerm}"</strong>.
          </div>
        )}

        {isLoadingList && <ContentLoader variant="list" count={3} />}

        {/* Grouped by month, so a term reads as a sequence rather than a pile */}
        <div>
          {months.map((group) => (
            <section className="acc-month" key={group.key || 'undated'}>
              <h2 className="acc-month-heading">
                <span>{group.label}</span>
                <small>{group.items.length}</small>
              </h2>
              <div className="accomplishments-list">
                {group.items.map((item, index) => renderCard(item, index))}
              </div>
            </section>
          ))}
        </div>

        {/* The listener fetches a page at a time, so older records
            need a way to be reached. */}
        <div>
          <LoadMore
            collectionKey="accomplishments"
            label="accomplishments"
            shownCount={filteredAccomplishments.length}
          />
        </div>

      </div>

      {/* Modal */}
      {modalOpen && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-tag-row">
                  {selectedItem.category && <span className="modal-category-tag">{selectedItem.category}</span>}
                  <div className={`modal-status status-${statusSlug(selectedItem.status)}`}>
                    {getStatusIcon(selectedItem.status)}
                    <span>{label(selectedItem.status)}</span>
                  </div>
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount(selectedItem.id)} views
                  </span>
                </div>
                <h2 className="blog-article-title">{selectedItem.title}</h2>
                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {formatDate(selectedItem.date, true)}
                  </span>
                  {!!selectedItem.modifiedBy && (
                    <span className="blog-meta-item">
                      <FiUser />
                      Last modified by {selectedItem.modifiedBy}
                    </span>
                  )}
                </div>
              </div>

              {!!(selectedItem.imageUrls || []).length && (
                <ImageCarousel images={selectedItem.imageUrls} alt={selectedItem.title} />
              )}

              <div className="blog-article-body">
                <RichContent html={selectedItem.description} />

                {/* The evidence for this accomplishment, not a link to the
                    council's feed. Shown only when one was actually given. */}
                {!!evidenceUrl(selectedItem.linkUrl) && (
                  <a
                    href={evidenceUrl(selectedItem.linkUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="acc-evidence-btn"
                  >
                    <FiLink /> {evidenceLabel(selectedItem.linkUrl, selectedItem.linkLabel)}
                    <FiExternalLink />
                  </a>
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
              <h3>{editItem ? 'Edit Accomplishment' : 'Add New Accomplishment'}</h3>
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
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <small className="form-hint">
                  A fixed list keeps the chips grouping. Anything typed before this list existed
                  still appears here.
                </small>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {ACCOMPLISHMENT_STATUSES.map((entry) => (
                    <option key={entry.value} value={entry.value}>{label(entry.value)}</option>
                  ))}
                </select>
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
                <label>Description</label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Describe this accomplishment. Use the toolbar for bold, italics, headings and lists."
                  minHeight={220}
                />
              </div>

              <div className="form-group">
                <label>Evidence link</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="Link to the post, photo album or document for this one"
                />
                <small className="form-hint">
                  Point at this accomplishment specifically. A link to the page feed proves
                  nothing to a student reading it later.
                </small>
              </div>
              <div className="form-group">
                <label>Link wording (optional)</label>
                <input
                  type="text"
                  value={formData.linkLabel}
                  onChange={(e) => setFormData({ ...formData, linkLabel: e.target.value })}
                  placeholder="See the turnover photos"
                />
              </div>
              <div className="form-group">
                <label>Last modified by</label>
                <input
                  type="text"
                  value={formData.modifiedBy}
                  onChange={(e) => setFormData({ ...formData, modifiedBy: e.target.value })}
                  placeholder="Your name"
                />
                <small className="form-hint">
                  Shown on the record so readers know who last touched it.
                </small>
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
                  <small>{selectedImageFiles.length} new photo(s) ready to upload.</small>
                )}
                {!!uploadStatus && <small>{uploadStatus}</small>}
                {!!formData.imageUrls?.length && (
                  <div className="existing-images-grid">
                    {formData.imageUrls.map((url, urlIndex) => (
                      <div key={`${url}-${urlIndex}`} className="existing-image">
                        <img src={url} alt="Accomplishment" />
                        <button
                          type="button"
                          title="Remove this photo"
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
                <label>Or paste photo URLs (one per line)</label>
                <textarea
                  value={manualImageUrls}
                  onChange={(e) => setManualImageUrls(e.target.value)}
                  rows="2"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Accomplishment`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccomplishmentTracker;
