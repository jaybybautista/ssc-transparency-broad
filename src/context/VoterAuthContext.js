import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { allowedVoteDomains, auth, db, isFirebaseEnabled } from '../lib/firebase';
import {
  insecureOriginMessage,
  isSecureOriginForAuth,
  prefersRedirectSignIn,
  redirectCanReturn,
  redirectFailedMessage,
  redirectLostMessage,
  shouldRetryWithRedirect,
  unauthorizedDomainMessage
} from '../lib/authEnvironment';

/** Where the app is, and where Firebase finishes a redirect sign-in. */
const authOrigins = () => ({
  hostname: window.location.hostname,
  authDomain: auth?.config?.authDomain || ''
});

/*
 * A redirect leaves the page entirely and comes back to a fresh load, so
 * whether the vote domain rule applied has to survive the round trip. Session
 * storage, not local: the answer belongs to this one sign-in attempt.
 */
const REDIRECT_INTENT_KEY = 'ssc.auth.enforceVoteDomain';

const VoterAuthContext = createContext(null);

export const emailDomain = (email) => (email || '').split('@')[1]?.toLowerCase() || '';

export const isDomainAllowed = (email) => {
  if (!allowedVoteDomains.length) return true;
  return allowedVoteDomains.includes(emailDomain(email));
};

const rejectedDomainMessage = () =>
  `Only ${allowedVoteDomains.map((domain) => `@${domain}`).join(' or ')} accounts may vote. ` +
  'Please sign in with your school Google account.';

/** Turns a Firebase auth error into something the person reading it can act on. */
const describeAuthError = (error) => {
  const code = error?.code || '';
  if (code === 'auth/unauthorized-domain') {
    return unauthorizedDomainMessage(window.location.hostname);
  }
  if (code === 'auth/network-request-failed') {
    return 'Google sign-in could not reach the network. Check the connection and try again.';
  }
  if (code === 'auth/popup-blocked') {
    return 'The browser blocked the sign-in window. Allow pop-ups for this site, or try again.';
  }
  return error?.message || 'Google sign-in failed. Please try again.';
};

