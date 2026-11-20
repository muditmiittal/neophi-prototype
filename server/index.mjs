// Neophi server. Node 20+, no dependencies. One process does everything:
//   - serves the built site from dist/ (so one URL is the whole product),
//   - Gemini through Vertex AI (Application Default Credentials, or the Cloud Run service account) or an AI Studio key,
//   - the Instagram DM webhook: verify, parse, fetch the shared media, analyse it, keep it in an inbox the app imports,
//   - an optional confirmation reply to the sender.
// Run:  node server/index.mjs   (port 8787, local only)       NEOPHI_PUBLIC=1 makes every non-local request limited to the public routes.
// Keys, tokens and secrets are read from the environment only. They are never logged and never sent to the browser.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifySignature, parseInstagramWebhook, extractTexts, instagramPermalink } from './meta.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');
const DATA_DIR = process.env.NEOPHI_DATA || path.resolve(HERE, '..', 'data');
const ON_CLOUD_RUN = Boolean(process.env.K_SERVICE);
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.NEOPHI_HOST || (ON_CLOUD_RUN ? '0.0.0.0' : '127.0.0.1');
const KEY = process.env.GEMINI_API_KEY || '';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';
const USE_VERTEX = (process.env.NEOPHI_PROVIDER === 'vertex' || (ON_CLOUD_RUN && !KEY)) && Boolean(PROJECT);
const LIVE = Boolean(KEY) || USE_VERTEX;
const ANALYSIS_MODEL = process.env.NEOPHI_ANALYSIS_MODEL || 'gemini-3.8-flash';
const EMBEDDING_MODEL = process.env.NEOPHI_EMBEDDING_MODEL || 'gemini-embedding-2';
const EMBED_DIMS = 768; // requested explicitly: the model's default is 3072
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || ''; // only for the optional confirmation reply
const IG_REPLY = process.env.META_AUTO_REPLY === '1' && Boolean(IG_TOKEN);
const RELAY_TOKEN = process.env.NEOPHI_RELAY_TOKEN || ''; // on the public host: lets the laptop collect saves. On the laptop: the same value, used to pull them.
const RELAY_URL = (process.env.NEOPHI_RELAY_URL || '').replace(/\/+$/, ''); // laptop only: where the public host lives
// EXPERIMENTAL and OFF by default: ask a self-hosted cobalt (github.com/imputnet/cobalt, AGPL-3.0) to turn a shared Instagram link into media bytes when Meta only gave us a link.
// See 09_COBALT.md (package root) before enabling: it can break Instagram's terms and Meta review, and it must never be used with a logged-in account's cookies.
const COBALT_URL = (process.env.NEOPHI_COBALT_URL || '').replace(/\/+$/, '');
const COBALT_KEY = process.env.NEOPHI_COBALT_KEY || '';
const COBALT_HOSTS = (process.env.NEOPHI_COBALT_HOSTS || 'instagram.com,ddinstagram.com').split(',').map((h) => h.trim()).filter(Boolean);
const GRAPH = `https://graph.instagram.com/${process.env.META_GRAPH_VERSION || 'v27.0'}`;
const API = 'https://generativelanguage.googleapis.com/v1beta';
const ORIGINS = new Set(['http://localhost:4173', 'http://127.0.0.1:4173', 'http://localhost:5173', 'http://127.0.0.1:5173', `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
const MAX_MEDIA = 18 * 1024 * 1024; // Gemini accepts inline data up to about 20 MB per request
const startedAt = Date.now();

// ---------- small helpers ----------
const send = (res, code, body, origin) => {
  res.writeHead(code, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...(origin && ORIGINS.has(origin) ? { 'access-control-allow-origin': origin, vary: 'origin' } : {}),
  });
  res.end(JSON.stringify(body));
};
const readBody = (req, limit = 2_000_000) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) { reject(new Error('Body too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
/** A request counts as local only when it came over loopback with no proxy headers: a tunnel adds those. */
function isLocal(req) {
  const ra = req.socket.remoteAddress || '';
  const loop = ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1';
  const proxied = ['x-forwarded-for', 'x-forwarded-host', 'cf-connecting-ip', 'x-real-ip', 'forwarded'].some((h) => req.headers[h]);
  const host = String(req.headers.host || '');
  return loop && !proxied && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

// ---------- Gemini ----------
const SYSTEM = `You read a saved social-media item for a memory app. Return ONLY JSON.
Rules: (1) never write the user's reason; the user's note is provided separately and is handled by code.
(2) Every observation must cite an evidence id from "evidence", or omit "evidence" so it is shown as uncertain.
(3) If the media is not available, say less, never guess. (4) Suggestions are suggestions, with a confidence 0 to 1.
(5) If an image or video is attached, describe only what is visible or audible in it. Text on screen goes in visible_text. Hindi, Hinglish and English are all fine.
Shape: {"source_summary":string,"observed_objects":[{"label":string,"where":string,"bbox":null,"confidence":number,"evidence":string}],
"visible_text":[string],"transcript_summary":string,"inferred_possible_intents":[{"intent":string,"confidence":number,"evidence":string}],
"intent_confidence":number,"actionable_entities":[{"type":"product|place|recipe|tool|person","name":string,"evidence":string}],
"suggested_actions":["content_brief"|"recipe_steps"|"set_reminder"|"itinerary_stop"],
"evidence":[{"id":string,"kind":"frame|quote|caption|note","ref":string}],"purpose":"shop|learn|create|travel|food|try_later|other",
"note_grounding":{"status":"grounded|not_sure|no_note|not_attempted","evidence":[string],"explanation":string}}`;

let cachedToken = { value: '', at: 0 };
function accessToken() {
  if (cachedToken.value && Date.now() - cachedToken.at < 40 * 60_000) return Promise.resolve(cachedToken.value);
  if (ON_CLOUD_RUN) {
    return fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((j) => {
        if (!j.access_token) throw new Error('No service account token');
        cachedToken = { value: j.access_token, at: Date.now() - 35 * 60_000 }; // refresh after about 5 minutes
        return cachedToken.value;
      });
  }
  return new Promise((resolve, reject) => {
    execFile('gcloud', ['auth', 'application-default', 'print-access-token'], { shell: true, timeout: 30_000 }, (err, stdout) => {
      const t = String(stdout || '').trim().split(/\r?\n/).pop() ?? '';
      if (err || t.length < 50) return reject(new Error('Could not get an access token: run `gcloud auth application-default login` once'));
      cachedToken = { value: t, at: Date.now() };
      resolve(t);
    });
  });
}

async function gemini(pathPart, payload) {
  const url = USE_VERTEX ? `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/${pathPart}` : `${API}/${pathPart}`;
  const headers = USE_VERTEX
    ? { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}`, ...(ON_CLOUD_RUN ? {} : { 'x-goog-user-project': PROJECT }) }
    : { 'content-type': 'application/json', 'x-goog-api-key': KEY };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Gemini answered ${res.status}`); // body not echoed: it can contain request text
  return res.json();
}

/** Media for one analysis: an uploaded key frame (data URL) or media the server fetched for an Instagram share. */
function mediaParts(input) {
  const parts = [];
  const m = typeof input.imageDataUrl === 'string' ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.imageDataUrl) : null;
  if (m && m[2].length < 8_000_000) parts.push({ text: 'ATTACHED MEDIA (image the user uploaded):' }, { inlineData: { mimeType: m[1], data: m[2] } });
  pruneMedia();
  const cached = input.dmMid ? mediaCache.get(String(input.dmMid)) : null;
  if (cached) parts.push({ text: `ATTACHED MEDIA (${cached.mime.startsWith('video') ? 'video' : 'image'} fetched from the Instagram share):` }, { inlineData: { mimeType: cached.mime, data: cached.b64 } });
  return parts;
}

async function analyse(input) {
  const item = { url: input.url ?? null, caption: input.caption ?? null, sourceState: input.sourceState ?? null, language: input.language ?? null, userNote: input.note ?? null, userChip: input.chip ?? null };
  const parts = [{ text: `${SYSTEM}\n\nItem:\n${JSON.stringify(item)}` }, ...mediaParts(input)];
  const data = await gemini(`models/${ANALYSIS_MODEL}:generateContent`, { contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } });
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return { raw: JSON.parse(text), usage: data?.usageMetadata ?? null, withMedia: parts.length > 1 };
}

async function embed(text) {
  const data = await gemini(`models/${EMBEDDING_MODEL}:embedContent`, { content: { parts: [{ text: String(text).slice(0, 8000) }] }, outputDimensionality: EMBED_DIMS });
  const v = data?.embedding?.values;
  if (!Array.isArray(v) || v.length !== EMBED_DIMS) throw new Error(`Expected ${EMBED_DIMS} dimensions`);
  return v;
}

// ---------- Instagram inbox ----------
const mediaCache = new Map(); // mid -> { mime, b64, at }, kept in memory for one hour
const inboxFile = path.join(DATA_DIR, 'inbox.json');
let inbox = [];
try {
  inbox = JSON.parse(fs.readFileSync(inboxFile, 'utf8')).map((item) => item.mediaFetch === 'pending' ? { ...item, mediaFetch: 'interrupted' } : item);
} catch { inbox = []; }
const saveInbox = () => {
  try {
    pruneInbox();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const pending = inbox.filter((item) => !item.taken);
    const taken = inbox.filter((item) => item.taken).slice(-200);
    const tmp = `${inboxFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...taken, ...pending]), { mode: 0o600 });
    fs.renameSync(tmp, inboxFile);
    return true;
  } catch { return false; }
};
const lastBySender = new Map(); // senderId -> { itemId, at }
const NOTE_WINDOW_MS = 10 * 60 * 1000;
const READY_AFTER_MS = 20_000; // wait a little so a note typed right after the share can travel with it
const stats = { webhookPosts: 0, captures: 0, mediaFetchOk: 0, mediaFetchFailed: 0, repliesSent: 0, bad: 0 };
let lastFetchResult = 'none yet'; // status class only, never a url

