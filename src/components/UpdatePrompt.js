import React, { useEffect, useState } from 'react';
import { FiRefreshCw, FiX, FiDownload } from 'react-icons/fi';
import { applyServiceWorkerUpdate, registerServiceWorker } from '../lib/serviceWorker';
import './UpdatePrompt.css';

/**
 * Two small prompts that only appear when they are useful:
 *
 *  - a new version has been deployed and is waiting;
 *  - the board can be installed to the home screen.
 *
 * Both are dismissible, and the install one stays dismissed, because a banner
 * that reappears on every visit is worse than no banner.
 */
const INSTALL_DISMISSED_KEY = 'ssc_install_dismissed';

const UpdatePrompt = () => {
  const [registration, setRegistration] = useState(null);
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    registerServiceWorker({ onUpdateReady: setRegistration });
  }, []);

  useEffect(() => {
    const onPrompt = (event) => {
      // Stop Chrome's own mini-infobar; we ask at a better moment.
      event.preventDefault();
      if (localStorage.getItem(INSTALL_DISMISSED_KEY) !== 'true') {
        setInstallEvent(event);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setInstallEvent(null));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    setInstallEvent(null);
  };

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (registration) {
    return (
      <div className="app-prompt update" role="status">
        <FiRefreshCw />
        <span>A newer version of the board is ready.</span>
        <button type="button" className="app-prompt-action" onClick={() => applyServiceWorkerUpdate(registration)}>
          Reload
        </button>
        <button type="button" className="app-prompt-close" onClick={() => setRegistration(null)} aria-label="Dismiss">
          <FiX />
        </button>
      </div>
    );
  }

  if (installEvent) {
    return (
      <div className="app-prompt install" role="status">
        <FiDownload />
        <span>Add the board to your home screen for quicker access offline.</span>
        <button type="button" className="app-prompt-action" onClick={install}>
          Install
        </button>
        <button type="button" className="app-prompt-close" onClick={dismissInstall} aria-label="No thanks">
          <FiX />
        </button>
      </div>
    );
  }

  return null;
};

export default UpdatePrompt;