export const VoterAuthProvider = ({ children }) => {
  const [voter, setVoter] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseEnabled);
  const [authError, setAuthError] = useState('');
  /*
   * Something worth saying before an attempt, that must not stop it. The
   * insecure-origin rule started life as a hard block here and became the
   * thing standing between an officer and their own admin page, which is worse
   * than the confusing error it was meant to replace. Warn, then get out of
   * the way.
   */
  const [authNotice, setAuthNotice] = useState('');
  // True when the signed-in Google account has a document in the `admins`
  // collection. This is what firestore.rules checks before releasing student
  // tickets and suggestions, which contain personal information.
  const [isSscAdmin, setIsSscAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  useEffect(() => {
    if (!isFirebaseEnabled || !auth) {
      setIsAuthLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setVoter(
        user
          ? {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              emailVerified: user.emailVerified
            }
          : null
      );
      setIsAuthLoading(false);
    });
  }, []);

  /*
   * Coming back from a redirect sign-in.
   *
   * The popup path returns its user inline; a redirect cannot, because the page
   * was unloaded mid-way. This is where a phone's sign-in actually completes.
   */
  useEffect(() => {
    if (!isFirebaseEnabled || !auth) return;

    let cancelled = false;
    getRedirectResult(auth)
      .then(async (result) => {
        if (cancelled) return;

        if (!result?.user) {
          /*
           * A redirect was started and we are back with nothing. Firebase
           * finishes on the authDomain origin and hands the credential to the
           * app; when those differ, the browser's storage partitioning throws
           * it away and the whole thing fails in complete silence. Saying so
           * is the difference between a bug report and a fix.
           */
          let attempted = false;
          try {
            attempted = window.sessionStorage.getItem(REDIRECT_INTENT_KEY) !== null;
            if (attempted) window.sessionStorage.removeItem(REDIRECT_INTENT_KEY);
          } catch {
            /* Storage refused; nothing to report either way. */
          }
          if (attempted && !auth.currentUser) {
            // Only blame the two-origin split when there actually is one.
            // Anything else gets the short honest version.
            const origins = authOrigins();
            setAuthError(
              redirectCanReturn(origins) ? redirectFailedMessage() : redirectLostMessage(origins)
            );
          }
          return;
        }

        let enforceVoteDomain = true;
        try {
          enforceVoteDomain = window.sessionStorage.getItem(REDIRECT_INTENT_KEY) !== '0';
          window.sessionStorage.removeItem(REDIRECT_INTENT_KEY);
        } catch {
          /* Storage refused; the stricter rule is the safe default. */
        }

        if (enforceVoteDomain && !isDomainAllowed(result.user.email)) {
          await firebaseSignOut(auth);
          if (!cancelled) setAuthError(rejectedDomainMessage());
        }
      })
      .catch((error) => {
        if (!cancelled) setAuthError(describeAuthError(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-check admin membership whenever the signed-in account changes.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!voter?.uid || !db) {
        setIsSscAdmin(false);
        return;
      }
      setIsCheckingAdmin(true);
      try {
        const snapshot = await getDoc(doc(db, 'admins', voter.uid));
        if (!cancelled) setIsSscAdmin(snapshot.exists());
      } catch (error) {
        // A denied read simply means "not an admin".
        if (!cancelled) setIsSscAdmin(false);
      } finally {
        if (!cancelled) setIsCheckingAdmin(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [voter?.uid]);

  /**
   * @param {object}  [options]
   * @param {boolean} [options.enforceVoteDomain=true]
   *   The school-domain allow-list exists for student voting. Admin sign-in
   *   (to read tickets) must not be subject to it, since officers may use a
   *   personal Google account.
   */
  const signIn = async ({ enforceVoteDomain = true } = {}) => {
    if (!isFirebaseEnabled || !auth) {
      setAuthError('Google sign-in is unavailable because the cloud database is not configured.');
      return null;
    }

    /*
     * Two cautions, said up front and never blocking. The address one because
     * Google's own error does not name the part that is wrong; the origin one
     * because a redirect across two domains fails without saying anything at
     * all, which is the worst way for sign-in to break.
     */
    const origins = authOrigins();
    if (!isSecureOriginForAuth(window.location)) {
      setAuthNotice(insecureOriginMessage(window.location));
    } else if (!redirectCanReturn(origins) && prefersRedirectSignIn(window.navigator.userAgent, window.navigator.maxTouchPoints)) {
      setAuthNotice(redirectLostMessage(origins));
    } else {
      setAuthNotice('');
    }

    setAuthError('');
    const provider = new GoogleAuthProvider();
    // Always show the account chooser so a shared computer can't silently
    // re-use the previous student's session.
    provider.setCustomParameters({ prompt: 'select_account' });

    const goByRedirect = async () => {
      try {
        window.sessionStorage.setItem(REDIRECT_INTENT_KEY, enforceVoteDomain ? '1' : '0');
      } catch {
        /* Private browsing can refuse this; the rule then defaults to on. */
      }
      await signInWithRedirect(auth, provider);
      // The page navigates away here. Whatever comes back is picked up by the
      // getRedirectResult effect above.
      return null;
    };

    /*
     * Phones and in-app browsers go straight to a redirect. A popup there is
     * blocked outright or opens somewhere this page never hears back from,
     * which is precisely why the admin side could not be opened from a phone.
     */
    if (prefersRedirectSignIn(window.navigator.userAgent, window.navigator.maxTouchPoints)) {
      try {
        return await goByRedirect();
      } catch (error) {
        setAuthError(describeAuthError(error));
        return null;
      }
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (enforceVoteDomain && !isDomainAllowed(user.email)) {
        await firebaseSignOut(auth);
        setAuthError(rejectedDomainMessage());
        return null;
      }

      return user;
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user') return null;

      // A desktop browser can still block the popup: an extension, or a strict
      // setting. Falling back keeps sign-in possible instead of dead.
      if (shouldRetryWithRedirect(error)) {
        try {
          return await goByRedirect();
        } catch (redirectError) {
          setAuthError(describeAuthError(redirectError));
          return null;
        }
      }

      setAuthError(describeAuthError(error));
      return null;
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setAuthError('');
  };

  const value = useMemo(
    () => ({
      voter,
      isAuthLoading,
      authError,
      authNotice,
      setAuthError,
      signIn,
      signOut,
      isVotingAvailable: isFirebaseEnabled,
      allowedVoteDomains,
      isSscAdmin,
      isCheckingAdmin
    }),
    [voter, isAuthLoading, authError, authNotice, isSscAdmin, isCheckingAdmin]
  );

  return <VoterAuthContext.Provider value={value}>{children}</VoterAuthContext.Provider>;
};

export const useVoterAuth = () => {
  const context = useContext(VoterAuthContext);
  if (!context) {
    throw new Error('useVoterAuth must be used within VoterAuthProvider');
  }
  return context;
};
