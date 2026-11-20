import '../styles/app.css';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ThemeToggle, Wordmark } from '../components/SiteLayout';
import { storageFailed, useStore } from '../store/store';
import { CommandPalette } from './CommandPalette';
import { Detail } from './Detail';
import { InboxSync } from './InboxSync';
import { Today } from './Today';
import { DeviceReminders } from './DeviceReminders';
import { InstallHint } from './InstallHint';
import { Library } from './Library';
import { Onboarding } from './Onboarding';
import { ProjectDetail, Projects } from './Projects';
import { SearchPage } from './SearchPage';
import { SettingsPage } from './SettingsPage';
import { EmptyState, ToastContext } from './ui';

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function AppRoot() {
  const state = useStore();
  const online = useOnline();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  const [q, setQ] = useState('');

  useEffect(() => {
    document.title = 'Neophi: Today and your library';
  }, []);
  useEffect(() => {
    if (!pathname.startsWith('/app/m/')) window.scrollTo(0, 0);
  }, [pathname]);

  if (!state.onboarded && !pathname.startsWith('/app/capture')) return <><InstallHint /><Onboarding /></>;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/app/search?q=${encodeURIComponent(q)}`);
  };
  const projectsOn = state.settings.features.projects;

  return (
    <ToastContext.Provider value={notify}>
      <div className="app">
        <a className="skip" href="#app-main">
          Skip to content
        </a>
        <header className="app-bar">
          <a href="/" className="brand" aria-label="Neophi, back to the site">
            <Wordmark />
          </a>
          <form className="app-search" role="search" onSubmit={onSearch}>
            <Icon name="search" />
            <input className="input" type="search" placeholder="Half remember it? red shirt dance last month" aria-label="Search your library" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <nav className="app-nav" aria-label="App">
            <NavLink to="/app/today"><Icon name="sun" /><span>Today</span></NavLink>
            <NavLink to="/app/library">
              <Icon name="grid" />
              <span>Library</span>
            </NavLink>
            <NavLink to="/app/search">
              <Icon name="search" />
              <span>Search</span>
            </NavLink>
            <Link to="/app/capture" className="app-nav-add">
              <Icon name="plus" />
              <span>Save</span>
            </Link>
            {projectsOn && (
              <NavLink to="/app/projects">
                <Icon name="flag" />
                <span>Projects</span>
              </NavLink>
            )}
            <NavLink to="/app/settings">
              <Icon name="settings" />
              <span>Settings</span>
            </NavLink>
          </nav>
          <button type="button" className="palette-open" onClick={() => window.dispatchEvent(new Event('neophi:palette'))} aria-label="Open the command palette">
            <kbd>Ctrl K</kbd>
          </button>
          <ThemeToggle />
        </header>

        {!online && (
          <p className="app-banner" role="status">
            <Icon name="offline" /> You are offline. Your library is on this device, so everything here still works. The Gemini server is not reachable until you are back online.
          </p>
        )}
        {storageFailed && (
          <p className="app-banner app-banner-warn" role="alert">
            <Icon name="question" /> This browser is not letting Neophi store data (storage is full or blocked). You can keep working, but nothing will be here after you close the tab. Export from Settings to keep a copy.
          </p>
        )}

        <main id="app-main" className="app-main">
          <Routes>
            <Route index element={state.memories.length ? <Navigate to="/app/today" replace /> : <Library capture={false} />} />
            <Route path="today" element={<Today />} />
            <Route path="library" element={<Library capture={false} />} />
            <Route path="capture" element={<Library capture />} />
            <Route path="m/:id" element={<Detail />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <EmptyState title="Nothing at this address" icon="question">
                  <p>That part of the app does not exist.</p>
                  <Link className="btn" to="/app">
                    Back to the library
                  </Link>
                </EmptyState>
              }
            />
          </Routes>
        </main>

        <InstallHint />
        <DeviceReminders />
        <CommandPalette />
        <InboxSync notify={notify} />

        <div className="toast-region" aria-live="polite">
          {toast && <p className="toast">{toast}</p>}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
