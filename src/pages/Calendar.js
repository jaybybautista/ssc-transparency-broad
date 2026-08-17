import React, { useState, useRef, useEffect, useContext } from 'react';
import { FiChevronLeft, FiChevronRight, FiMapPin, FiClock, FiCalendar, FiFilter, FiCheck, FiChevronDown, FiEye, FiX, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { AuthContext } from '../App';
import { useData } from '../context/DataContext';
import useModalBehaviour from '../components/useModalBehaviour';
import { useDialog } from '../components/DialogProvider';
import { uploadImages } from '../lib/uploads';
import ImageCarousel from '../components/ImageCarousel';
import RichContent from '../components/RichContent';
import RichTextEditor from '../components/RichTextEditor';
import AddToCalendar from '../components/AddToCalendar';
import CalendarSyncPanel from '../components/CalendarSyncPanel';
import './Calendar.css';

const Calendar = () => {
  const { isAdmin } = useContext(AuthContext);
  const { confirm, notify } = useDialog();
  const { events, createEvent, updateEvent, deleteEvent } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    status: 'planned',
    imageUrls: []
  });
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [manualImageUrls, setManualImageUrls] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const imageInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Admin CRUD handlers
  const handleAdd = () => {
    setEditItem(null);
    setFormData({ title: '', date: '', time: '', location: '', description: '', status: 'planned', imageUrls: [] });
    setSelectedImageFiles([]);
    setManualImageUrls('');
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleEdit = (event) => {
    setEditItem(event);
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      status: event.status,
      imageUrls: event.imageUrls || []
    });
    setSelectedImageFiles([]);
    setManualImageUrls('');
    setUploadStatus('');
    setShowAdminModal(true);
  };

  const handleRemoveExistingImage = (url) => {
    setFormData((prev) => ({ ...prev, imageUrls: (prev.imageUrls || []).filter((item) => item !== url) }));
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm({
      title: 'Delete event?',
      message: 'This event will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!shouldDelete) return;
    deleteEvent(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    let uploadedUrls = [];
    if (selectedImageFiles.length) {
      try {
        uploadedUrls = await uploadImages(selectedImageFiles, 'events', ({ current, total, successCount, failedCount, status }) => {
          if (status === 'uploading') setUploadStatus(`Uploading image ${current}/${total}...`);
          if (status === 'done') setUploadStatus(`${successCount} uploaded, ${failedCount} skipped.`);
        });
      } catch (error) {
        uploadedUrls = [];
      }
    }

    const pastedUrls = manualImageUrls
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      ...formData,
      imageUrls: [...(formData.imageUrls || []), ...uploadedUrls, ...pastedUrls]
    };

    try {
      if (editItem) {
        await updateEvent(editItem.id, payload);
      } else {
        await createEvent(payload);
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

  // View counts state (persisted in localStorage)
  const [viewCounts, setViewCounts] = useState(() => {
    const saved = localStorage.getItem('calendarViewCounts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('calendarViewCounts', JSON.stringify(viewCounts));
  }, [viewCounts]);

  const getViewCount = (id) => {
    return viewCounts[`event-${id}`] || 0;
  };

  const incrementViewCount = (id) => {
    setViewCounts(prev => ({
      ...prev,
      [`event-${id}`]: (prev[`event-${id}`] || 0) + 1
    }));
  };

  const openModal = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
    incrementViewCount(event.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', color: null },
    { value: 'planned', label: 'Planned', color: 'var(--status-planned)' },
    { value: 'pending', label: 'Pending', color: 'var(--status-pending)' },
    { value: 'approved', label: 'Approved', color: 'var(--status-approved)' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getFilteredEvents = () => {
    let filtered = events;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }
    
    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Date picker helpers (built from local date parts so the day never shifts by timezone)
  const toDateInputValue = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDatePick = (value) => {
    if (!value) {
      setSelectedDate(null);
      return;
    }
    const [year, month, day] = value.split('-').map(Number);
    setSelectedDate(new Date(year, month - 1, day));
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'planned': return 'status-planned';
      default: return 'status-planned';
    }
  };

  const days = getDaysInMonth(currentDate);
  const filteredEvents = getFilteredEvents();
  const upcomingEvents = filteredEvents.filter(e => new Date(e.date) >= new Date());

  useModalBehaviour(showAdminModal, () => setShowAdminModal(false));

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>Unified Calendar of Activities</h1>
          <p>View all scheduled events and activities. Color-coded for easy tracking of event status.</p>
          {isAdmin && (
            <button className="admin-add-btn" onClick={handleAdd}>
              <FiPlus /> Add Event
            </button>
          )}
        </div>
      </div>

      <div className="container section">
        {/* Legend */}
        <div className="calendar-legend">
          <h3><FiCalendar /> Status Legend</h3>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot planned"></span>
              <span>Planned</span>
              <small>Event is scheduled</small>
            </div>
            <div className="legend-item">
              <span className="legend-dot pending"></span>
              <span>Pending</span>
              <small>Awaiting approval</small>
            </div>
            <div className="legend-item">
              <span className="legend-dot approved"></span>
              <span>Approved</span>
              <small>Confirmed event</small>
            </div>
          </div>
        </div>

        <div className="calendar-container">
          {/* Calendar */}
          <div className="calendar-main">
            <div className="calendar-header">
              <div className="calendar-nav">
                <button onClick={prevMonth} className="nav-btn">
                  <FiChevronLeft />
                </button>
                <h2>{months[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <button onClick={nextMonth} className="nav-btn">
                  <FiChevronRight />
                </button>
              </div>
              <button onClick={goToToday} className="today-btn">Today</button>
            </div>

            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {daysOfWeek.map(day => (
                  <div key={day} className="weekday">{day}</div>
                ))}
              </div>
              
              <div className="calendar-days">
                {days.map((dayObj, index) => {
                  const events = getEventsForDate(dayObj.date);
                  const isToday = dayObj.date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate && dayObj.date.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${events.length > 0 ? 'has-events' : ''}`}
                      onClick={() => setSelectedDate(dayObj.date)}
                    >
                      <span className="day-number">{dayObj.day}</span>
                      {events.length > 0 && (
                        <div className="day-events">
                          {events.slice(0, 2).map(event => (
                            <span key={event.id} className={`event-dot ${getStatusClass(event.status)}`}></span>
                          ))}
                          {events.length > 2 && <span className="more-events">+{events.length - 2}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Events Sidebar */}
          <div className="events-sidebar">
            <div className="sidebar-header">
              <h3>
                {selectedDate 
                  ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Upcoming Events'
                }
              </h3>
              <div className="filter-dropdown" ref={dropdownRef}>
                <button 
                  className={`dropdown-trigger ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <FiFilter className="filter-icon" />
                  <span className="dropdown-label">
                    {statusOptions.find(opt => opt.value === statusFilter)?.label}
                  </span>
                  <FiChevronDown className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">Filter by Status</div>
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        className={`dropdown-option ${statusFilter === option.value ? 'selected' : ''}`}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setDropdownOpen(false);
                        }}
                      >
                        <span className="option-content">
                          {option.color && (
                            <span 
                              className="status-indicator" 
                              style={{ backgroundColor: option.color }}
                            />
                          )}
                          {!option.color && <span className="status-indicator all-status" />}
                          <span className="option-label">{option.label}</span>
                        </span>
                        {statusFilter === option.value && (
                          <FiCheck className="check-icon" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sidebar-datepicker">
              <label htmlFor="calendar-date-picker">
                <FiCalendar /> Jump to a date
              </label>
              <div className="datepicker-row">
                <input
                  id="calendar-date-picker"
                  type="date"
                  className="datepicker-input"
                  value={toDateInputValue(selectedDate)}
                  onChange={(e) => handleDatePick(e.target.value)}
                />
                {selectedDate && (
                  <button
                    type="button"
                    className="datepicker-clear"
                    onClick={() => setSelectedDate(null)}
                    title="Show upcoming events"
                  >
                    <FiX />
                  </button>
                )}
              </div>
              {selectedDate && (
                <span className="datepicker-hint">
                  {getEventsForDate(selectedDate).length} event
                  {getEventsForDate(selectedDate).length === 1 ? '' : 's'} on this date
                </span>
              )}
            </div>

            <div className="events-list">
              {selectedDate ? (
                getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="event-card">
                      <div className="event-card-content" onClick={() => openModal(event)}>
                        <div className="event-card-header">
                          <span className={`event-status ${getStatusClass(event.status)}`}>
                            {event.status}
                          </span>
                          <span className="event-views">
                            <FiEye /> {getViewCount(event.id)}
                          </span>
                        </div>
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                        <div className="event-meta">
                          <span><FiClock /> {event.time}</span>
                          <span><FiMapPin /> {event.location}</span>
                        </div>
                        <button className="see-more-btn">See More</button>
                      </div>
                      {isAdmin && (
                        <div className="admin-actions">
                          <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(event); }}>
                            <FiEdit2 />
                          </button>
                          <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}>
                            <FiTrash2 />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-events">
                    <p>No events scheduled for this date.</p>
                  </div>
                )
              ) : (
                upcomingEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="event-card">
                    <div className="event-card-content" onClick={() => openModal(event)}>
                      <div className="event-date-small">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="event-card-header">
                        <span className={`event-status ${getStatusClass(event.status)}`}>
                          {event.status}
                        </span>
                        <span className="event-views">
                          <FiEye /> {getViewCount(event.id)}
                        </span>
                      </div>
                      <h4>{event.title}</h4>
                      <p>{event.description}</p>
                      <div className="event-meta">
                        <span><FiClock /> {event.time}</span>
                        <span><FiMapPin /> {event.location}</span>
                      </div>
                      <button className="see-more-btn">See More</button>
                    </div>
                    {isAdmin && (
                      <div className="admin-actions">
                        <button className="admin-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(event); }}>
                          <FiEdit2 />
                        </button>
                        <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}>
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sync to Google / Apple / Outlook. Below the calendar, and collapsed
            until asked for — hidden in the admin dashboard, where exporting to a
            personal calendar is not what an officer came here for. */}
        {!isAdmin && <CalendarSyncPanel events={events} />}
      </div>

      {/* Modal */}
      {modalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content blog-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            <div className="modal-body">
              <div className="blog-article-header">
                <div className="modal-status-row">
                  <span className={`event-status ${getStatusClass(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                  {selectedEvent.category && <span className="modal-category-tag">{selectedEvent.category}</span>}
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount(selectedEvent.id)} views
                  </span>
                </div>
                <h2 className="blog-article-title">{selectedEvent.title}</h2>
                <div className="blog-article-meta">
                  <span className="blog-meta-item">
                    <FiCalendar />
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  {selectedEvent.time && (
                    <span className="blog-meta-item">
                      <FiClock /> {selectedEvent.time}
                    </span>
                  )}
                  {selectedEvent.location && (
                    <span className="blog-meta-item">
                      <FiMapPin /> {selectedEvent.location}
                    </span>
                  )}
                </div>

                <div className="event-modal-actions">
                  <AddToCalendar event={selectedEvent} />
                  <span className="event-modal-actions-hint">
                    Adds this activity, with a reminder, to your own calendar app.
                  </span>
                </div>
              </div>

              <div className="blog-article-body">
                {!!selectedEvent.imageUrls?.length && (
                  <ImageCarousel images={selectedEvent.imageUrls} alt={selectedEvent.title} />
                )}
                <RichContent html={selectedEvent.description} />
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
              <h3>{editItem ? 'Edit Event' : 'Add New Event'}</h3>
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
                <label>Time</label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="e.g., 9:00 AM - 5:00 PM"
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
                <label>Description</label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Describe the event. Use the toolbar for bold, italics, headings and lists."
                  minHeight={180}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="planned">Planned</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Upload Images (you can select multiple)</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setSelectedImageFiles(Array.from(e.target.files || []))}
                />
                {!!selectedImageFiles.length && (
                  <small>{selectedImageFiles.length} new image(s) ready to upload.</small>
                )}
                {!!formData.imageUrls?.length && (
                  <div className="existing-images-grid">
                    {formData.imageUrls.map((url, urlIndex) => (
                      <div key={`${url}-${urlIndex}`} className="existing-image">
                        <img src={url} alt="Event" />
                        <button
                          type="button"
                          title="Remove this image"
                          onClick={() => handleRemoveExistingImage(url)}
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
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : `${editItem ? 'Update' : 'Add'} Event`}
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

export default Calendar;
