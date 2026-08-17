import React from 'react';
import { Link } from 'react-router-dom';
import { FiTarget, FiFileText, FiClipboard, FiBook, FiAward, FiSend, FiArrowRight, FiBookOpen } from 'react-icons/fi';
import './SSC.css';

const SSC = () => {
  const sections = [
    {
      title: 'About SSC',
      description: 'Discover our mission, vision, core values, and meet the officers.',
      icon: FiTarget,
      path: '/ssc/about',
      color: 'purple'
    },
    {
      title: 'Constitution & By-Laws',
      description: 'Read the governing documents of the Supreme Student Council.',
      icon: FiBookOpen,
      path: '/ssc/constitution',
      color: 'purple'
    },
    {
      title: 'Resolutions',
      description: 'View official resolutions passed by the student council.',
      icon: FiFileText,
      path: '/ssc/resolutions',
      color: 'blue'
    },
    {
      title: 'Minutes of Meeting',
      description: 'Access records of council meetings and discussions.',
      icon: FiClipboard,
      path: '/ssc/minutes-of-meeting',
      color: 'red'
    },
    {
      title: 'Narrative Reports',
      description: 'Read detailed reports of SSC activities and events.',
      icon: FiBook,
      path: '/ssc/narrative-reports',
      color: 'teal'
    },
    {
      title: 'Accomplishment Tracker',
      description: 'Track our progress and completed initiatives.',
      icon: FiAward,
      path: '/ssc/accomplishments',
      color: 'gold'
    },
    {
      title: 'Request Letters',
      description: 'Download request letter templates for equipment, venue, and more.',
      icon: FiSend,
      path: '/ssc/request-letters',
      color: 'pink'
    }
  ];

  return (
    <div className="ssc-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>Student Supreme Council</h1>
          <p>Your gateway to student government resources, documents, and services. We are committed to serving the student body with integrity and excellence.</p>
        </div>
      </div>

      <div className="container section">
        <div className="ssc-intro">
          <div className="intro-content">
            <h2>Welcome to SSC</h2>
            <p>
              The Student Supreme Council (SSC) is the highest governing student body of our institution. 
              We serve as the voice of the students, advocating for your rights and welfare while promoting 
              academic excellence and holistic development.
            </p>
            <p>
              Explore the sections below to learn more about our organization, access important documents, 
              and utilize our services.
            </p>
            <Link to="/ssc/about" className="btn btn-primary">
              Learn About SSC <FiArrowRight />
            </Link>
          </div>
        </div>

        <div className="ssc-sections">
          <h2 className="sections-title">Explore SSC</h2>
          <div className="sections-grid">
            {sections.map((section, index) => (
              <Link 
                key={section.path} 
                to={section.path} 
                className={`section-card color-${section.color}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="section-icon">
                  <section.icon />
                </div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                <span className="section-link">
                  Explore <FiArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSC;
