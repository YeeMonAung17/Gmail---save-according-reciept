import { useEffect, useState } from 'react';
import { request } from './api/client';
import type { DashboardResponse } from './api/types';
import { Header } from './components/Header';
import { Assistant } from './components/Assistant';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import mascot from '../../assets/logo-2-web.png';

export function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState('');

  async function refresh() {
    const result = await request<DashboardResponse>('/dashboard');
    setData(result);
    setError('');
  }

  async function load() {
    try {
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The app could not be loaded.',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <Header />
      {error ? (
        <main id="main-content" tabIndex={-1} className="loading-state">
          <div className="error-box" role="alert">
            {error}
          </div>
          <button className="button primary" onClick={() => void load()}>
            Try again
          </button>
        </main>
      ) : !data ? (
        <main
          id="main-content"
          tabIndex={-1}
          className="loading-state"
          aria-busy="true"
        >
          <p role="status">Getting your space ready…</p>
        </main>
      ) : data.onboarded ? (
        <Dashboard data={data} refresh={refresh} />
      ) : (
        <Onboarding date={data.date} onComplete={refresh} />
      )}
      <footer className="site-footer">
        <span className="footer-brand">
          <img src={mascot} alt="" width={512} height={512} />
          RecurrSave
        </span>
        <p>Every little save is a step forward.</p>
        <span>Built for possibility.</span>
      </footer>
      <Assistant />
    </>
  );
}
