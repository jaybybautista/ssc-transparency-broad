import {
  insecureOriginMessage,
  redirectCanReturn,
  redirectFailedMessage,
  redirectLostMessage,
  isSecureOriginForAuth,
  prefersRedirectSignIn,
  shouldRetryWithRedirect,
  unauthorizedDomainMessage
} from './authEnvironment';

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const FACEBOOK_IN_APP =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 FBAN/FBIOS;FBAV/440.0';
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36';
const FIREFOX_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';

describe('prefersRedirectSignIn', () => {
  it('redirects on Chrome for Android, which is what stopped the admin signing in', () => {
    // The whole reason for this module: a popup on a phone is blocked or opens
    // where the app never hears back from it.
    expect(prefersRedirectSignIn(CHROME_ANDROID)).toBe(true);
  });

  it('redirects on an iPhone', () => {
    expect(prefersRedirectSignIn(SAFARI_IPHONE)).toBe(true);
  });

  it('redirects inside an app browser, where a popup is never seen', () => {
    expect(prefersRedirectSignIn(FACEBOOK_IN_APP)).toBe(true);
    expect(prefersRedirectSignIn(ANDROID_WEBVIEW)).toBe(true);
  });

  it('keeps the popup on a desktop browser, where it works and is quicker', () => {
    /*
     * Desktop Chrome's string also ends in "Safari/537.36" but without
     * "Mobile", which is the only thing separating the two.
     */
    expect(prefersRedirectSignIn(CHROME_DESKTOP)).toBe(false);
    expect(prefersRedirectSignIn(FIREFOX_DESKTOP)).toBe(false);
    expect(prefersRedirectSignIn(SAFARI_MAC)).toBe(false);
  });

  it('catches an iPad in desktop mode, which claims to be a Macintosh', () => {
    expect(prefersRedirectSignIn(SAFARI_MAC, 5)).toBe(true);
    // A real Mac reports no touch points, even with a trackpad.
    expect(prefersRedirectSignIn(SAFARI_MAC, 0)).toBe(false);
  });

  it('does not throw on a missing user agent', () => {
    expect(prefersRedirectSignIn()).toBe(false);
    expect(prefersRedirectSignIn(undefined, undefined)).toBe(false);
  });
});

describe('shouldRetryWithRedirect', () => {
  it('retries when the popup never opened', () => {
    expect(shouldRetryWithRedirect({ code: 'auth/popup-blocked' })).toBe(true);
    expect(shouldRetryWithRedirect({ code: 'auth/operation-not-supported-in-this-environment' })).toBe(true);
    expect(shouldRetryWithRedirect({ code: 'auth/web-storage-unsupported' })).toBe(true);
  });

  it('does not retry when the user closed the popup themselves', () => {
    // Reopening sign-in on somebody who just cancelled it is a trap, not a fix.
    expect(shouldRetryWithRedirect({ code: 'auth/popup-closed-by-user' })).toBe(false);
  });

  it('does not retry a real failure such as a wrong domain', () => {
    expect(shouldRetryWithRedirect({ code: 'auth/unauthorized-domain' })).toBe(false);
    expect(shouldRetryWithRedirect({})).toBe(false);
    expect(shouldRetryWithRedirect(null)).toBe(false);
  });
});

describe('isSecureOriginForAuth', () => {
  it('accepts https anywhere', () => {
    expect(isSecureOriginForAuth({ protocol: 'https:', hostname: 'psussc2526.com' })).toBe(true);
  });

  it('accepts plain http only on localhost', () => {
    expect(isSecureOriginForAuth({ protocol: 'http:', hostname: 'localhost' })).toBe(true);
    expect(isSecureOriginForAuth({ protocol: 'http:', hostname: '127.0.0.1' })).toBe(true);
  });

  it('rejects the dev server reached over the office wifi', () => {
    /*
     * Opening http://192.168.1.5:3000 from a phone is the case this exists
     * for. It warns; it does not stop anyone trying.
     */
    expect(isSecureOriginForAuth({ protocol: 'http:', hostname: '192.168.1.5' })).toBe(false);
    expect(isSecureOriginForAuth({ protocol: 'http:', hostname: 'psussc2526.com' })).toBe(false);
  });

  it('does not crash on nothing', () => {
    expect(isSecureOriginForAuth()).toBe(false);
    expect(isSecureOriginForAuth({})).toBe(false);
  });
});

