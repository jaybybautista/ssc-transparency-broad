import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { allowedVoteDomains, auth, db, isFirebaseEnabled } from '../lib/firebase';

const VoterAuthContext = createContext(null);

export const emailDomain = (email) => (email || '').split('@')[1]?.toLowerCase() || '';

export const isDomainAllowed = (email) => {
  if (!allowedVoteDomains.length) return true;
  return allowedVoteDomains.includes(emailDomain(email));
};

export const VoterAuthProvider = ({ children }) => {
  const [voter, setVoter] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseEnabled);
  const [authError, setAuthError] = useState('');
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

    setAuthError('');
    const provider = new GoogleAuthProvider();
    // Always show the account chooser so a shared computer can't silently
    // re-use the previous student's session.
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (enforceVoteDomain && !isDomainAllowed(user.email)) {
        await firebaseSignOut(auth);
        setAuthError(
          `Only ${allowedVoteDomains.map((d) => `@${d}`).join(' or ')} accounts may vote. ` +
            'Please sign in with your school Google account.'
        );
        return null;
      }

      return user;
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        return null;
      }
      if (error?.code === 'auth/unauthorized-domain') {
        setAuthError('This site is not an authorised domain in Firebase Authentication settings.');
        return null;
      }
      setAuthError(error?.message || 'Google sign-in failed. Please try again.');
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
      setAuthError,
      signIn,
      signOut,
      isVotingAvailable: isFirebaseEnabled,
      allowedVoteDomains,
      isSscAdmin,
      isCheckingAdmin
    }),
    [voter, isAuthLoading, authError, isSscAdmin, isCheckingAdmin]
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
