import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLock, FiUser, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { AuthContext } from '../../App';
import sscLogo from '../../assets/ssc_logo.svg';
import psuLogo from '../../assets/psu_logo.svg';
import './AdminLogin.css';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  // Demo credentials - In production, this would be handled by a backend
  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'ssc2026'
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      if (
        credentials.username === ADMIN_CREDENTIALS.username &&
        credentials.password === ADMIN_CREDENTIALS.password
      ) {
        setIsAdmin(true);
        localStorage.setItem('ssc_admin_auth', 'true');
        navigate('/admin/dashboard');
      } else {
        setError('Invalid username or password. Please try again.');
      }
      setIsLoading(false);
    }, 1000);
  };

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
          <p>Sign in to access the PSU-UCC SSC Virtual Board admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <FiUser /> Username
            </label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiLock /> Password
            </label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* <div className="login-footer">
          <p>For demo purposes:</p>
          <p><strong>Username:</strong> admin</p>
          <p><strong>Password:</strong> ssc2026</p>
        </div> */}
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
