// The 3D spiral behind the public site: sample saves ride arms out of the centre, born small and
// blurred, growing sharp as they travel. Dark theme only (the light theme keeps the quiet paper look).
// three.js and the engine load after the page is ready, so the first paint never waits for them.
import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Scene, type SceneId } from './Scene';

const CARDS: { scene: SceneId; label: string }[] = [
  { scene: 'dance', label: 'the red shirt' },
  { scene: 'paneer', label: 'Sunday ko banana hai' },
  { scene: 'shack', label: 'go before sunset' },
  { scene: 'scooter', label: 'is raste se jaana hai' },
  { scene: 'quote', label: 'hook structure' },
  { scene: 'chai', label: 'no note, weak signal' },
  { scene: 'desk', label: 'lamp ka angle' },
  { scene: 'drape', label: 'second style for mehendi' },
  { scene: 'dosa', label: 'try this weekend' },
  { scene: 'cafe', label: 'poi bread wali jagah' },
  { scene: 'shelf', label: 'for the balcony' },
];

/** A crisp picture of a sample scene, drawn at any size, as a data address the engine can load. */
function sceneUrl(id: SceneId) {
  const markup = renderToStaticMarkup(<Scene id={id} />);
  // An explicit size (8 times the drawing) so the browser decodes it sharp; without it the picture can come out blank.
  const sized = markup.replace(/<svg([^>]*?)(width="[^"]*"|height="[^"]*")/g, '<svg$1').replace('<svg', '<svg width="800" height="1000"');
  const svg = sized.includes('xmlns=') ? sized : sized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type Handle = { setPaused: (paused: boolean) => void; destroy: () => void; supported: boolean };

export function SpiralBackdrop() {
  const handle = useRef<Handle | null>(null);
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;

    const stop = () => {
      handle.current?.destroy();
      handle.current = null;
      root.removeAttribute('data-spiral-on');
      setOn(false);
    };
    const start = async () => {
      if (handle.current || root.dataset.theme !== 'dark') return;
      const { mountSpiral } = await import('../lib/spiral');
      if (cancelled || handle.current || root.dataset.theme !== 'dark') return;
      const host = document.getElementById('root');
      if (!host) return;
      const spiral = mountSpiral(host, {
        fixed: true,
        still: calm,
        keepOut: 'main h1, main h2, main h3, main p, main .hero-desk, main .btn, .site-head',
        cards: CARDS.map((c) => ({ id: c.scene, label: c.label, kind: 'image' as const, src: sceneUrl(c.scene) })),
        settings: {
          look: { paper: '#16130f', line: '#5a5042', guide: '#ff6a47', guideAlpha: 0.34, cornerPx: 14 },
          keepOut: { padPx: 14, bandPx: 60, ghost: 0.3 },
        },
      });
      if (!spiral.supported) return;
      handle.current = spiral;
      root.setAttribute('data-spiral-on', '');
      setOn(true);
      setPaused(calm);
    };

    const first = window.setTimeout(() => void start(), 500);
    // Follow the theme toggle: the spiral shows only on dark.
    const watcher = new MutationObserver(() => (root.dataset.theme === 'dark' ? void start() : stop()));
    watcher.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      watcher.disconnect();
      stop();
    };
  }, []);

  if (!on) return null;
  return (
    <button
      type="button"
      className="spiral-pause"
      onClick={() => {
        const next = !paused;
        handle.current?.setPaused(next);
        setPaused(next);
      }}
    >
      {paused ? 'Play background' : 'Pause background'}
    </button>
  );
}