/** Anything not collected within 24 hours is dropped, so the server never becomes a store of people's saves. */
function pruneInbox() {
  const cut = Date.now() - 24 * 3_600_000;
  inbox = inbox.filter((i) => Date.parse(i.receivedAt) >= cut);
}

function pruneMedia() {
  const cut = Date.now() - 3_600_000;
  for (const [k, v] of mediaCache) if (v.at < cut) mediaCache.delete(k);
  while (mediaCache.size > 20) mediaCache.delete(mediaCache.keys().next().value);
}

/** Meta documents the media url of a shared Reel or post but not whether a server may download it. This records what really happens. */
async function fetchMedia(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25_000), headers: { 'user-agent': 'NeophiCapture/0.1' } });
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!res.ok) return { ok: false, why: `http_${res.status}` };
  if (!/^(image\/(jpeg|png|webp)|video\/mp4)$/.test(type)) return { ok: false, why: `type_${type || 'unknown'}` };
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_MEDIA) return { ok: false, why: 'too_large' };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_MEDIA) return { ok: false, why: 'too_large' };
  return { ok: true, mime: type, b64: buf.toString('base64'), bytes: buf.length };
}

/** Ask cobalt for a direct media address. Returns an https/http address or null. Nothing is sent to cobalt except the link the user shared. */
async function cobaltResolve(link) {
  if (!COBALT_URL) return null;
  let host;
  try { host = new URL(link).hostname; } catch { return null; }
  if (!COBALT_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return null;
  const headers = { accept: 'application/json', 'content-type': 'application/json', ...(COBALT_KEY ? { authorization: `Api-Key ${COBALT_KEY}` } : {}) };
  const r = await fetch(`${COBALT_URL}/`, { method: 'POST', headers, body: JSON.stringify({ url: link, videoQuality: '480', downloadMode: 'auto', filenameStyle: 'basic' }), signal: AbortSignal.timeout(30_000) });
  if (!r.ok) return null;
  const j = await r.json();
  if (j.status === 'tunnel' || j.status === 'redirect') return typeof j.url === 'string' ? j.url : null;
  if (j.status === 'picker' && Array.isArray(j.picker)) { const first = j.picker.find((x) => x.type === 'video') ?? j.picker[0]; return typeof first?.url === 'string' ? first.url : null; }
  return null; // 'error', 'local-processing' and anything else: honest failure, we keep link and caption only
}

async function replyTo(senderId, text) {
  const res = await fetch(`${GRAPH}/me/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${IG_TOKEN}` }, body: JSON.stringify({ recipient: { id: senderId }, message: { text } }), signal: AbortSignal.timeout(15_000) });
  return res.ok;
}

