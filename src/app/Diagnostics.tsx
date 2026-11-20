import { useEffect, useState } from 'react';

const COUNT_KEYS = ['webhookPosts', 'captures', 'mediaFetchOk', 'mediaFetchFailed', 'repliesSent', 'bad'] as const;
export function localDiagnostics(data: unknown, hostname: string) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname) || !data || typeof data !== 'object' || !('ok' in data) || data.ok !== true || !('instagram' in data)) return null;
  const ig = data.instagram;
  if (!ig || typeof ig !== 'object') return null;
  const record = ig as Record<string, unknown>;
  const count = (key: string) => typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : null;
  const relay = record.relay;
  const status = (value: unknown) => typeof value === 'string' && /^(off|never|ok|error|none yet|http_\d{3}|type_[a-z0-9_./+-]+|too_large)$/.test(value) ? value : 'unknown';
  return {
    webhookConfigured: record.webhookConfigured === true,
    inboxSize: count('inboxSize'),
    counts: Object.fromEntries(COUNT_KEYS.map((key) => [key, count(key)])),
    lastMediaFetch: status(record.lastMediaFetch),
    relay: relay && typeof relay === 'object' ? { lastPoll: status('lastPoll' in relay ? relay.lastPoll : null), pulled: 'pulled' in relay && typeof relay.pulled === 'number' ? relay.pulled : null, mediaPulled: 'mediaPulled' in relay && typeof relay.mediaPulled === 'number' ? relay.mediaPulled : null } : status(relay),
  };
}

export function Diagnostics() {
  const [data, setData] = useState<ReturnType<typeof localDiagnostics>>(null);
  useEffect(() => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
    const controller = new AbortController();
    void fetch('/api/health', { cache: 'no-store', signal: controller.signal }).then(async (response) => response.ok ? response.json() as Promise<unknown> : null).then((value) => { if (!controller.signal.aborted) setData(localDiagnostics(value, window.location.hostname)); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!data) return <>Not available here</>;
  return <main className="page wrap"><h1>Local diagnostics</h1><h2>Instagram</h2><pre className="diagnostics-data">{JSON.stringify(data, null, 2)}</pre></main>;
}
