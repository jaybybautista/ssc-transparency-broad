import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiGrid,
  FiBell,
  FiCalendar,
  FiFileText,
  FiUsers,
  FiClipboard,
  FiAward,
  FiMail,
  FiLogOut,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiSearch,
  FiSave,
  FiX,
  FiBook,
  FiDownload,
  FiCheckSquare,
  FiBookOpen,
  FiMenu,
  FiInbox,
  FiMessageSquare,
  FiSend
} from 'react-icons/fi';
import { AuthContext } from '../../App';
import { useData } from '../../context/DataContext';
import { uploadFiles, uploadImages } from '../../lib/uploads';
import RichTextEditor from '../../components/RichTextEditor';
import { richTextToPlain } from '../../components/richText';
import { useDialog } from '../../components/DialogProvider';
import useModalBehaviour from '../../components/useModalBehaviour';
import Officers from '../Officers';
import MOM from '../MOM';
import NarrativeReports from '../NarrativeReports';
import MemorandumOrders from '../MemorandumOrders';
import AccomplishmentTracker from '../AccomplishmentTracker';
import RequestLetters from '../RequestLetters';
import ConstitutionByLaws from '../ConstitutionByLaws';
import ResolutionVoters from './ResolutionVoters';
import StudentSubmissions from './StudentSubmissions';
import AlertSubscribers from './AlertSubscribers';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import sscLogo from '../../assets/ssc_logo.svg';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { setIsAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const {
    announcements,
    events,
    resolutions,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    createEvent,
    updateEvent,
    deleteEvent,
    createResolution,
    updateResolution,
    deleteResolution
  } = useData();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementCategoryFilter, setAnnouncementCategoryFilter] = useState('all');
  const [eventStatusFilter, setEventStatusFilter] = useState('all');
  const [resDocFile, setResDocFile] = useState(null);
  const [resDocUploading, setResDocUploading] = useState(false);
  const [resDocStatus, setResDocStatus] = useState('');
  const [viewerFile, setViewerFile] = useState(null);
  const [modalRichText, setModalRichText] = useState('');
  const [eventImageFiles, setEventImageFiles] = useState([]);
  const [eventImageUrls, setEventImageUrls] = useState([]);
  const [eventUploadStatus, setEventUploadStatus] = useState('');
  const resDocInputRef = useRef(null);

  useEffect(() => {
    const isAuth = localStorage.getItem('ssc_admin_auth');
    if (!isAuth) {
      navigate('/admin');
    } else {
      setIsAdmin(true);
    }
  }, [navigate, setIsAdmin]);

  useModalBehaviour(sidebarOpen, () => setSidebarOpen(false));

  useEffect(() => {
    setSearchTerm('');
    setAnnouncementCategoryFilter('all');
    setEventStatusFilter('all');
  }, [activeSection]);

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('ssc_admin_auth');
    navigate('/admin');
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditItem(item);
    setResDocFile(null);
    setResDocStatus('');
    setModalRichText(type === 'announcement' ? item?.content || '' : item?.description || '');
    setEventImageFiles([]);
    setEventImageUrls(item?.imageUrls || []);
    setEventUploadStatus('');
    if (resDocInputRef.current) resDocInputRef.current.value = '';
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setModalType('');
    setResDocFile(null);
    setResDocStatus('');
  };

  const handleModalSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      if (modalType === 'announcement') {
        if (!richTextToPlain(modalRichText).trim()) {
          notify('Please write the announcement content before saving.');
          return;
        }
        let uploadedUrls = [];
        if (eventImageFiles.length) {
          try {
            uploadedUrls = await uploadImages(eventImageFiles, 'announcements', ({ current, total, successCount, failedCount, status }) => {
              if (status === 'uploading') setEventUploadStatus(`Uploading image ${current}/${total}...`);
              if (status === 'done') setEventUploadStatus(`${successCount} uploaded, ${failedCount} skipped.`);
            });
          } catch (err) {
            uploadedUrls = [];
          }
        }

        const payload = {
          title: formData.get('title'),
          category: formData.get('category'),
          content: modalRichText,
          date: editItem?.date || new Date().toISOString().split('T')[0],
          isPinned: Boolean(editItem?.isPinned),
          imageUrls: [...eventImageUrls, ...uploadedUrls]
        };
        if (editItem) {
          await updateAnnouncement(editItem.id, payload);
        } else {
          await createAnnouncement(payload);
        }
      }

      if (modalType === 'event') {
        let uploadedUrls = [];
        if (eventImageFiles.length) {
          try {
            uploadedUrls = await uploadImages(eventImageFiles, 'events', ({ current, total, successCount, failedCount, status }) => {
              if (status === 'uploading') setEventUploadStatus(`Uploading image ${current}/${total}...`);
              if (status === 'done') setEventUploadStatus(`${successCount} uploaded, ${failedCount} skipped.`);
            });
          } catch (err) {
            uploadedUrls = [];
          }
        }

        const payload = {
          title: formData.get('title'),
          date: formData.get('date'),
          time: formData.get('time'),
          location: formData.get('location'),
          status: formData.get('status'),
          description: modalRichText,
          imageUrls: [...eventImageUrls, ...uploadedUrls]
        };
        if (editItem) {
          await updateEvent(editItem.id, payload);
        } else {
          await createEvent(payload);
        }
      }

      if (modalType === 'resolution') {
        let uploadedFileUrl = editItem?.fileUrl || '';
        let uploadedFileName = editItem?.fileName || '';

        if (resDocFile) {
          setResDocUploading(true);
          try {
            const [url] = await uploadFiles([resDocFile], 'resolution-documents', ({ status, successCount, failedCount }) => {
              if (status === 'uploading') setResDocStatus('Uploading document...');
              if (status === 'done') setResDocStatus(`${successCount} uploaded, ${failedCount} skipped.`);
            });
            uploadedFileUrl = url || '';
            uploadedFileName = resDocFile.name;
          } catch (err) {
            uploadedFileUrl = '';
          } finally {
            setResDocUploading(false);
          }

          if (!uploadedFileUrl) {
            notify('Failed to upload the document. Please ensure it is under 800KB if offline, or check Firebase setup.');
            return;
          }
        }

        const payload = {
          number: formData.get('number'),
          title: formData.get('title'),
          date: formData.get('date'),
          status: formData.get('status'),
          description: formData.get('description'),
          votesFor: editItem?.votesFor || 0,
          votesAgainst: editItem?.votesAgainst || 0,
          abstain: editItem?.abstain || 0,
          imageUrls: editItem?.imageUrls || [],
          fileName: uploadedFileName,
          fileUrl: uploadedFileUrl
        };
        if (editItem) {
          await updateResolution(editItem.id, payload);
        } else {
          await createResolution(payload);
        }
      }
      closeModal();
    } catch (error) {
      notify('Save failed. Please verify Firebase settings/rules and try again.');
    }
  };

  const handleDelete = async (type, id) => {
    const label = { announcement: 'announcement', event: 'event', resolution: 'resolution' }[type] || 'item';
    const shouldDelete = await confirm({
      title: `Delete ${label}?`,
      message: `This ${label} will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;

    switch (type) {
      case 'announcement':
        deleteAnnouncement(id);
        break;
      case 'event':
        deleteEvent(id);
        break;
      case 'resolution':
        deleteResolution(id);
        break;
      default:
        break;
    }
  };

  const stats = [
    { label: 'Total Announcements', value: announcements.length, icon: FiBell, color: 'blue' },
    { label: 'Upcoming Events', value: events.length, icon: FiCalendar, color: 'green' },
    { label: 'Resolutions', value: resolutions.length, icon: FiFileText, color: 'purple' },
    { label: 'Pending Requests', value: 5, icon: FiMail, color: 'orange' }
  ];

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
    { id: 'announcements', label: 'Announcements', icon: FiBell },
    { id: 'events', label: 'Calendar Events', icon: FiCalendar },
    { id: 'resolutions', label: 'Resolutions', icon: FiFileText },
    { id: 'resolution-votes', label: 'Resolution Votes', icon: FiCheckSquare },
    { id: 'constitution', label: 'Constitution & By-Laws', icon: FiBookOpen },
    { id: 'officers', label: 'Officers', icon: FiUsers },
    { id: 'mom', label: 'Minutes of Meeting', icon: FiClipboard },
    { id: 'narrative-reports', label: 'Narrative Reports', icon: FiBook },
    { id: 'memorandums', label: 'Memorandum Orders', icon: FiFileText },
    { id: 'accomplishments', label: 'Accomplishments', icon: FiAward },
    { id: 'requests', label: 'Request Letters', icon: FiMail },
    { id: 'tickets', label: 'Student Tickets', icon: FiInbox },
    { id: 'suggestions', label: 'Suggestion Box', icon: FiMessageSquare },
    { id: 'subscribers', label: 'Alert Subscribers', icon: FiSend }
  ];

  const renderDashboard = () => (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h2>Welcome back, Admin!</h2>
        <p>Here's what's happening with PSU-UCC SSC Virtual Board</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">
              <stat.icon />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="section-card">
          <div className="section-header">
            <h3>Recent Announcements</h3>
            <button className="btn-text" onClick={() => setActiveSection('announcements')}>
              View All
            </button>
          </div>
          <div className="section-list">
            {announcements.slice(0, 3).map(announcement => (
              <div key={announcement.id} className="list-item">
                <div className="item-info">
                  <h4>{announcement.title}</h4>
                  <span className="item-date">{announcement.date}</span>
                </div>
                <span className={`badge badge-${announcement.category.toLowerCase()}`}>
                  {announcement.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h3>Upcoming Events</h3>
            <button className="btn-text" onClick={() => setActiveSection('events')}>
              View All
            </button>
          </div>
          <div className="section-list">
            {events.slice(0, 3).map(event => (
              <div key={event.id} className="list-item">
                <div className="item-info">
                  <h4>{event.title}</h4>
                  <span className="item-date">{event.date}</span>
                </div>
                <span className={`status-dot status-${event.status.toLowerCase()}`}></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => openModal('announcement')}>
            <FiBell />
            <span>New Announcement</span>
          </button>
          <button className="action-btn" onClick={() => openModal('event')}>
            <FiCalendar />
            <span>Add Event</span>
          </button>
          <button className="action-btn" onClick={() => openModal('resolution')}>
            <FiFileText />
            <span>New Resolution</span>
          </button>
          <button className="action-btn" onClick={() => setActiveSection('requests')}>
            <FiMail />
            <span>View Requests</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnnouncementsManager = () => (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Manage Announcements</h2>
        <button className="btn-primary" onClick={() => openModal('announcement')}>
          <FiPlus /> Add Announcement
        </button>
      </div>

      <div className="manager-toolbar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-dropdown">
          <select className="filter-btn" value={announcementCategoryFilter} onChange={(e) => setAnnouncementCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {[...new Set(announcements.map((item) => item.category))].map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements
              .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .filter(a => announcementCategoryFilter === 'all' || a.category === announcementCategoryFilter)
              .map(announcement => (
                <tr key={announcement.id}>
                  <td>
                    <div className="table-title">{announcement.title}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${announcement.category.toLowerCase()}`}>
                      {announcement.category}
                    </span>
                  </td>
                  <td>{announcement.date}</td>
                  <td>
                    <span className="status-badge status-published">Published</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-icon view" title="View" onClick={() => openModal('announcement', announcement)}>
                        <FiEye />
                      </button>
                      <button className="action-icon edit" title="Edit" onClick={() => openModal('announcement', announcement)}>
                        <FiEdit2 />
                      </button>
                      <button className="action-icon delete" title="Delete" onClick={() => handleDelete('announcement', announcement.id)}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEventsManager = () => (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Manage Calendar Events</h2>
        <button className="btn-primary" onClick={() => openModal('event')}>
          <FiPlus /> Add Event
        </button>
      </div>

      <div className="manager-toolbar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="status-filters">
          <button className={`status-filter ${eventStatusFilter === 'all' ? 'active' : ''}`} onClick={() => setEventStatusFilter('all')}>All</button>
          <button className={`status-filter planned ${eventStatusFilter === 'planned' ? 'active' : ''}`} onClick={() => setEventStatusFilter('planned')}>Planned</button>
          <button className={`status-filter pending ${eventStatusFilter === 'pending' ? 'active' : ''}`} onClick={() => setEventStatusFilter('pending')}>Pending</button>
          <button className={`status-filter approved ${eventStatusFilter === 'approved' ? 'active' : ''}`} onClick={() => setEventStatusFilter('approved')}>Approved</button>
        </div>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events
              .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .filter(e => eventStatusFilter === 'all' || String(e.status).toLowerCase() === eventStatusFilter)
              .map(event => (
                <tr key={event.id}>
                  <td>
                    <div className="table-title">{event.title}</div>
                  </td>
                  <td>{event.date}</td>
                  <td>{event.time}</td>
                  <td>{event.location}</td>
                  <td>
                    <span className={`status-badge status-${event.status.toLowerCase()}`}>
                      {event.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-icon view" title="View" onClick={() => openModal('event', event)}>
                        <FiEye />
                      </button>
                      <button className="action-icon edit" title="Edit" onClick={() => openModal('event', event)}>
                        <FiEdit2 />
                      </button>
                      <button className="action-icon delete" title="Delete" onClick={() => handleDelete('event', event.id)}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderResolutionsManager = () => {
    const filteredResolutions = resolutions.filter((resolution) =>
      [resolution.number, resolution.title, resolution.description, resolution.status]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
    <div className="manager-content">
      <div className="manager-header">
        <h2>Manage Resolutions</h2>
        <button className="btn-primary" onClick={() => openModal('resolution')}>
          <FiPlus /> Add Resolution
        </button>
      </div>

      <div className="manager-toolbar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search resolutions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Resolution No.</th>
              <th>Title</th>
              <th>Date</th>
              <th>Result</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResolutions.map(resolution => (
              <tr key={resolution.id}>
                <td><strong>{resolution.number}</strong></td>
                <td>
                  <div className="table-title">{resolution.title}</div>
                </td>
                <td>{resolution.date}</td>
                <td>
                  <span className={`status-badge status-${resolution.status.toLowerCase()}`}>
                    {resolution.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-icon view"
                      title="View Document"
                      onClick={() =>
                        resolution.fileUrl
                          ? setViewerFile({ url: resolution.fileUrl, name: resolution.fileName, title: resolution.title })
                          : openModal('resolution', resolution)
                      }
                    >
                      <FiEye />
                    </button>
                    <button className="action-icon edit" title="Edit" onClick={() => openModal('resolution', resolution)}>
                      <FiEdit2 />
                    </button>
                    <button className="action-icon delete" title="Delete" onClick={() => handleDelete('resolution', resolution.id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'announcements':
        return renderAnnouncementsManager();
      case 'events':
        return renderEventsManager();
      case 'resolutions':
        return renderResolutionsManager();
      case 'resolution-votes':
        return <ResolutionVoters />;
      case 'constitution':
        return <ConstitutionByLaws />;
      case 'officers':
        return <Officers />;
      case 'mom':
        return <MOM />;
      case 'narrative-reports':
        return <NarrativeReports />;
      case 'memorandums':
        return <MemorandumOrders />;
      case 'accomplishments':
        return <AccomplishmentTracker />;
      case 'requests':
        return <RequestLetters />;
      case 'tickets':
        return <StudentSubmissions mode="tickets" />;
      case 'suggestions':
        return <StudentSubmissions mode="suggestions" />;
      case 'subscribers':
        return <AlertSubscribers />;
      default:
        return renderDashboard();
    }
  };

  const AnnouncementModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content admin-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editItem ? 'Edit Announcement' : 'New Announcement'}</h3>
          <button className="close-btn" onClick={closeModal}>
            <FiX />
          </button>
        </div>
        <form className="modal-form" onSubmit={handleModalSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              name="title"
              className="form-input"
              defaultValue={editItem?.title || ''}
              placeholder="Enter announcement title"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select name="category" className="form-select" defaultValue={editItem?.category || ''}>
              <option value="">Select category</option>
              <option value="General">General</option>
              <option value="Academic">Academic</option>
              <option value="Event">Event</option>
              <option value="Important">Important</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <RichTextEditor
              value={modalRichText}
              onChange={setModalRichText}
              placeholder="Write the announcement. Use the toolbar for bold, italics, headings and lists."
              minHeight={220}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Photos (you can select multiple)</label>
            <input
              type="file"
              className="form-input"
              accept="image/*"
              multiple
              onChange={(e) => setEventImageFiles(Array.from(e.target.files || []))}
            />
            {!!eventImageFiles.length && <small>{eventImageFiles.length} new image(s) ready to upload.</small>}
            {!!eventImageUrls.length && (
              <div className="existing-images-grid">
                {eventImageUrls.map((url, urlIndex) => (
                  <div key={`${url}-${urlIndex}`} className="existing-image">
                    <img src={url} alt="Announcement" />
                    <button
                      type="button"
                      title="Remove this image"
                      onClick={() => setEventImageUrls((prev) => prev.filter((item) => item !== url))}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!!eventUploadStatus && <p className="upload-status-text">{eventUploadStatus}</p>}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <FiSave /> {editItem ? 'Update' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const EventModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content admin-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editItem ? 'Edit Event' : 'New Event'}</h3>
          <button className="close-btn" onClick={closeModal}>
            <FiX />
          </button>
        </div>
        <form className="modal-form" onSubmit={handleModalSubmit}>
          <div className="form-group">
            <label className="form-label">Event Title</label>
            <input
              type="text"
              name="title"
              className="form-input"
              defaultValue={editItem?.title || ''}
              placeholder="Enter event title"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                className="form-input"
                defaultValue={editItem?.date || ''}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="text"
                name="time"
                className="form-input"
                defaultValue={editItem?.time || ''}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-input"
              defaultValue={editItem?.location || ''}
              placeholder="Enter location"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="status" className="form-select" defaultValue={editItem?.status || ''}>
              <option value="">Select status</option>
              <option value="planned">Planned (Blue)</option>
              <option value="pending">Pending (Yellow)</option>
              <option value="approved">Approved (Green)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <RichTextEditor
              value={modalRichText}
              onChange={setModalRichText}
              placeholder="Describe the event. Use the toolbar for bold, italics, headings and lists."
              minHeight={180}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Event Photos (you can select multiple)</label>
            <input
              type="file"
              className="form-input"
              accept="image/*"
              multiple
              onChange={(e) => setEventImageFiles(Array.from(e.target.files || []))}
            />
            {!!eventImageFiles.length && <small>{eventImageFiles.length} new image(s) ready to upload.</small>}
            {!!eventImageUrls.length && (
              <div className="existing-images-grid">
                {eventImageUrls.map((url, urlIndex) => (
                  <div key={`${url}-${urlIndex}`} className="existing-image">
                    <img src={url} alt="Event" />
                    <button
                      type="button"
                      title="Remove this image"
                      onClick={() => setEventImageUrls((prev) => prev.filter((item) => item !== url))}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!!eventUploadStatus && <p className="upload-status-text">{eventUploadStatus}</p>}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <FiSave /> {editItem ? 'Update' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const ResolutionModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content admin-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editItem ? 'Edit Resolution' : 'New Resolution'}</h3>
          <button className="close-btn" onClick={closeModal}>
            <FiX />
          </button>
        </div>
        <form className="modal-form" onSubmit={handleModalSubmit}>
          <div className="form-group">
            <label className="form-label">Resolution Number</label>
            <input
              type="text"
              name="number"
              className="form-input"
              defaultValue={editItem?.number || ''}
              placeholder="e.g., RES-2025-001"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              name="title"
              className="form-input"
              defaultValue={editItem?.title || ''}
              placeholder="Enter resolution title"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                className="form-input"
                defaultValue={editItem?.date || ''}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" className="form-select" defaultValue={editItem?.status || ''}>
                <option value="">Select status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              name="description"
              rows="4"
              defaultValue={editItem?.description || ''}
              placeholder="Enter resolution description"
            ></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Upload Document File (PDF, Word, etc.)</label>
            <input
              ref={resDocInputRef}
              type="file"
              className="form-input"
              accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx"
              onChange={(e) => setResDocFile(e.target.files?.[0] || null)}
            />
            {resDocFile && (
              <div className="selected-file-preview">
                <FiFileText />
                <span>{resDocFile.name}</span>
                <button type="button" className="remove-file-inline" onClick={() => { setResDocFile(null); if (resDocInputRef.current) resDocInputRef.current.value = ''; }}>
                  <FiX />
                </button>
              </div>
            )}
            {editItem?.fileUrl && !resDocFile && (
              <div className="existing-file-preview">
                <FiDownload />
                <span>Current: {editItem.fileName || 'Attached file'}</span>
                <a href={editItem.fileUrl} target="_blank" rel="noopener noreferrer" className="view-file-link">View</a>
                <button
                  type="button"
                  className="remove-file-inline"
                  onClick={() => setEditItem((prev) => ({ ...prev, fileUrl: '', fileName: '' }))}
                  title="Remove file"
                >
                  <FiX /> Remove
                </button>
              </div>
            )}
            {resDocStatus && <p className="upload-status-inline">{resDocStatus}</p>}
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
            {editItem && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  handleDelete('resolution', editItem.id);
                  closeModal();
                }}
                style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 'var(--radius-md, 6px)', cursor: 'pointer', fontWeight: '600' }}
              >
                <FiTrash2 /> Delete Resolution
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={resDocUploading}>
              <FiSave /> {resDocUploading ? 'Uploading...' : (editItem ? 'Update' : 'Add Resolution')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      {/* Backdrop for the mobile drawer */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={sscLogo} alt="SSC Logo" className="admin-logo" />
          <span className="admin-title">PSU-UCC Admin</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button
              className="admin-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <FiMenu />
            </button>
            <h1>{sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}</h1>
          </div>
          <div className="header-right">
            <div className="admin-user">
              <div className="user-avatar">A</div>
              <span className="user-name">Admin</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {renderContent()}
        </div>
      </main>

      {/* Rendered as plain function calls, not <Component />, so typing in the
          rich text editor doesn't remount the modal and steal focus. */}
      {showModal && modalType === 'announcement' && AnnouncementModal()}
      {showModal && modalType === 'event' && EventModal()}
      {showModal && modalType === 'resolution' && ResolutionModal()}

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

export default AdminDashboard;
