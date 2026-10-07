import React from 'react';
import { FiTarget, FiHeart, FiStar, FiCheckCircle } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import './MissionVision.css';

const MissionVision = () => {
  const { t } = useLanguage();
  const { siteProfile } = useData();
  return (
    <div className="mission-vision-page">
      <div className="page-header">
        <div className="page-header-content container">
          <h1>{t('mv.title')}</h1>
          <p>{t('mv.subtitle')}</p>
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

        {/* Commitment Banner */}
        <div className="commitment-banner">
          <h3>{t('about.commitment')}</h3>
          <p>
            We pledge to uphold these values and work tirelessly toward achieving our goals. 
            Every decision we make is guided by our commitment to serve the student body and 
            create a positive impact on our academic community.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissionVision;
