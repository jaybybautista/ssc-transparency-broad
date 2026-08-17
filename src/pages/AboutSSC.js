import React, { useEffect, useState } from 'react';
import { FiTarget, FiHeart, FiStar, FiCheckCircle, FiMail } from 'react-icons/fi';
import { missionVision } from '../data/sampleData';
import { useData } from '../context/DataContext';
import OfficerAvatar from '../components/OfficerAvatar';
import ViewToggle from '../components/ViewToggle';
import '../components/OfficerListView.css';
import './AboutSSC.css';

const DIVISIONS = [
  'Core Officers',
  'SSC Advisers',
  'SSC Secretaries',
  'Executive Department',
  'Legislative Department',
  'Executive Committees'
];

const AboutSSC = () => {
  const { officers } = useData();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('officersViewMode') || 'grid');

  useEffect(() => {
    localStorage.setItem('officersViewMode', viewMode);
  }, [viewMode]);

  return (
    <div className="about-ssc-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>About SSC</h1>
          <p>Learn about our mission, vision, and meet the dedicated student leaders who serve the student body.</p>
        </div>
      </div>

      <div className="container section">
        {/* Vision & Mission Cards */}
        <div className="mv-cards">
          <div className="mv-card vision-card">
            <div className="mv-icon">
              <FiTarget />
            </div>
            <h2>Our Vision</h2>
            <p>{missionVision.vision}</p>
          </div>
          
          <div className="mv-card mission-card">
            <div className="mv-icon">
              <FiStar />
            </div>
            <h2>Our Mission</h2>
            <p>{missionVision.mission}</p>
          </div>
        </div>

        {/* Core Values */}
        <section className="core-values-section">
          <h2 className="section-title">
            <FiHeart className="title-icon" />
            Core Values
          </h2>
          <div className="values-grid">
            {missionVision.coreValues.map((value, index) => (
              <div key={index} className="value-card" style={{ animationDelay: `${index * 0.1}s` }}>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Goals */}
        <section className="goals-section">
          <h2 className="section-title">
            <FiCheckCircle className="title-icon" />
            Our Goals
          </h2>
          <div className="goals-list">
            {missionVision.goals.map((goal, index) => (
              <div key={index} className="goal-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <span className="goal-number">{index + 1}</span>
                <p>{goal}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Officers Section */}
        <section className="officers-section">
          <h2 className="section-title">
            <FiHeart className="title-icon" />
            Meet the Officers
          </h2>
          <p className="officers-intro">
            Get to know the dedicated student leaders who serve and represent the student body with passion and commitment.
          </p>

          {!!officers.length && (
            <div className="view-toolbar">
              <span className="view-toolbar-count">
                {officers.length} officer{officers.length === 1 ? '' : 's'}
              </span>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          )}

          {/* Officers Grid by division */}
          {DIVISIONS.map((division) => {
            const divisionOfficers = officers.filter((officer) => (officer.division || 'Core Officers') === division);
            if (!divisionOfficers.length) {
              return null;
            }

            return (
              <div key={division} className="division-section">
                <h3 className="division-title">{division}</h3>
                <div className={`officers-grid ${viewMode === 'list' ? 'is-list' : ''}`}>
                  {divisionOfficers.map((officer, index) => (
                    <div key={officer.id} className="officer-card" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="officer-image">
                        <OfficerAvatar src={officer.image} alt={officer.name} />
                        {officer.email && (
                          <div className="officer-overlay">
                            <a href={`mailto:${officer.email}`} className="overlay-btn" title={`Email ${officer.name}`}>
                              <FiMail />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="officer-info">
                        <span className="officer-position">{officer.position}</span>
                        <h3 className="officer-name">{officer.name}</h3>
                        {officer.course && <p className="officer-course">{officer.course}</p>}
                        {officer.yearLevel && <p className="officer-year">{officer.yearLevel}</p>}
                        {officer.quote && <p className="officer-quote">"{officer.quote}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Message from SSC */}
        <div className="ssc-message">
          <h3>A Message from Your Student Council</h3>
          <p>
            We are honored to serve as your Student Supreme Council officers. Our commitment is to represent 
            your voice, address your concerns, and create meaningful opportunities for growth and development. 
            Together, we can build a stronger, more united student community.
          </p>
          <p>
            <strong>Your voice matters.</strong> Don't hesitate to reach out to any of our officers for 
            questions, suggestions, or concerns. We are here to serve you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutSSC;
