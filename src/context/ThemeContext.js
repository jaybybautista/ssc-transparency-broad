import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Light/dark theme.
 *
 * The choice is written to `data-theme` on <html>, which every dark rule in
 * global.css hangs off, and remembered in localStorage. It is applied before
 * React renders (see the inline script in public/index.html) so a returning
 * visitor never sees a white flash before the dark palette arrives.
 *
 * There is no visible toggle by design — tapping the ❤️ in the footer switches
 * it, as an easter egg.
 */
const STORAGE_KEY = 'ssc_theme';

const ThemeContext = createContext(null);

const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (error) {
    // Private browsing can throw on localStorage access.
  }
  /*
   * Light by default, deliberately — NOT the device's preference.
   *
   * This is an official campus noticeboard: white is what it is meant to look
   * like, and it is the version officers see when they check their work. A
   * visitor whose laptop happens to be in dark mode should not get a different
   * board from the one the council designed. Dark is a choice someone opts into
   * with the heart in the footer, and it is remembered once they do.
   */
  return 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;

    /*
     * Suppress transitions for the one frame the swap happens in.
     *
     * Two reasons. The obvious one is that letting a hundred elements cross-fade
     * at once looks mushy — an instant swap reads as deliberate.
     *
     * The subtle one is a real bug it fixes: an element with `transition: all`
     * whose background comes from a custom property does not repaint when only
     * that property changes. The navbar kept whichever background it loaded
     * with, however many times you toggled. With no transition in effect for
     * that frame, there is nothing to get stuck.
     */
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', theme);

    // Two frames: one for the attribute to apply, one for styles to settle.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('theme-switching'));
    });
    // Keeps the mobile browser chrome in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#020C30');

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Nothing to do — the theme still applies for this session.
    }

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('theme-switching');
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme, setTheme }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