function handleText(t) {
  const last = lastBySender.get(t.senderId);
  if (!last || Date.now() - last.at > NOTE_WINDOW_MS) return false;
  const item = inbox.find((i) => i.id === last.itemId);
  if (!item || inbox.some((i) => i.noteMid === t.mid || i.id === `${t.mid}:note`)) return false;
  if (!item.taken && !item.offered && !item.note) { item.note = t.text; item.noteMid = t.mid; }
  else inbox.push({ id: `${t.mid}:note`, type: 'note', parentMid: item.mid, text: t.text, receivedAt: new Date().toISOString(), taken: false });
  saveInbox();
  return true;
}

/** Raw facts about the attachment behind a capture, read from the webhook body (the parser stays identical to the app's). */
function rawAttachment(body, mid) {
  for (const e of body?.entry ?? []) for (const ev of e.messaging ?? []) {
    if (ev.message?.mid !== mid) continue;
    const a = (ev.message.attachments ?? [])[0];
    if (a) return { attachmentType: typeof a.type === 'string' ? a.type : null, payloadKeys: Object.keys(a.payload ?? {}).sort(), unsupported: a.payload?.is_unsupported === true };
  }
  return { attachmentType: null, payloadKeys: [], unsupported: false };
}

/** What Meta really sent, for the real-device test matrix: attachment type, payload key names, the url's host only, and what the fetch produced. Never urls, titles or notes. */
const shapes = [];
function recordShape(c, item) {
  let host = null;
  try { host = c.mediaUrl ? new URL(c.mediaUrl).host : null; } catch { host = 'unparseable'; }
  shapes.push({ at: item.receivedAt, attachmentType: c.attachmentType, kind: c.kind, payloadKeys: c.payloadKeys, urlHost: host, hasTitle: Boolean(c.title), unsupported: Boolean(c.unsupported), mediaFetch: item.mediaFetch, mime: item.mediaMime ?? null, ingest: item.ingest, via: item.via ?? null, cobalt: item.cobalt ?? null });
  while (shapes.length > 60) shapes.shift();
}