describe('the messages name the thing to fix', () => {
  it('prints the address in question and what to do about it', () => {
    const message = insecureOriginMessage({ protocol: 'http:', hostname: '192.168.1.5', port: '3000' });
    expect(message).toContain('http://192.168.1.5:3000');
    expect(message).toContain('Authorized domains');
  });

  it('hedges, because whether an address works is for Google to decide', () => {
    // The certain version of this sentence was used to disable the sign-in
    // button, which is a worse failure than the confusing error it replaced.
    const message = insecureOriginMessage({ protocol: 'http:', hostname: '192.168.1.5' });
    expect(message).toContain('may refuse');
    expect(message).not.toContain('will not');
  });

  it('omits an empty port rather than printing a stray colon', () => {
    expect(insecureOriginMessage({ protocol: 'http:', hostname: 'example.test' })).toContain(
      'http://example.test,'
    );
  });

  it('names the domain to add, which the Firebase error never does', () => {
    const message = unauthorizedDomainMessage('psussc2526.com');
    expect(message).toContain('psussc2526.com');
    expect(message).toContain('Authorized domains');
  });

  it('still reads properly when the hostname is unknown', () => {
    expect(unauthorizedDomainMessage('')).toContain('this address');
  });
});

describe('redirectCanReturn', () => {
  /*
   * The real failure: the site is served from ssc-virtual-board.web.app while
   * authDomain is ssc-virtual-board.firebaseapp.com. Chrome on Android
   * partitions third-party storage, so the credential written by the handler
   * on one origin is invisible to the app on the other. Picking a Google
   * account appears to work and then nothing happens.
   */
  it('spots the two-origin split that silently loses the sign-in', () => {
    expect(
      redirectCanReturn({
        hostname: 'ssc-virtual-board.web.app',
        authDomain: 'ssc-virtual-board.firebaseapp.com'
      })
    ).toBe(false);
  });

  it('is happy once the app and the handler share an origin', () => {
    expect(
      redirectCanReturn({
        hostname: 'ssc-virtual-board.web.app',
        authDomain: 'ssc-virtual-board.web.app'
      })
    ).toBe(true);
    expect(
      redirectCanReturn({ hostname: 'psussc2526.com', authDomain: 'psussc2526.com' })
    ).toBe(true);
  });

  it('leaves localhost alone, where the SDK keeps the flow on one origin', () => {
    expect(
      redirectCanReturn({ hostname: 'localhost', authDomain: 'x.firebaseapp.com' })
    ).toBe(true);
  });

  it('ignores case and a pasted scheme', () => {
    expect(
      redirectCanReturn({ hostname: 'Example.COM', authDomain: 'https://example.com' })
    ).toBe(true);
  });

  it('says nothing when it does not know both halves', () => {
    expect(redirectCanReturn({})).toBe(true);
    expect(redirectCanReturn()).toBe(true);
  });

  it('names both domains and the setting to change', () => {
    const message = redirectLostMessage({
      hostname: 'ssc-virtual-board.web.app',
      authDomain: 'ssc-virtual-board.firebaseapp.com'
    });
    expect(message).toContain('ssc-virtual-board.web.app');
    expect(message).toContain('ssc-virtual-board.firebaseapp.com');
    expect(message).toContain('REACT_APP_FIREBASE_AUTH_DOMAIN');
  });
});

describe('redirectFailedMessage', () => {
  it('does not name a cause it has not established', () => {
    /*
     * The bug this replaces: a redirect rejected by Google for an unregistered
     * redirect URI was reported as a cross-origin storage problem, printing
     * "this site is X but Firebase completes sign-in on X" with the same
     * domain twice.
     */
    const message = redirectFailedMessage();
    expect(message).not.toContain('browser will not let');
    expect(message).not.toContain('AUTH_DOMAIN');
    expect(message).toContain('did not finish');
  });
});
