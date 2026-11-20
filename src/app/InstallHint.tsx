import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let visitCount: number | undefined;
export function InstallHint() {
  const [eligible, setEligible] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    try {
      if (visitCount === undefined) {
        visitCount = Number(localStorage.getItem('neophi.visits') || 0) + 1;
        localStorage.setItem('neophi.visits', String(visitCount));
      }
      if (visitCount !== 2 || localStorage.getItem('neophi.install-dismissed') || matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
      setEligible(true);
      setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent));
    } catch { return; }
    const offered = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const installed = () => setEligible(false);
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', offered); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (!eligible || (!prompt && !ios)) return null;
  const dismiss = () => { setEligible(false); try { localStorage.setItem('neophi.install-dismissed', 'yes'); } catch { /* session only */ } };
  return <aside className="install-hint index-card" aria-label="Install app"><p><b>Add to home screen</b></p>{ios ? <p>In Safari, tap Share, then Add to Home Screen.</p> : <button className="btn btn-small" onClick={async () => { if (prompt) { await prompt.prompt(); await prompt.userChoice; dismiss(); } }}>Install on this device</button>} <button className="btn btn-small btn-quiet" onClick={dismiss}>Dismiss</button></aside>;
}