async function handleCapture(c, body) {
  if (inbox.some((i) => i.mid === c.mid)) return;
  Object.assign(c, rawAttachment(body, c.mid));
  const item = { id: c.mid + ':' + (inbox.length + 1), mid: c.mid, receivedAt: new Date().toISOString(), kind: c.kind, title: c.title, note: c.note, noteMid: c.noteMid, permalink: instagramPermalink(c.mediaUrl), ladder: c.ladder, hasMediaLink: Boolean(c.mediaUrl), mediaFetch: c.mediaUrl ? 'pending' : 'no_link', taken: false };
  inbox.push(item); lastBySender.set(c.senderId, { itemId: item.id, at: Date.now() }); saveInbox(); stats.captures++;
  if (c.mediaUrl) {
    try {
      let m = await fetchMedia(c.mediaUrl);
      if (!m.ok && COBALT_URL) {
        try { const direct = await cobaltResolve(c.mediaUrl); if (direct && /^https?:\/\//.test(direct)) { const viaCobalt = await fetchMedia(direct); if (viaCobalt.ok) { m = viaCobalt; item.via = 'cobalt'; } else item.cobalt = viaCobalt.why; } else item.cobalt = 'no_media'; } catch { item.cobalt = 'error'; }
      }
      if (m.ok) { mediaCache.set(c.mid, { mime: m.mime, b64: m.b64, at: Date.now() }); pruneMedia(); item.mediaFetch = 'ok'; item.mediaMime = m.mime; item.mediaBytes = m.bytes; stats.mediaFetchOk++; lastFetchResult = 'ok'; }
      else { item.mediaFetch = m.why; stats.mediaFetchFailed++; lastFetchResult = m.why; }
    } catch { item.mediaFetch = 'error'; stats.mediaFetchFailed++; lastFetchResult = 'error'; }
    item.ladder = item.mediaFetch === 'ok' ? 'media_fetched' : item.ladder;
  }
  // Three honest ingestion states (research, 20 Nov): the media bytes were really fetched, only a link and caption arrived, or nothing usable did.
  item.ingest = item.mediaFetch === 'ok' ? 'full_media' : c.unsupported || (!c.mediaUrl && !c.title) ? 'unsupported' : 'link_metadata';
  recordShape(c, item);
  saveInbox();
  if (IG_REPLY) {
    try { if (await replyTo(c.senderId, item.mediaFetch === 'ok' ? 'Saved to your Neophi memory. Reply here with why you saved it, in your own words.' : 'Got it, saved. Reply here with why you saved it, in your own words.')) stats.repliesSent++; } catch { /* a reply is a courtesy */ }
  }
}

// ---------- relay: the public host holds the webhook, the laptop (which has Gemini) pulls the saves ----------
function relayAuthorised(req) {
  const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!RELAY_TOKEN || got.length !== RELAY_TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(RELAY_TOKEN));
}
const readyItems = () => {
  pruneInbox();
  const ready = (item) => item.mediaFetch !== 'pending' && (item.note || Date.now() - Date.parse(item.receivedAt) >= READY_AFTER_MS);
  const awaitingParent = new Set(inbox.filter((item) => item.mid && !item.taken && !ready(item)).map((item) => item.mid));
  const items = inbox.filter((item) => !item.taken && (item.type === 'note' ? !awaitingParent.has(item.parentMid) : ready(item)));
  for (const item of items) item.offered = true;
  return items;
};

let relayBusy = false;
const relayState = { lastPoll: 'never', pulled: 0, mediaPulled: 0 };
async function relayPull() {
  if (relayBusy || !RELAY_URL || !RELAY_TOKEN) return;
  relayBusy = true;
  const headers = { authorization: `Bearer ${RELAY_TOKEN}` };
  try {
    const r = await fetch(`${RELAY_URL}/relay/inbox`, { headers, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) { relayState.lastPoll = `http_${r.status}`; return; }
    const { items = [] } = await r.json();
    const done = [];
    for (const it of items) {
      if (!inbox.some((x) => x.id === it.id)) {
        if (it.mediaFetch === 'ok' && it.mid) {
          try {
            const m = await fetch(`${RELAY_URL}/relay/media/${encodeURIComponent(it.mid)}`, { headers, signal: AbortSignal.timeout(30_000) });
            if (m.ok) { const j = await m.json(); mediaCache.set(it.mid, { mime: j.mime, b64: j.b64, at: Date.now() }); pruneMedia(); relayState.mediaPulled++; }
          } catch { /* the save still imports; it is analysed from the caption */ }
        }
        const mediaFetch = it.mediaFetch === 'ok' && !mediaCache.has(it.mid) ? 'relay_media_unavailable' : it.mediaFetch;
        inbox.push({ ...it, taken: false, mediaFetch });
        relayState.pulled++;
      }
      done.push(it.id);
    }
    if (done.length) {
      if (!saveInbox()) { relayState.lastPoll = 'storage_error'; return; }
      const ack = await fetch(`${RELAY_URL}/relay/ack`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ ids: done }), signal: AbortSignal.timeout(15_000) });
      if (!ack.ok) { relayState.lastPoll = `ack_http_${ack.status}`; return; }
    }
    relayState.lastPoll = 'ok';
  } catch { relayState.lastPoll = 'error'; } finally { relayBusy = false; }
}

