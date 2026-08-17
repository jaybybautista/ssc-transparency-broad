import React from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiCalendar, FiUsers, FiArrowRight, FiFileText, FiBell, FiAward, FiTarget } from 'react-icons/fi';
import { announcements, calendarEvents, accomplishments } from '../data/sampleData';
import './Home.css';

const Home = () => {
  const latestAnnouncements = announcements.slice(0, 3);
  const upcomingEvents = calendarEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 3);
  const recentAccomplishments = accomplishments.filter(a => a.status === 'Completed').slice(0, 4);

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'planned': return 'badge-planned';
      default: return 'badge-planned';
    }
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-pattern"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-badge">Pangasinan State University - Urdaneta City Campus</div>
          <h1 className="hero-title">
            Supreme Student Council <span className="highlight">Virtual Board</span>
          </h1>
          <p className="hero-subtitle">
            Empowering transparency, fostering unity, and serving the student body 
            through digital innovation and accessible governance. A.Y. 2025-2026
          </p>
          <div className="hero-actions">
            <Link to="/transparency-board" className="btn btn-primary">
              View Transparency Board
              <FiArrowRight />
            </Link>
            <Link to="/ssc/officers" className="btn btn-outline-light">
              Meet the Officers
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">15+</span>
              <span className="stat-label">Officers</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50+</span>
              <span className="stat-label">Events Yearly</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">1000+</span>
              <span className="stat-label">Students Served</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Sections Overview */}
      <section className="section sections-overview">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">What We Offer</h2>
            <p className="section-subtitle">
              Access all the resources and information you need in one place
            </p>
          </div>
          
          <div className="overview-grid">
            <Link to="/transparency-board" className="overview-card card-transparency">
              <div className="card-icon">
                <FiEye />
              </div>
              <h3>Virtual Transparency Board</h3>
              <p>Stay informed with the latest announcements, memorandums, and official communications from the administration and SSC.</p>
              <span className="card-link">
                View Board <FiArrowRight />
              </span>
            </Link>
            
            <Link to="/calendar" className="overview-card card-calendar">
              <div className="card-icon">
                <FiCalendar />
              </div>
              <h3>Unified Calendar</h3>
              <p>Never miss an event! View all scheduled activities with color-coded status indicators for easy tracking.</p>
              <span className="card-link">
                View Calendar <FiArrowRight />
              </span>
            </Link>
            
            <Link to="/ssc" className="overview-card card-ssc">
              <div className="card-icon">
                <FiUsers />
              </div>
              <h3>SSC Resources</h3>
              <p>Access SSC documents, meet the officers, submit requests, and track accomplishments all in one place.</p>
              <span className="card-link">
                Explore SSC <FiArrowRight />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Announcements */}
      <section className="section announcements-section">
        <div className="container">
          <div className="section-header-flex">
            <div>
              <h2 className="section-title">Latest Announcements</h2>
              <p className="section-subtitle">Stay updated with the latest news and information</p>
            </div>
            <Link to="/transparency-board/announcements" className="btn btn-outline">
              View All <FiArrowRight />
            </Link>
          </div>
          
          <div className="announcements-grid">
            {latestAnnouncements.map((announcement, index) => (
              <div key={announcement.id} className="announcement-card" style={{ animationDelay: `${index * 0.1}s` }}>
                {announcement.isPinned && <span className="pinned-badge">📌 Pinned</span>}
                <span className="announcement-category">{announcement.category}</span>
                <h3 className="announcement-title">{announcement.title}</h3>
                <p className="announcement-content">{announcement.content}</p>
                <span className="announcement-date">
                  {new Date(announcement.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="section events-section">
        <div className="container">
          <div className="section-header-flex">
            <div>
              <h2 className="section-title">Upcoming Events</h2>
              <p className="section-subtitle">Mark your calendars for these upcoming activities</p>
            </div>
            <Link to="/calendar" className="btn btn-outline">
              Full Calendar <FiArrowRight />
            </Link>
          </div>
          
          <div className="events-grid">
            {upcomingEvents.map((event, index) => (
              <div key={event.id} className="event-card" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="event-date-badge">
                  <span className="event-day">{new Date(event.date).getDate()}</span>
                  <span className="event-month">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div className="event-details">
                  <span className={`badge ${getStatusClass(event.status)}`}>{event.status}</span>
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-info">
                    <span>🕐 {event.time}</span>
                    <span>📍 {event.location}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="status-legend">
            <span className="legend-item">
              <span className="legend-dot planned"></span>
              Planned
            </span>
            <span className="legend-item">
              <span className="legend-dot pending"></span>
              Pending
            </span>
            <span className="legend-item">
              <span className="legend-dot approved"></span>
              Approved
            </span>
          </div>
        </div>
      </section>

      {/* Recent Accomplishments */}
      <section className="section accomplishments-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Recent Accomplishments</h2>
            <p className="section-subtitle">See what we've achieved for the student body</p>
          </div>
          
          <div className="accomplishments-grid">
            {recentAccomplishments.map((item, index) => (
              <div key={item.id} className="accomplishment-card" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="accomplishment-icon">
                  <FiAward />
                </div>
                <div className="accomplishment-info">
                  <span className="accomplishment-category">{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span className="accomplishment-date">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center" style={{ marginTop: '2rem' }}>
            <Link to="/ssc/accomplishments" className="btn btn-primary">
              View All Accomplishments <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Links CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Need Something?</h2>
            <p>Access SSC services and resources quickly</p>
          </div>
          <div className="cta-links">
            <Link to="/ssc/request-letters" className="cta-link">
              <FiFileText />
              <span>Request Letters</span>
            </Link>
            <Link to="/ssc/resolutions" className="cta-link">
              <FiFileText />
              <span>View Resolutions</span>
            </Link>
            <Link to="/ssc/contact" className="cta-link">
              <FiBell />
              <span>Contact Us</span>
            </Link>
            <Link to="/ssc/mission-vision" className="cta-link">
              <FiTarget />
              <span>Our Mission</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
