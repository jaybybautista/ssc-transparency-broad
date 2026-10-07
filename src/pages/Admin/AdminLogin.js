import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft, FiLogOut, FiShield } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useVoterAuth } from '../../context/VoterAuthContext';
import { insecureOriginMessage, isSecureOriginForAuth } from '../../lib/authEnvironment';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import './AdminLogin.css';

/**
 * Admin sign-in.
 *
 * This used to check a hardcoded username and password in the browser and
 * remember the result as a localStorage flag. That could not be verified by
 * Firestore, which is why the security rules had to leave every content
 * collection writable by anyone holding the API key — and the key ships inside
 * the public JavaScript bundle.
 *
 * Now an officer signs in with Google and the server decides: access is granted
 * only if their Firebase Auth uid has a document in the `admins` collection. The
 * same check runs inside firestore.rules, so it holds against a script talking
 * straight to the database, not just against this screen.
 */
const AdminLogin = () => {
  const { voter, signIn, signOut, isSscAdmin, isCheckingAdmin, isAuthLoading, authError, authNotice } = useVoterAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  // Shown on arrival rather than only after a failed tap, so nobody wonders
  // why the button did nothing. It does not disable anything.
  const originNotice = useMemo(
    () => (isSecureOriginForAuth(window.location) ? '' : insecureOriginMessage(window.location)),
    []
  );

  // Already verified — go straight through.
  useEffect(() => {
    if (isSscAdmin) navigate('/admin/dashboard', { replace: true });
  }, [isSscAdmin, navigate]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    // The school-domain allow-list applies to student voting, not to officers,
    // who may well be using a personal Google account.
    await signIn({ enforceVoteDomain: false });
    setIsSigningIn(false);
  };

  const isBusy = isSigningIn || isAuthLoading || isCheckingAdmin;

  // Signed in, but this account is not on the roster.
  const isRejected = Boolean(voter) && !isSscAdmin && !isCheckingAdmin && !isAuthLoading;

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <Link to="/" className="back-to-home">
          <FiArrowLeft />
          <span>Back to Home</span>
        </Link>
        <div className="login-header">
          <div className="login-logo">
            <img src={sscLogo} alt="SSC Logo" className="login-logo-img" />
            <img src={psuLogo} alt="PSU Logo" className="login-logo-img" />
          </div>
          <h1>Admin Portal</h1>
          <p>Sign in with your Google account to manage the PSU-UCC SSC Virtual Board</p>
        </div>

        <div className="login-form">
          {!!authError && (
            <div className="error-message">
              <FiAlertCircle />
              <span>{authError}</span>
            </div>
          )}

          {/* A caution, not a refusal: the button below still works. */}
          {!!(authNotice || originNotice) && (
            <div className="notice-message">
              <FiAlertCircle />
              <span>{authNotice || originNotice}</span>
            </div>
          )}

          {isRejected ? (
            <>
              <div className="login-rejected">
                <FiShield />
                <div>
                  <strong>This account does not have admin access.</strong>
                  <p>
                    You are signed in as <b>{voter.email}</b>, but it is not on the officer
                    roster. Ask whoever manages the board to add your account, then sign in
                    again.
                  </p>
                </div>
              </div>

              <button type="button" className="login-btn secondary" onClick={signOut}>
                <FiLogOut /> Sign out and try another account
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`login-btn google ${isBusy ? 'loading' : ''}`}
                onClick={handleSignIn}
                disabled={isBusy}
              >
                <FcGoogle />
                {isBusy ? 'Checking your access…' : 'Sign in with Google'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="login-bg">
        <div className="bg-pattern"></div>
        <div className="bg-content">
          <h2>Welcome to PSU-UCC SSC Admin</h2>
          <p>Manage announcements, events, and all SSC resources from one central dashboard. A.Y. 2025-2026</p>
          <ul>
            <li>✓ Post and manage announcements</li>
            <li>✓ Update calendar events</li>
            <li>✓ Manage resolutions and documents</li>
            <li>✓ Track accomplishments</li>
            <li>✓ Handle request letters</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
