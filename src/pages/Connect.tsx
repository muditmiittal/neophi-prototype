import { useEffect, useState } from 'react';
import { PageIntro } from '../components/Immersive';
import { Link } from 'react-router-dom';

export function Connect() {
  const [reachable, setReachable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
        const data: unknown = await response.json();
        if (!controller.signal.aborted) setReachable(response.ok && !!data && typeof data === 'object' && 'ok' in data && data.ok === true);
      } catch { if (!controller.signal.aborted) setReachable(false); }
    };
    void check();
    const timer = setInterval(() => void check(), 30_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  return <div className="page wrap connect">
    <PageIntro video="loop_evening"><p className="label">Keep the save. Keep your reason.</p><h1>Send a Reel to Neophi</h1><p>Three ways to bring something back to your own library. Your words stay yours; AI suggestions stay separate.</p><p className="hint">Server: <span role="status">{reachable ? 'reachable' : 'not reachable'}</span></p></PageIntro>
    <div className="connect-methods">
      <section className="index-card"><span className="status status-real">Android only · requires installation</span><h2>1. Share from your phone</h2><ol><li>In Android Chrome, install this web app using the instructions below.</li><li>Open a Reel or page, choose Share, then the Android Share sheet (sometimes under More).</li><li>Choose Neophi. Check the link in capture, add your own reason if you like, then choose Save.</li></ol><p className="hint">The installed app accepts shared links and text. It does not download the Reel from a pasted link. If Neophi is absent from the Share sheet, use method 3.</p></section>
      <section className="index-card"><span className="status status-mock">Testers only · Meta development mode</span><h2>2. DM a Reel on Instagram</h2><ol><li>Ask the build team to add your Instagram account as a tester and give you the demo account handle.</li><li>On the Reel, choose Send and select the account the team gave you.</li><li>Send your reason as a message in the same conversation within 10 minutes. Open the app on the team's local demo device to collect it.</li></ol><p className="hint">Testers only while the app is in Meta's development mode: only accounts with an app role can have messages delivered. Media access can fail; the caption and your words can still be kept. A reachable server does not confirm Instagram delivery.</p></section>
      <section className="index-card"><span className="status status-real">Works in this browser · no installation</span><h2>3. Paste a link or drop a screenshot</h2><ol><li><Link to="/app/capture">Open capture</Link> and paste the link, or drop a screenshot in the upload area. You can also choose a file.</li><li>Add why you saved it, in your own words, or leave that field empty.</li><li>Choose Save. Open the memory to see your words beside the separate analysis.</li></ol><p className="hint">Links are kept, not fetched. Upload analysis uses the mock provider unless the local Gemini server is enabled. Your library lives in this browser; export before clearing site data.</p></section>
    </div>
    <section className="install-block index-card" aria-labelledby="install-title"><h2 id="install-title">Install on your phone</h2><div className="split"><div className="prose"><h3>Android · Chrome</h3><ol><li>Open this site in Chrome, outside Instagram's in-app browser.</li><li>Open Chrome's menu, then choose Add to Home screen or Install app (wording varies by version).</li><li>Confirm Install and open Neophi from its icon. It can then appear in the Android Share sheet.</li></ol></div><div className="prose"><h3>iPhone · Safari</h3><ol><li>Open this site in Safari.</li><li>Open Share, then Add to Home Screen (it may be under Edit Actions).</li><li>Choose Add, then open Neophi from the Home Screen.</li></ol><p className="hint">iOS installation gives you an app icon. This web app is not an iOS Share extension; paste a link or choose a screenshot in capture.</p></div></div><p className="hint">Installation needs HTTPS or localhost. Browser menus vary. Reminders appear in Today; device notifications require the app to be running.</p></section>
  </div>;
}
