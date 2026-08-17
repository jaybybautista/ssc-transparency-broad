import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import './ErrorBoundary.css';

/**
 * Catches render errors so one broken component does not blank the whole board.
 *
 * React unmounts the entire tree when a render throws, which is why an
 * unguarded app goes completely white. This catches the throw and renders a
 * message the student can act on instead.
 *
 * `scope` names what failed, so a boundary around one section can say "this
 * section" while the outer one says "the board".
 *
 * Note what this does NOT catch, so nobody is surprised later: errors thrown
 * inside event handlers, promise rejections, and errors from browser extensions
 * (the `window.ethereum` crash reported from a phone came from a crypto wallet
 * extension, not from this code). Those never pass through React's render, so
 * they cannot be caught here — the window-level handler in index.js is what
 * keeps those from surfacing as a dev-server overlay.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as a console error so it is still visible in DevTools and in
    // whatever logging is added later.
    console.error(`Render error in ${this.props.scope || 'the app'}:`, error, info?.componentStack);
  }

  handleRetry = () => {
    // Clearing the error remounts the children. Enough for a transient failure
    // (a bad network response, a half-loaded document); a genuine bug will
    // simply throw again, which is the honest outcome.
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, scope, compact } = this.props;

    if (!error) return children;

    return (
      <div className={`error-boundary ${compact ? 'compact' : ''}`} role="alert">
        <FiAlertTriangle className="error-boundary-icon" />
        <h2>{scope ? `${scope} could not be displayed` : 'Something went wrong'}</h2>
        <p>
          {scope
            ? 'The rest of the board is still working — you can go back and try another section.'
            : 'The page hit an unexpected error. Reloading usually clears it.'}
        </p>

        <div className="error-boundary-actions">
          <button type="button" className="btn-primary" onClick={this.handleRetry}>
            <FiRefreshCw /> Try again
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
            <FiRefreshCw /> Reload the page
          </button>
          <a className="error-boundary-home" href="/">
            <FiHome /> Back to the board
          </a>
        </div>

        {/* The message is shown because this board is maintained by students who
            will be the ones reporting the fault — "it says X" is far more
            useful to them than "it broke". The stack stays in the console. */}
        <details className="error-boundary-details">
          <summary>Technical details</summary>
          <code>{error.message || String(error)}</code>
        </details>
      </div>
    );
  }
}

export default ErrorBoundary;
