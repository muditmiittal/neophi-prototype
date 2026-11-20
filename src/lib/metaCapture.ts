// Turns an Instagram messaging webhook body into capture events. The same logic lives in server/meta.mjs
// for the webhook stub; tests/meta.test.ts checks that the two agree on the sample payloads.
//
// Documented by Meta (read 14 Nov 2026): attachment types include ig_reel and ig_post; an ig_post payload
// carries ig_post_media_id, title and url. The full ig_reel payload was not shown on the pages we could read:
// the fields used here (reel_video_id, title, url) follow Meta's changelog wording and are NOT yet confirmed.

export interface DmCapture {
  mid: string;
  senderId: string;
  timestamp: number;
  kind: 'ig_reel' | 'ig_post' | 'other';
  mediaId: string | null;
  /** The caption of the shared post, as Meta sends it. */
  title: string | null;
  /** Signed CDN link. How long it lives and whether a server may download it is untested. */
  mediaUrl: string | null;
  /** Text the same person sent within 10 minutes after the share. Treated as their note. */
  note: string | null;
  noteMid?: string;
  /** Which rung of the fallback ladder applies before any download is tried. */
  ladder: 'media_link_present' | 'note_and_caption_only' | 'text_only';
}

const NOTE_WINDOW_MS = 10 * 60 * 1000;
const str = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null);

export function parseInstagramWebhook(body: unknown): DmCapture[] {
  const out: DmCapture[] = [];
  const b = body as { object?: string; entry?: { messaging?: Record<string, unknown>[] }[] } | null;
  if (!b || b.object !== 'instagram' || !Array.isArray(b.entry)) return out;
  const events = b.entry.flatMap((e) => (Array.isArray(e.messaging) ? e.messaging : []));
  for (const ev of events) {
    const message = ev.message as { mid?: string; text?: string; is_echo?: boolean; attachments?: { type?: string; payload?: Record<string, unknown> }[] } | undefined;
    const senderId = str((ev.sender as { id?: string } | undefined)?.id);
    const timestamp = typeof ev.timestamp === 'number' ? ev.timestamp : 0;
    if (!message || !senderId || !str(message.mid) || message.is_echo) continue;
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length === 0) {
      // A plain text message: the note for the share this person sent just before, if any.
      const text = str(message.text);
      const target = [...out].reverse().find((c) => c.senderId === senderId && c.note === null && timestamp - c.timestamp >= 0 && timestamp - c.timestamp <= NOTE_WINDOW_MS);
      if (text && target) { target.note = text; target.noteMid = message.mid; }
      continue;
    }
    for (const att of attachments) {
      const p = att.payload ?? {};
      const kind = att.type === 'ig_reel' || att.type === 'ig_post' ? att.type : 'other';
      const mediaUrl = str(p.url);
      const title = str(p.title);
      out.push({
        mid: message.mid!,
        senderId,
        timestamp,
        kind,
        mediaId: str(p.ig_post_media_id) ?? str(p.reel_video_id),
        title,
        mediaUrl,
        note: str(message.text),
        ladder: mediaUrl ? 'media_link_present' : title ? 'note_and_caption_only' : 'text_only',
      });
    }
  }
  for (const c of out) if (!c.mediaUrl && !c.title && c.note) c.ladder = 'text_only';
  return out;
}

/** Synthetic payloads in the documented shape. Ids, captions and links are invented. */
export const SAMPLE_DM_PAYLOADS: { name: string; body: unknown }[] = [
  {
    name: 'A Reel, then a note',
    body: {
      object: 'instagram',
      entry: [
        {
          id: 'SAMPLE_IG_ACCOUNT_ID',
          time: 1794700000,
          messaging: [
            {
              sender: { id: 'SAMPLE_IGSID_1' },
              recipient: { id: 'SAMPLE_IG_ACCOUNT_ID' },
              timestamp: 1794700000000,
              message: {
                mid: 'SAMPLE_MID_REEL_1',
                attachments: [{ type: 'ig_reel', payload: { reel_video_id: 'SAMPLE_REEL_ID', title: 'Sunrise point above Agonda. Ten minutes on foot from the road.', url: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=SAMPLE&signature=SAMPLE' } }],
              },
            },
            { sender: { id: 'SAMPLE_IGSID_1' }, recipient: { id: 'SAMPLE_IG_ACCOUNT_ID' }, timestamp: 1794700030000, message: { mid: 'SAMPLE_MID_TEXT_1', text: 'Goa trip, day 2 subah' } },
          ],
        },
      ],
    },
  },
  {
    name: 'A post, no note',
    body: {
      object: 'instagram',
      entry: [
        {
          id: 'SAMPLE_IG_ACCOUNT_ID',
          time: 1794700100,
          messaging: [
            {
              sender: { id: 'SAMPLE_IGSID_1' },
              recipient: { id: 'SAMPLE_IG_ACCOUNT_ID' },
              timestamp: 1794700100000,
              message: {
                mid: 'SAMPLE_MID_POST_1',
                attachments: [{ type: 'ig_post', payload: { ig_post_media_id: 'SAMPLE_POST_ID', title: 'Three plating ideas for a small cafe counter.', url: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=SAMPLE2&signature=SAMPLE2' } }],
              },
            },
          ],
        },
      ],
    },
  },
];
