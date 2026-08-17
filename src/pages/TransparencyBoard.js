import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiArrowRight, FiBell, FiAward, FiCreditCard, FiAlertCircle, FiInfo, FiEye, FiX, FiCalendar, FiClock } from 'react-icons/fi';
import { announcements, memorandumOrders } from '../data/sampleData';
import './TransparencyBoard.css';

const TransparencyBoard = () => {
  const pinnedAnnouncements = announcements.filter(a => a.isPinned);
  const recentMemos = memorandumOrders.slice(0, 3);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState('announcement'); // 'announcement' or 'memo'

  // View counts state (persisted in localStorage)
  const [viewCounts, setViewCounts] = useState(() => {
    const saved = localStorage.getItem('transparencyViewCounts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('transparencyViewCounts', JSON.stringify(viewCounts));
  }, [viewCounts]);

  const getViewCount = (type, id) => {
    const key = `${type}-${id}`;
    return viewCounts[key] || 0;
  };

  const incrementViewCount = (type, id) => {
    const key = `${type}-${id}`;
    setViewCounts(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  };

  const openModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setModalOpen(true);
    incrementViewCount(type, item.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const categoryIcons = {
    'Admin Announcements': FiBell,
    'Vacancies for Scholarships': FiAward,
    'ID/UNIFORM': FiCreditCard,
    'Leniencies': FiAlertCircle,
    'Advisory': FiInfo
  };

  return (
    <div className="transparency-board">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>Virtual Transparency Board</h1>
          <p>Access all official communications, announcements, and memorandums in one centralized platform. Stay informed and engaged with your student government.</p>
        </div>
      </div>

      <div className="container section">
        {/* Quick Navigation */}
        <div className="board-nav">
          <Link to="/announcements" className="board-nav-card">
            <div className="nav-icon announcements">
              <FiBell />
            </div>
            <div className="nav-content">
              <h3>Announcements</h3>
              <p>Official communications and updates</p>
              <ul className="nav-categories">
                <li>Admin Announcements</li>
                <li>Scholarship Vacancies</li>
                <li>ID/Uniform Updates</li>
                <li>Leniencies</li>
                <li>Advisories</li>
              </ul>
            </div>
            <FiArrowRight className="nav-arrow" />
          </Link>

          <Link to="/memorandum" className="board-nav-card">
            <div className="nav-icon memorandums">
              <FiFileText />
            </div>
            <div className="nav-content">
              <h3>Memorandum Orders</h3>
              <p>Official orders and directives</p>
              <ul className="nav-categories">
                <li>Policy Updates</li>
                <li>Guidelines</li>
                <li>Official Directives</li>
              </ul>
            </div>
            <FiArrowRight className="nav-arrow" />
          </Link>
        </div>

        {/* Pinned Announcements */}
        <section className="board-section">
          <div className="section-header-flex">
            <div>
              <h2>📌 Pinned Announcements</h2>
              <p>Important updates that require your attention</p>
            </div>
            <Link to="/announcements" className="btn btn-outline">
              View All <FiArrowRight />
            </Link>
          </div>

          <div className="pinned-grid">
            {pinnedAnnouncements.map((announcement) => {
              const IconComponent = categoryIcons[announcement.category] || FiBell;
              return (
                <div key={announcement.id} className="pinned-card" onClick={() => openModal(announcement, 'announcement')}>
                  <div className="pinned-header">
                    <div className="pinned-icon">
                      <IconComponent />
                    </div>
                    <span className="pinned-category">{announcement.category}</span>
                    <span className="view-count">
                      <FiEye /> {getViewCount('announcement', announcement.id)}
                    </span>
                  </div>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.content}</p>
                  <div className="pinned-footer">
                    <span className="pinned-date">
                      {new Date(announcement.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <button className="see-more-btn">See More</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Memorandums */}
        <section className="board-section">
          <div className="section-header-flex">
            <div>
              <h2>Recent Memorandum Orders</h2>
              <p>Latest official directives and policies</p>
            </div>
            <Link to="/memorandum" className="btn btn-outline">
              View All <FiArrowRight />
            </Link>
          </div>

          <div className="memos-list">
            {recentMemos.map((memo) => (
              <div key={memo.id} className="memo-card" onClick={() => openModal(memo, 'memo')}>
                <div className="memo-number">{memo.number}</div>
                <div className="memo-content">
                  <h3>{memo.title}</h3>
                  <p>{memo.description}</p>
                  <div className="memo-meta">
                    <span>📅 Issued: {new Date(memo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>⏰ Effective: {new Date(memo.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="memo-actions">
                  <span className="view-count">
                    <FiEye /> {getViewCount('memo', memo.id)}
                  </span>
                  <button className="see-more-btn">See More</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Info Cards */}
        <section className="board-section">
          <div className="info-grid">
            <div className="info-card">
              <h4>Stay Updated</h4>
              <p>Check the transparency board regularly for the latest announcements and memorandums from the administration and student council.</p>
            </div>
            <div className="info-card">
              <h4>Official Documents</h4>
              <p>All documents posted here are official communications. For verification, visit the SSC Office during office hours.</p>
            </div>
            <div className="info-card">
              <h4>Have Questions?</h4>
              <p>If you have questions about any announcement or memorandum, feel free to contact us through our official channels.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal */}
      {modalOpen && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            
            {modalType === 'announcement' ? (
              <div className="modal-body announcement-modal">
                <span className="modal-category-tag">{selectedItem.category}</span>
                <h2>{selectedItem.title}</h2>
                <div className="modal-meta-row">
                  <span className="modal-date-text">
                    <FiCalendar />
                    {new Date(selectedItem.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount('announcement', selectedItem.id)} views
                  </span>
                </div>
                <div className="modal-divider"></div>
                <div className="modal-text">
                  <p>{selectedItem.content}</p>
                </div>
                {selectedItem.images && selectedItem.images.length > 0 && (
                  <button className="modal-images-btn">
                    <FiFileText /> View Attached Image/s ({selectedItem.images.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="modal-body memo-modal">
                <span className="modal-memo-tag">{selectedItem.number}</span>
                <h2>{selectedItem.title}</h2>
                <div className="modal-meta-row">
                  <span className="modal-views-tag">
                    <FiEye /> {getViewCount('memo', selectedItem.id)} views
                  </span>
                </div>
                <div className="modal-dates-row">
                  <div className="modal-date-chip">
                    <FiCalendar />
                    <span>Issued: {new Date(selectedItem.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                  <div className="modal-date-chip">
                    <FiClock />
                    <span>Effective: {new Date(selectedItem.effectiveDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>
                <div className="modal-divider"></div>
                <div className="modal-text">
                  <p>{selectedItem.description}</p>
                </div>
                {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                  <button className="modal-images-btn">
                    <FiFileText /> View Attached File/s ({selectedItem.attachments.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransparencyBoard;
