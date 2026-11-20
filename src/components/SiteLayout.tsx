import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NOT_FOUND_META, PUBLIC_PAGES } from '../meta';
import { Icon } from './Icon';
import { SpiralBackdrop } from './SpiralBackdrop';

export function Wordmark() {
  return (
    <span className="wordmark">
      Neophi<i aria-hidden="true" />
    </span>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === 'light' || set === 'dark' ? set : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('neophi.theme', next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={flip} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

const NAV = [
  { to: '/connect', label: 'Connect' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/trust', label: 'Trust' },
  { to: '/compare', label: 'Compare' },
  { to: '/how-we-measure', label: 'How we measure' },
];

export function SiteLayout() {
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const revealRef = useRef<HTMLElement>(null);

  // Sections below the first screen arrive as they scroll into view. The attribute is added here,
  // so without script (or with reduced motion) nothing is ever hidden.
  useEffect(() => {
    const main = revealRef.current;
    if (!main || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const sections = [...main.querySelectorAll<HTMLElement>(':scope > * > section, :scope > section')].slice(1);
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            watcher.unobserve(entry.target);
          }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    for (const s of sections) {
      if (s.getBoundingClientRect().top < window.innerHeight) continue;
      s.setAttribute('data-reveal', '');
      watcher.observe(s);
    }
    return () => watcher.disconnect();
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    const meta = PUBLIC_PAGES.find((p) => p.path === pathname) ?? NOT_FOUND_META;
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', new URL(meta.path, window.location.origin).href);
    for (const key of ['og:title', 'twitter:title']) document.querySelector('meta[property="' + key + '"], meta[name="' + key + '"]')?.setAttribute('content', meta.title);
    for (const key of ['og:description', 'twitter:description']) document.querySelector('meta[property="' + key + '"], meta[name="' + key + '"]')?.setAttribute('content', meta.description);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', new URL(meta.path, window.location.origin).href);
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-head">
        <div className="wrap site-head-in">
          <Link to="/" className="brand" aria-label="Neophi, home">
            <Wordmark />
            <span className="stamp">Prototype</span>
          </Link>
          <nav className={`site-nav${open ? ' is-open' : ''}`} aria-label="Site" id="site-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="site-head-end">
            <ThemeToggle />
            <a className="btn btn-small" href="/app">
              Open the app
            </a>
            <button type="button" className="icon-btn nav-toggle" aria-expanded={open} aria-controls="site-nav" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
              <Icon name={open ? 'x' : 'menu'} />
            </button>
          </div>
        </div>
      </header>
      <SpiralBackdrop />
      <main id="main" ref={revealRef} className="pf-main">
        <Outlet />
      </main>
      <footer className="site-foot">
        <div className="wrap site-foot-in">
          <div>
            <Wordmark />
            <p>A memory layer for what you save online. This is a prototype: sample saves are invented, and the AI is a mock unless you run the local Gemini server.</p>
          </div>
          <nav aria-label="Product">
            <h2>Product</h2>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}>
                {n.label}
              </Link>
            ))}
            <a href="/app">Open the app</a>
          </nav>
          <nav aria-label="Legal">
            <h2>Your data</h2>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/data-deletion">Data deletion</Link>
          </nav>
        </div>
        <p className="wrap site-foot-note">Neophi prototype, November 2026. No analytics, no third-party scripts, no tracking.</p>
      </footer>
    </>
  );
}
