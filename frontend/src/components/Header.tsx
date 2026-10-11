import { useState } from 'react';
import { request } from '../api/client';
import { Accessibility } from './Accessibility';
import logo from '../../../assets/logo-1-web.png';

export function Header() {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  async function reset() {
    setResetting(true);
    setError('');
    try {
      await request('/session', 'DELETE', {});
      window.location.assign('/');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Your data could not be reset. Please try again.',
      );
      setResetting(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="RecurrSave home">
          <img
            className="brand-logo"
            src={logo}
            alt="Nest by Starling Engine"
            width={1200}
            height={538}
          />
          <small>RecurrSave · Small saves. Big possibilities.</small>
        </a>
        <div className="header-actions">
          <span className="demo-badge">
            <span className="status-dot" /> Hackathon demo
          </span>
          <Accessibility />
          <button
            type="button"
            className="reset-button"
            disabled={resetting}
            onClick={() => void reset()}
            title="Delete your current data and return to the first page"
          >
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        </div>
      </header>
      {error && (
        <div className="reset-error error-box" role="alert">
          {error} Your current page is still open. Try Reset again.
        </div>
      )}
    </>
  );
}
