import React from 'react';
import { FiGlobe } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import './LanguageToggle.css';

/**
 * English / Filipino switch.
 *
 * A two-state segmented control rather than a dropdown: with exactly two
 * options a menu is one click of pure overhead, and showing both makes it
 * obvious the board has a Filipino version at all.
 */
const LanguageToggle = () => {
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label="Interface language">
      <FiGlobe className="lang-icon" aria-hidden="true" />
      {languages.map((entry) => (
        <button
          key={entry.code}
          type="button"
          className={`lang-option ${language === entry.code ? 'active' : ''}`}
          onClick={() => setLanguage(entry.code)}
          aria-pressed={language === entry.code}
          lang={entry.code === 'fil' ? 'fil-PH' : 'en'}
          title={entry.label}
        >
          {entry.short}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
