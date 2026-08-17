/**
 * Service worker registration.
 *
 * Registered only in a production build. In development the dev server serves
 * fresh files on every request and a worker sitting in front of it causes
 * confusing "why is my change not showing" behaviour — the exact problem this
 * is meant to avoid.
 *
 * When a new version is deployed the waiting worker is NOT activated silently.
 * `onUpdateReady` fires so the app can offer a reload; swapping the code under
 * someone's half-filled ticket form is worse than a short delay.
 */
export const registerServiceWorker = ({ onUpdateReady } = {}) => {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Already waiting from a previous visit.
        if (registration.waiting) onUpdateReady?.(registration);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            // `controller` is null on the very first install — that is a fresh
            // cache, not an update, and must not prompt anyone to reload.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdateReady?.(registration);
            }
          });
        });
      })
      .catch(() => {
        // Registration failing just means no offline support. Not worth a
        // message to a student.
      });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
};

/** Activates the waiting worker; the reload follows from `controllerchange`. */
export const applyServiceWorkerUpdate = (registration) => {
  registration?.waiting?.postMessage('SKIP_WAITING');
};