// ---------- static site ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8' };
function serveFile(res, status, file) {
  res.writeHead(status, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache', 'x-content-type-options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}
function serveStatic(req, res, url) {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
  let clean;
  try { clean = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, ''); } catch { clean = ''; }
  const target = path.join(DIST, clean);
  if (!target.startsWith(DIST)) return serveFile(res, 404, path.join(DIST, '404.html'));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return serveFile(res, 200, target);
  const index = path.join(target, 'index.html');
  if (fs.existsSync(index)) return serveFile(res, 200, index);
  if (url.pathname === '/app' || url.pathname.startsWith('/app/')) return serveFile(res, 200, path.join(DIST, 'app', 'index.html'));
  return serveFile(res, 404, path.join(DIST, '404.html'));
}

// ---------- routes ----------
const PUBLIC_API = new Set(['/api/health', '/webhooks/instagram']);

export const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const local = isLocal(req);
  const isApi = url.pathname.startsWith('/api/') || url.pathname === '/replay' || url.pathname.startsWith('/webhooks/');
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': ORIGINS.has(origin) ? origin : '', 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'content-type' });
      return res.end();
    }
    if (url.pathname.startsWith('/relay/')) {
      if (!relayAuthorised(req)) return send(res, 403, { error: 'forbidden' });
      if (url.pathname === '/relay/shapes' && req.method === 'GET') return send(res, 200, { shapes });
      if (url.pathname === '/relay/inbox' && req.method === 'GET') return send(res, 200, { items: readyItems() });
      if (url.pathname.startsWith('/relay/media/') && req.method === 'GET') {
        pruneMedia();
        const c = mediaCache.get(decodeURIComponent(url.pathname.slice('/relay/media/'.length)));
        return c ? send(res, 200, { mime: c.mime, b64: c.b64 }) : send(res, 404, { error: 'gone' });
      }
      if (url.pathname === '/relay/ack' && req.method === 'POST') {
        const { ids } = JSON.parse((await readBody(req)).toString('utf8'));
        let n = 0;
        for (const i of inbox) if (Array.isArray(ids) && ids.includes(i.id) && !i.taken) { i.taken = true; i.title = null; i.note = null; i.text = null; i.permalink = null; mediaCache.delete(i.mid); n++; } // the laptop holds it now: this host keeps no words and no media
        pruneInbox(); saveInbox();
        return send(res, 200, { acknowledged: n });
      }
      return send(res, 404, { error: 'not found' });
    }
    // Public (tunnel or Cloud Run) requests may read the site and use the webhook and health routes only. Gemini, the inbox and replay stay local.
    if (isApi && !local && process.env.NEOPHI_ALLOW_REMOTE_API !== '1' && !PUBLIC_API.has(url.pathname)) return send(res, 403, { error: 'not available on the public address' });

    if (url.pathname === '/api/health') {
      const base = { ok: true, gemini: LIVE, provider: USE_VERTEX ? 'vertex' : KEY ? 'ai-studio-key' : 'none', analysisModel: ANALYSIS_MODEL, embeddingModel: EMBEDDING_MODEL };
      return send(res, 200, local ? { ...base, instagram: { webhookConfigured: Boolean(VERIFY_TOKEN && APP_SECRET), autoReply: IG_REPLY, inboxSize: inbox.filter((i) => !i.taken).length, ...stats, lastMediaFetch: lastFetchResult, relay: RELAY_URL ? relayState : 'off' }, upMinutes: Math.round((Date.now() - startedAt) / 60000) } : { ok: true }, origin);
    }
    if (url.pathname === '/api/analyse' && req.method === 'POST') {
      if (!LIVE) return send(res, 503, { error: 'Gemini is not configured on this server' }, origin);
      const { input } = JSON.parse((await readBody(req, 9_000_000)).toString('utf8'));
      const out = await analyse(input ?? {});
      return send(res, 200, { raw: out.raw, usage: out.usage, withMedia: out.withMedia }, origin);
    }
    if (url.pathname === '/api/embed' && req.method === 'POST') {
      if (!LIVE) return send(res, 503, { error: 'Gemini is not configured on this server' }, origin);
      const { text } = JSON.parse((await readBody(req)).toString('utf8'));
      return send(res, 200, { vector: await embed(text ?? '') }, origin);
    }
    if (url.pathname === '/api/embed-batch' && req.method === 'POST') {
      if (!LIVE) return send(res, 503, { error: 'Gemini is not configured on this server' }, origin);
      const { texts } = JSON.parse((await readBody(req, 1_000_000)).toString('utf8'));
      if (!Array.isArray(texts) || texts.length > 24) return send(res, 400, { error: 'send up to 24 texts' }, origin);
      return send(res, 200, { vectors: await Promise.all(texts.map((t) => embed(t ?? ''))) }, origin);
    }
    if (url.pathname === '/api/shapes' && req.method === 'GET') return send(res, 200, { shapes }, origin);
    if (url.pathname === '/api/inbox' && req.method === 'GET') return send(res, 200, { items: readyItems() }, origin);
    if (url.pathname === '/api/inbox/ack' && req.method === 'POST') {
      const { ids } = JSON.parse((await readBody(req)).toString('utf8'));
      let n = 0;
      for (const i of inbox) if (Array.isArray(ids) && ids.includes(i.id) && !i.taken) { i.taken = true; i.title = null; i.note = null; i.text = null; i.permalink = null; n++; } // the app now holds the save: the server keeps no words of it
      pruneInbox();
      saveInbox();
      return send(res, 200, { acknowledged: n }, origin);
    }
    if (url.pathname === '/webhooks/instagram' && req.method === 'GET') {
      const ok = VERIFY_TOKEN && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === VERIFY_TOKEN;
      res.writeHead(ok ? 200 : 403, { 'content-type': 'text/plain' });
      return res.end(ok ? url.searchParams.get('hub.challenge') ?? '' : 'forbidden');
    }
    if (url.pathname === '/webhooks/instagram' && req.method === 'POST') {
      stats.webhookPosts++;
      const raw = await readBody(req);
      if (!verifySignature(raw, req.headers['x-hub-signature-256'], APP_SECRET)) { stats.bad++; return send(res, 401, { error: 'bad signature' }); }
      const body = JSON.parse(raw.toString('utf8'));
      const captures = parseInstagramWebhook(body);
      console.log(`webhook: ${captures.length} capture(s)`); // counts only: never log notes or urls
      const attached = new Set(captures.map((c) => c.noteMid));
      for (const c of captures) void handleCapture(c, body); // answer Meta fast; fetching and replying continue in the background
      for (const t of extractTexts(body)) if (!attached.has(t.mid)) handleText(t);
      return send(res, 200, { received: captures.length });
    }
    if (url.pathname === '/replay' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8'));
      return send(res, 200, { captures: parseInstagramWebhook(body) }, origin);
    }
    if (isApi) return send(res, 404, { error: 'not found' }, origin);
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url);
    return send(res, 405, { error: 'method not allowed' }, origin);
  } catch (e) {
    return send(res, 500, { error: e instanceof Error ? e.message : 'error' }, origin);
  }
});

if (process.env.NEOPHI_NO_LISTEN !== '1') {
  if (RELAY_URL && RELAY_TOKEN) setInterval(() => void relayPull(), 5000);
  server.listen(PORT, HOST, () => console.log(`Neophi on http://${HOST}:${PORT} (Gemini ${LIVE ? (USE_VERTEX ? 'on via Vertex AI' : 'on via key') : 'off'}; Instagram webhook ${VERIFY_TOKEN && APP_SECRET ? 'configured' : 'not configured'}; ${fs.existsSync(path.join(DIST, 'index.html')) ? 'serving dist/' : 'no dist/'})`));
}
