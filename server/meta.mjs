// Meta webhook helpers for the local stub: signature check and the same parser logic as src/lib/metaCapture.ts.
// Documented by Meta (read 14 Nov 2026): attachment types ig_reel and ig_post. Whether the media url can be
// downloaded by a server, and for how long, is NOT documented: test it (docs/META_CAPTURE.md).
import crypto from 'node:crypto';

export function verifySignature(rawBody, header, appSecret) {
  if (!appSecret || !header || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const given = header.slice('sha256='.length);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const str = (v) => (typeof v === 'string' && v.length ? v : null);
const NOTE_WINDOW_MS = 10 * 60 * 1000;

export function parseInstagramWebhook(body) {
  const out = [];
  if (!body || body.object !== 'instagram' || !Array.isArray(body.entry)) return out;
  const events = body.entry.flatMap((e) => (Array.isArray(e.messaging) ? e.messaging : []));
  for (const ev of events) {
    const m = ev.message;
    const senderId = str(ev.sender?.id);
    const timestamp = typeof ev.timestamp === 'number' ? ev.timestamp : 0;
    if (!m || !senderId || !str(m.mid) || m.is_echo) continue;
    const atts = Array.isArray(m.attachments) ? m.attachments : [];
    if (atts.length === 0) {
      const text = str(m.text);
      const target = [...out].reverse().find((c) => c.senderId === senderId && c.note === null && timestamp - c.timestamp >= 0 && timestamp - c.timestamp <= NOTE_WINDOW_MS);
      if (text && target) target.note = text;
      continue;
    }
    for (const a of atts) {
      const p = a.payload ?? {};
      const kind = a.type === 'ig_reel' || a.type === 'ig_post' ? a.type : 'other';
      const mediaUrl = str(p.url);
      const title = str(p.title);
      out.push({ mid: m.mid, senderId, timestamp, kind, mediaId: str(p.ig_post_media_id) ?? str(p.reel_video_id), title, mediaUrl, note: str(m.text), ladder: mediaUrl ? 'media_link_present' : title ? 'note_and_caption_only' : 'text_only' });
    }
  }
  for (const c of out) if (!c.mediaUrl && !c.title && c.note) c.ladder = 'text_only';
  return out;
}

/** Text-only messages (a note typed after sharing a Reel often arrives in a separate delivery from the share itself). */
export function extractTexts(body) {
  const out = [];
  if (!body || body.object !== 'instagram' || !Array.isArray(body.entry)) return out;
  for (const e of body.entry) {
    for (const ev of Array.isArray(e.messaging) ? e.messaging : []) {
      const m = ev.message;
      const senderId = str(ev.sender?.id);
      if (!m || !senderId || !str(m.mid) || m.is_echo) continue;
      if (Array.isArray(m.attachments) && m.attachments.length) continue;
      const text = str(m.text);
      if (text) out.push({ mid: m.mid, senderId, text, timestamp: typeof ev.timestamp === 'number' ? ev.timestamp : 0 });
    }
  }
  return out;
}
