import React from 'react';
import { FiTarget, FiHeart, FiStar, FiCheckCircle } from 'react-icons/fi';
import { useData } from '../context/DataContext';
import OfficerDirectory from '../components/OfficerDirectory';
import '../components/OfficerListView.css';
import { useLanguage } from '../context/LanguageContext';
import './AboutSSC.css';

const AboutSSC = () => {
  const { t } = useLanguage();
  const { officers, siteProfile, selectedYear } = useData();
  return (
    <div className="about-ssc-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('about.title')}</h1>
          <p>{t('about.subtitle')}</p>
        </div>
      </div>

      <div className="container section">
        {/* Vision & Mission Cards */}
        <div className="mv-cards">
          <div className="mv-card vision-card">
            <div className="mv-icon">
              <FiTarget />
            </div>
            <h2>{t('about.vision')}</h2>
            <p>{siteProfile.vision}</p>
          </div>
          
          <div className="mv-card mission-card">
            <div className="mv-icon">
              <FiStar />
            </div>
            <h2>{t('about.mission')}</h2>
            <p>{siteProfile.mission}</p>
          </div>
        </div>

        {/* {t('about.values')} */}
        <section className="core-values-section">
          <h2 className="section-title">
            <FiHeart className="title-icon" />
            {t('about.values')}
          </h2>
          <div className="values-grid">
            {siteProfile.coreValues.map((value, index) => (
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
            {t('about.goals')}
          </h2>
          <div className="goals-list">
            {siteProfile.goals.map((goal, index) => (
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
            {t('off.title')}
          </h2>
          <p className="officers-intro">
            Get to know the dedicated student leaders who serve and represent the student body with passion and commitment.
          </p>

          <OfficerDirectory
            officers={officers}
            orgChartUrl={siteProfile.orgChartUrl}
            academicYear={selectedYear}
          />
        </section>

        {/* Message from SSC */}
        <div className="ssc-message">
          <h3>{t('about.message')}</h3>
          <p>
            We are honored to serve as your Student Supreme Council officers. Our commitment is to represent 
            your voice, address your concerns, and create meaningful opportunities for growth and development. 
            Together, we can build a stronger, more united student community.
          </p>
          <p>
            <strong>{t('about.voiceMatters')}</strong> Don't hesitate to reach out to any of our officers for 
            questions, suggestions, or concerns. We are here to serve you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutSSC;
