/**
 * What the current browser and address can actually do for Google sign-in.
 *
 * Sign-in was popup-only, which is the standard way an admin ends up unable to
 * log in from a phone: mobile Chrome, mobile Safari and every in-app browser
 * either block the popup outright or open it somewhere the app never hears
 * back from. Firebase's own guidance is to redirect on those, and that is what
 * these helpers decide.
 */

/* Phones and tablets. "Mobile Safari" appears in Android Chrome's string too,
   which is intended: that is exactly the browser this is for. Desktop Chrome
   says "Safari" without "Mobile". */
const MOBILE = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile Safari|SamsungBrowser|Silk/i;

/* Browsers embedded in another app: Facebook, Messenger, Instagram, Line,
   WeChat, the Google app. A popup here is never seen by the user. */
const IN_APP = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|GSA\/|; wv\)/i;

/**
 * Whether to send this browser through a redirect instead of a popup.
 *
 * An iPad in desktop mode reports itself as a Macintosh, so touch points are
 * the tell-tale there; a real Mac reports 0.
 */
export const prefersRedirectSignIn = (userAgent = '', maxTouchPoints = 0) => {
  const ua = String(userAgent || '');
  if (IN_APP.test(ua)) return true;
  if (MOBILE.test(ua)) return true;
  return /Macintosh/i.test(ua) && Number(maxTouchPoints) > 1;
};

/** Errors that mean "the popup never worked", as opposed to "the user closed it". */
const POPUP_FAILURES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/cancelled-popup-request'
]);

export const shouldRetryWithRedirect = (error) => POPUP_FAILURES.has(error?.code || '');

/**
 * Google refuses OAuth from an insecure origin, with localhost the one
 * exception. Opening the dev server from a phone over the office wifi means an
 * address like http://192.168.1.5:3000, where sign-in cannot work no matter
 * which browser is used, and the raw Firebase error does not say so.
 */
export const isSecureOriginForAuth = ({ protocol = '', hostname = '' } = {}) =>
  protocol === 'https:' ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname === '::1';

export const insecureOriginMessage = ({ protocol = '', hostname = '', port = '' } = {}) => {
  const shown = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  /*
   * Deliberately "may refuse" rather than "will refuse". Whether a given
   * address works is Google's call, and an earlier version of this text was
   * certain enough to justify blocking the button, which is how a warning
   * turned into the thing standing between an officer and their own dashboard.
   */
  return (
    `Google sign-in may refuse this address. The page is on ${shown}, and Google accepts ` +
    `https addresses, or localhost. If you are testing from a phone, add ${hostname || 'it'} ` +
    'under Firebase, Authentication, Authorized domains, then try the button anyway.'
  );
};

/**
 * The unhelpful half of auth/unauthorized-domain is that it never names the
 * domain, so nobody knows what to paste into the console.
 */
export const unauthorizedDomainMessage = (hostname = '') =>
  `Google sign-in is not allowed from ${hostname || 'this address'}. Add it under Firebase ` +
  'Console, Authentication, Settings, Authorized domains, then try again.';

/**
 * Whether a redirect sign-in can hand the result back to the app.
 *
 * Firebase completes a redirect on the authDomain origin and then passes the
 * credential to the app. When those are two different origins, every browser
 * that partitions third-party storage (Chrome, including on Android, plus
 * Safari and Firefox) refuses to let the second read what the first wrote. The
 * visible symptom is the whole flow appearing to work and then simply not
 * signing anyone in.
 */
export const redirectCanReturn = ({ hostname = '', authDomain = '' } = {}) => {
  const host = String(hostname || '').toLowerCase();
  const domain = String(authDomain || '').toLowerCase().replace(/^https?:\/\//, '');
  if (!host || !domain) return true;
  // localhost is exempt: the SDK keeps the whole flow on the one origin there.
  if (host === 'localhost' || host === '127.0.0.1') return true;
  return host === domain;
};

export const redirectLostMessage = ({ hostname = '', authDomain = '' } = {}) =>
  `Sign-in came back without an account. This site is ${hostname || 'on one domain'} but ` +
  `Firebase completes sign-in on ${authDomain || 'another domain'}, and the browser will not ` +
  'let one read the other. Set REACT_APP_FIREBASE_AUTH_DOMAIN to ' +
  `${hostname || 'this site'} and deploy again.`;

/**
 * A redirect that came back with nobody signed in, when the app and the
 * handler DO share an origin, so the cross-origin explanation does not apply.
 *
 * Kept deliberately vague about the cause. The earlier version of this text
 * named cross-origin storage whatever had actually gone wrong, and printed
 * "this site is X but Firebase completes sign-in on X" at a council officer
 * whose real problem was an unregistered redirect URI. A confident wrong
 * diagnosis is worse than an honest short one.
 */
export const redirectFailedMessage = () =>
  'Sign-in did not finish, so nothing was signed in. If you closed or cancelled the Google ' +
  'screen, that is all this is. Otherwise try again, and if it keeps happening the sign-in ' +
  'settings for this site need checking.';
