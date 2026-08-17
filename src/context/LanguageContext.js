import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, translate } from '../lib/translations';

/**
 * Interface language.
 *
 * Per-device and remembered locally: which language someone reads the buttons
 * in is a personal preference, not something the board needs to record about
 * them. A first-time visitor whose browser is set to Filipino gets Filipino.
 */
const STORAGE_KEY = 'ssc_language';

const LanguageContext = createContext(null);

const detect = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((entry) => entry.code === stored)) return stored;
  } catch (error) {
    /* private browsing */
  }
  const preferred = (navigator.languages || [navigator.language || 'en']).join(',').toLowerCase();
  // "fil", "tl" and "tgl" all mean Filipino/Tagalog depending on the platform.
  return /\b(fil|tl|tgl)\b/.test(preferred) ? 'fil' : 'en';
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(detect);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      /* preference still applies for this session */
    }
    // Screen readers and browser translation prompts read this.
    document.documentElement.setAttribute('lang', language === 'fil' ? 'fil-PH' : 'en-PH');
  }, [language]);

  const t = useCallback((key) => translate(language, key), [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: LANGUAGES }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
