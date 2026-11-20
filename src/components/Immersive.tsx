// Full-screen sections with a looping video behind them, the same pattern as the Naya Mindset home page:
// every part of a page is one screen tall and snaps into place, and the first screen rests a few seconds and then
// scrolls on by itself, once, unless the visitor moves first or asks for less motion.
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type VideoName = 'night_hero' | 'night_footer' | 'loop_scatter' | 'loop_lanes' | 'loop_evening' | 'loop_creator' | 'loop_traveller' | 'loop_student' | 'loop_today';

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A silent looping video that loads when it is near the screen and rests when it is not. Reduced motion keeps the still poster. */
export function BackdropVideo({ name, eager = false }: { name: VideoName; eager?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || calm()) return;
    const load = () => {
      if (!video.getAttribute('src')) video.src = `/video/${name}.mp4`;
    };
    if (eager) load();
    if (!('IntersectionObserver' in window)) {
      load();
      void video.play().catch(() => undefined);
      return;
    }
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          load();
          void video.play().catch(() => undefined);
        } else video.pause();
      },
      { rootMargin: '30% 0px' },
    );
    watcher.observe(video);
    return () => watcher.disconnect();
  }, [name, eager]);
  return <video ref={ref} className="pf-video" muted loop playsInline preload="none" poster={`/video/posters/${name}.webp`} aria-hidden="true" tabIndex={-1} />;
}

/** One screen of a page with its own video. "night" panels are dark whatever the theme; the others follow it. */
export function Panel({ video, tone = 'paper', id, label, className = '', children }: { video: VideoName; tone?: 'paper' | 'night'; id?: string; label?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`pf-panel pf-${tone} ${className}`.trim()} aria-label={label}>
      <BackdropVideo name={video} />
      <div className="pf-shade" aria-hidden="true" />
      <div className="pf-panel-in">{children}</div>
    </section>
  );
}

/** The top of an inner page: the page's title over its own video, full screen. */
export function PageIntro({ video, children }: { video: VideoName; children: ReactNode }) {
  return (
    <header className="page-head pf-panel pf-intro">
      <BackdropVideo name={video} />
      <div className="pf-shade" aria-hidden="true" />
      <div className="pf-panel-in pf-intro-in">{children}</div>
      <a className="pf-cue" href="#after-intro" onClick={cue}>
        Scroll
      </a>
    </header>
  );
}
/** Where the page continues after its intro screen. */
export const AfterIntro = () => <span id="after-intro" className="pf-after" />;

function cue(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const panel = (event.currentTarget as HTMLElement).closest('.pf-panel');
  if (panel) scrollTo({ top: panel.getBoundingClientRect().bottom + scrollY - 64, behavior: calm() ? 'auto' : 'smooth' });
}

/** The home page's first screen: the night video, three big lines, and the one gentle scroll on. */
export function HeroPanel() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ref.current;
    if (!section || calm()) return;
    try {
      if (sessionStorage.getItem('neophi.intro')) return; // once per visit
    } catch {
      /* private mode: it just runs once per page load */
    }
    let stopped = false;
    const stop = () => (stopped = true);
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    for (const name of events) addEventListener(name, stop, { once: true, passive: true });
    const timer = window.setTimeout(() => {
      for (const name of events) removeEventListener(name, stop);
      if (stopped || scrollY > 8) return;
      try {
        sessionStorage.setItem('neophi.intro', '1');
      } catch {
        /* nothing to remember */
      }
      scrollTo({ top: section.getBoundingClientRect().bottom + scrollY - 64, behavior: 'smooth' });
    }, 6500);
    return () => {
      window.clearTimeout(timer);
      for (const name of events) removeEventListener(name, stop);
    };
  }, []);
  return (
    <section ref={ref} className="pf-panel pf-night pf-hero-panel" aria-label="Neophi">
      <video className="pf-video" muted loop playsInline autoPlay preload="auto" poster="/video/posters/night_hero.webp" src="/video/night_hero.mp4" aria-hidden="true" tabIndex={-1} />
      <div className="pf-shade" aria-hidden="true" />
      <div className="pf-panel-in pf-hero-words">
        <h1>
          <span className="pf-line pf-small">You saved it for a reason,</span>
          <span className="pf-line pf-big">Remember why</span>
          <span className="pf-line pf-accent">not just what.</span>
        </h1>
        <p className="pf-hero-sub">Neophi keeps each Reel or post with your own words about why, and brings it back when you can use it.</p>
        <p className="pf-hero-cta">
          <Link className="btn btn-primary" to="/connect">
            Save your first Reel
          </Link>
          <a className="btn pf-ghost" href="#reason-demo">
            See the difference
          </a>
        </p>
      </div>
      <a className="pf-cue" href="#after-hero" onClick={cue}>
        Scroll
      </a>
    </section>
  );
}
