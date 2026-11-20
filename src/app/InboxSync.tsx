import { useEffect, useRef } from 'react';
import { GEMINI_SERVER } from '../ai/provider';
import { attachDmNote, capture, getState } from '../store/store';

interface InboxItem {
  id: string;
  type?: 'note';
  mid?: string;
  parentMid?: string;
  kind?: 'ig_reel' | 'ig_post' | 'other';
  title?: string | null;
  note?: string | null;
  text?: string;
  hasMediaLink?: boolean;
  mediaFetch?: string;
}

/** Pulls live Instagram DM captures from the local Neophi server into the library. Silent when the server is not running. */
export function InboxSync({ notify }: { notify: (text: string) => void }) {
  const busy = useRef(false);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (busy.current || stop || !navigator.onLine) return;
      busy.current = true;
      try {
        const res = await fetch(`${GEMINI_SERVER}/api/inbox`, { signal: AbortSignal.timeout(2500) });
        if (!res.ok) return;
        const { items } = (await res.json()) as { items: InboxItem[] };
        const taken: string[] = [];
        let imported = 0;
        for (const it of items) {
          if (it.type === 'note' && it.parentMid && it.text) {
            if (attachDmNote(it.parentMid, it.text)) taken.push(it.id);
            else if (!getState().memories.some((m) => m.source.externalId === it.parentMid)) taken.push(it.id); // the memory was deleted: drop the note
            continue;
          }
          if (!it.mid || !it.kind) continue;
          const settings = getState().settings;
          capture({ note: it.note ?? '', noteLanguage: settings.noteLanguage, chosenIntent: null, isPrivate: false, channel: 'dm', dm: { mid: it.mid, kind: it.kind, caption: it.title ?? null, hasMediaLink: Boolean(it.hasMediaLink), live: true, mediaFetch: it.mediaFetch } });
          taken.push(it.id);
          imported++;
        }
        if (taken.length) {
          await fetch(`${GEMINI_SERVER}/api/inbox/ack`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: taken }) });
          if (imported) notify(imported === 1 ? 'A new save arrived from Instagram.' : `${imported} new saves arrived from Instagram.`);
        }
      } catch {
        /* server not running or not reachable: nothing to do */
      } finally {
        busy.current = false;
      }
    };
    const id = window.setInterval(tick, 6000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [notify]);
  return null;
}
