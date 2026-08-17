import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const requiredKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId
];

export const isFirebaseEnabled = requiredKeys.every(Boolean);

/**
 * Optional allow-list of email domains permitted to vote, e.g.
 * REACT_APP_VOTE_ALLOWED_DOMAINS=psu.edu.ph,students.psu.edu.ph
 * Empty means any Google account may vote.
 *
 * This is a convenience check for the UI — the authoritative copy of this rule
 * lives in firestore.rules, which is what actually blocks a request.
 */
export const allowedVoteDomains = (process.env.REACT_APP_VOTE_ALLOWED_DOMAINS || '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean);

let db = null;
let storage = null;
let auth = null;
let appCheckActive = false;

if (isFirebaseEnabled) {
  const app = initializeApp(firebaseConfig);

  // App Check attests that requests come from this real app rather than a
  // script or third-party "vote booster". Requires a reCAPTCHA v3 site key and
  // App Check to be enforced for Firestore in the Firebase console.
  const appCheckSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  if (appCheckSiteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
      appCheckActive = true;
    } catch (error) {
      console.warn('App Check could not be initialised:', error?.message || error);
    }
  }

  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
}

export const isStorageEnabled = Boolean(storage);
export const isAppCheckActive = appCheckActive;

export { db, storage, auth };
