import React, { useState, useContext , useRef } from 'react';
import { FiAward, FiCheckCircle, FiClock, FiCalendar, FiFilter, FiEye, FiX, FiExternalLink, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { FaFacebookF } from 'react-icons/fa';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import AdminSearchBar, { matchesQuery } from '../components/AdminSearchBar';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import { richTextToPlain } from '../components/richText';
import LoadMore from '../components/LoadMore';
import { useLanguage } from '../context/LanguageContext';
import './AccomplishmentTracker.css';

const AccomplishmentTracker = () => {
  const { t } = useLanguage();
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { accomplishments, createAccomplishment, updateAccomplishment, deleteAccomplishment, getViewCount: getSharedViewCount, trackView} = useData();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'Upcoming',
    date: ''
  });

  // Admin CRUD handlers
  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', description: '', category: '', status: 'Upcoming', date: '' });
    setShowAdminModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category || '',
      status: item.status,
      date: item.date || ''
    });
    setShowAdminModal(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete accomplishment?',
      message: 'This accomplishment will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteAccomplishment(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!richTextToPlain(formData.description).trim()) {
      notify('Please write the description before saving.');
      return;
    }
    try {
      if (editItem) {
        await updateAccomplishment(editItem.id, formData);
      } else {
        await createAccomplishment(formData);
      }
      setShowAdminModal(false);
      setEditItem(null);
    } catch (error) {
      console.error(error);
      notify('Saving failed: ' + error.message + '\n\nPlease check Firebase setup/rules and try again.');
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

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'in progress': return 'status-progress';
      case 'upcoming': return 'status-upcoming';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return <FiCheckCircle />;
      case 'in progress': return <FiClock />;
      case 'upcoming': return <FiCalendar />;
      default: return <FiAward />;
    }
  };

  const statusFilteredAccomplishments = filter === 'all'
    ? accomplishments
    : accomplishments.filter(a => a.status.toLowerCase().replace(' ', '-') === filter);

  const filteredAccomplishments = isAdmin
    ? statusFilteredAccomplishments.filter((item) =>
        matchesQuery(searchTerm, [item.title, richTextToPlain(item.description), item.category, item.status])
      )
    : statusFilteredAccomplishments;

  const stats = {
    completed: accomplishments.filter(a => a.status === 'Completed').length,
    inProgress: accomplishments.filter(a => a.status === 'In Progress').length,
    upcoming: accomplishments.filter(a => a.status === 'Upcoming').length
  };

  // Handed to useModalBehaviour so Tab stays inside the dialog.
  const adminModalRef = useRef(null);
  useModalBehaviour(showAdminModal, () => setShowAdminModal(false), adminModalRef);

  return (
    <div className="accomplishment-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('acc.title')}</h1>
          <p>{t('acc.subtitle')}</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Accomplishment
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card completed">
            <FiCheckCircle className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
          <div className="stat-card progress">
            <FiClock className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>
          <div className="stat-card upcoming">
            <FiCalendar className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">{stats.upcoming}</span>
              <span className="stat-label">Upcoming</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <FiFilter className="filter-icon" />
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setFilter('in-progress')}
          >
            In Progress
          </button>
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
        </div>

        {isAdmin && (
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, category, status, or description..."
            resultCount={filteredAccomplishments.length}
            totalCount={statusFilteredAccomplishments.length}
          />
        )}

        {isAdmin && searchTerm && !filteredAccomplishments.length && (
          <div className="admin-search-empty">
            No accomplishments match <strong>"{searchTerm}"</strong>.
          </div>
        )}

        {/* Accomplishments List */}
        <div className="accomplishments-list">
          {filteredAccomplishments.map((item, index) => (
            <div 
              key={item.id} 
              className={`accomplishment-card ${getStatusClass(item.status)}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="accomplishment-card-content" onClick={() => openModal(item)}>
                <div className="accomplishment-header">
                  <div className="accomplishment-status">
                    {getStatusIcon(item.status)}
                    <span>{item.status}</span>
                  </div>
                  <span className="accomplishment-views">
                    <FiEye /> {getViewCount(item.id)}
                  </span>
                </div>
                
                <div className="accomplishment-content">
                  <span className="accomplishment-category">{item.category}</span>
                  <h3>{item.title}</h3>
                  <RichContent html={item.description} className="rich-preview" />
                  <span className="accomplishment-date">
                    <FiCalendar />
                    {new Date(item.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
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
          ))}
        </div>

        {/* The listener fetches a page at a time, so older records
            need a way to be reached. */}
        <LoadMore collectionKey="accomplishments" label="accomplishments" shownCount={filteredAccomplishments.length} />
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
                  <div className={`modal-status ${getStatusClass(selectedItem.status)}`}>
                    {getStatusIcon(selectedItem.status)}
                    <span>{selectedItem.status}</span>
                  </div>
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount(selectedItem.id)} views
                  </span>
                </div>
                <h2 className="blog-article-title">{selectedItem.title}</h2>
                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {new Date(selectedItem.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="blog-article-body">
                <RichContent html={selectedItem.description} />
              {selectedItem.status === 'Completed' && (
                <a 
                  href="https://www.facebook.com/PSUurdanetaSSC" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="facebook-post-btn"
                >
                  <FaFacebookF /> {t('acc.viewPost')} <FiExternalLink />
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
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Event, Initiative, Project"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
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
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editItem ? 'Update' : 'Add'} Accomplishment
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
