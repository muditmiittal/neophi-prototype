// End-to-end test of the server's Instagram path with no network and no Gemini: a real webhook body, a signed request,
// a media file served by a local fake, the inbox, a late note, and the public-address lockdown.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const SECRET = 'test-secret';
const VERIFY = 'test-verify';
const RELAY = 'test-relay-token-0123456789';
let base = '';
let media: http.Server;
let cobalt: http.Server;
let mediaPort = 0;
let serverRef: http.Server;
let dataDir = '';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const sign = (body: string) => 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
const post = (p: string, body: string, headers: Record<string, string> = {}) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neophi-test-'));
  process.env.NEOPHI_NO_LISTEN = '1';
  process.env.META_VERIFY_TOKEN = VERIFY;
  process.env.META_APP_SECRET = SECRET;
  process.env.NEOPHI_DATA = dataDir;
  process.env.NEOPHI_RELAY_TOKEN = RELAY;
  media = http.createServer((req, res) => {
    if (req.url?.startsWith('/page')) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>a reel page, not media</html>'); }
    res.writeHead(200, { 'content-type': 'image/png' }); res.end(PNG);
  });
  await new Promise<void>((r) => media.listen(0, '127.0.0.1', r));
  mediaPort = (media.address() as AddressInfo).port;
  cobalt = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { url } = JSON.parse(body || '{}');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(String(url).includes('nomedia') ? { status: 'error', error: { code: 'content.post.private' } } : { status: 'tunnel', url: `http://127.0.0.1:${mediaPort}/clip.png` }));
    });
  });
  await new Promise<void>((r) => cobalt.listen(0, '127.0.0.1', r));
  process.env.NEOPHI_COBALT_URL = `http://127.0.0.1:${(cobalt.address() as AddressInfo).port}`;
  process.env.NEOPHI_COBALT_HOSTS = '127.0.0.1';
  // @ts-expect-error plain JavaScript module
  const mod = await import('../server/index.mjs');
  serverRef = mod.server as http.Server;
  await new Promise<void>((r) => serverRef.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(serverRef.address() as AddressInfo).port}`;
});
afterAll(() => { serverRef?.close(); media?.close(); cobalt?.close(); });

const shareBody = (mid: string, note?: string) => JSON.stringify({ object: 'instagram', entry: [{ id: 'ig1', time: 1, messaging: [
  { sender: { id: 'u1' }, recipient: { id: 'ig1' }, timestamp: 1000, message: { mid, attachments: [{ type: 'ig_reel', payload: { url: `http://127.0.0.1:${mediaPort}/reel.png`, title: 'Dosa batter trick', reel_video_id: 'r1' } }] } },
  ...(note ? [{ sender: { id: 'u1' }, recipient: { id: 'ig1' }, timestamp: 2000, message: { mid: mid + 'n', text: note } }] : []),
] }] });

describe('Instagram webhook on the server', () => {
  it('answers Meta\'s verification only with the right token', async () => {
    const ok = await fetch(`${base}/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=abc123`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('abc123');
    expect((await fetch(`${base}/webhooks/instagram?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=x`)).status).toBe(403);
  });
  it('refuses an unsigned or wrongly signed delivery', async () => {
    const body = shareBody('m-bad');
    expect((await post('/webhooks/instagram', body)).status).toBe(401);
    expect((await post('/webhooks/instagram', body, { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) })).status).toBe(401);
  });
  it('takes a signed share, downloads the media, keeps the note exactly, and hands it to the app once', async () => {
    const body = shareBody('m-1', 'Sunday dosa for Maa');
    const r = await post('/webhooks/instagram', body, { 'x-hub-signature-256': sign(body) });
    expect(r.status).toBe(200);
    expect((await r.json()).received).toBe(1);
    await sleep(400); // the media fetch runs after Meta has its answer
    const inbox = (await (await fetch(`${base}/api/inbox`)).json()).items as Array<Record<string, unknown>>;
    const item = inbox.find((i) => i.mid === 'm-1')!;
    expect(item.note).toBe('Sunday dosa for Maa');
    expect(item.mediaFetch).toBe('ok');
    expect(item.mediaMime).toBe('image/png');
    const ack = await post('/api/inbox/ack', JSON.stringify({ ids: [item.id] }));
    expect((await ack.json()).acknowledged).toBe(1);
    const after = (await (await fetch(`${base}/api/inbox`)).json()).items as Array<Record<string, unknown>>;
    expect(after.find((i) => i.mid === 'm-1')).toBeUndefined();
  });
  it('turns a note that arrives in a later delivery into a note event for the imported save', async () => {
    const body = shareBody('m-2');
    await post('/webhooks/instagram', body, { 'x-hub-signature-256': sign(body) });
    await sleep(300);
    const first = (await (await fetch(`${base}/api/inbox`)).json()).items as Array<Record<string, unknown>>;
    expect(first.find((i) => i.mid === 'm-2')).toBeUndefined(); // still inside the 20 second wait
    const late = JSON.stringify({ object: 'instagram', entry: [{ id: 'ig1', time: 2, messaging: [{ sender: { id: 'u1' }, recipient: { id: 'ig1' }, timestamp: 3000, message: { mid: 'late1', text: 'bought this for the pooja room' } }] }] });
    await post('/webhooks/instagram', late, { 'x-hub-signature-256': sign(late) });
    const items = (await (await fetch(`${base}/api/inbox`)).json()).items as Array<Record<string, unknown>>;
    const withNote = items.find((i) => i.mid === 'm-2');
    expect(withNote?.note).toBe('bought this for the pooja room'); // not yet imported, so it travels with the share
  });
});

describe('the relay between the public host and the laptop', () => {
  const proxied = { 'x-forwarded-for': '203.0.113.9' };
  const auth = { ...proxied, authorization: `Bearer ${RELAY}` };
  it('refuses every relay route without the token, even a nearly right one', async () => {
    for (const h of [proxied, { ...proxied, authorization: 'Bearer wrong' }, { ...proxied, authorization: `Bearer ${RELAY.slice(0, -1)}x` }]) {
      expect((await fetch(`${base}/relay/inbox`, { headers: h })).status).toBe(403);
      expect((await fetch(`${base}/relay/media/m-r1`, { headers: h })).status).toBe(403);
      expect((await fetch(`${base}/relay/ack`, { method: 'POST', headers: h, body: '{}' })).status).toBe(403);
    }
  });
  it('hands a save and its media to the laptop, then keeps neither', async () => {
    const body = shareBody('m-r1', 'for the relay test');
    await post('/webhooks/instagram', body, { 'x-hub-signature-256': sign(body) });
    await sleep(400);
    const items = (await (await fetch(`${base}/relay/inbox`, { headers: auth })).json()).items as Array<Record<string, unknown>>;
    const item = items.find((i) => i.mid === 'm-r1')!;
    expect(item.note).toBe('for the relay test');
    expect(item.ingest).toBe('full_media');
    const shapes = (await (await fetch(`${base}/relay/shapes`, { headers: auth })).json()).shapes as Array<Record<string, unknown>>;
    expect(shapes.some((x) => x.attachmentType === 'ig_reel' && x.ingest === 'full_media' && x.urlHost === `127.0.0.1:${mediaPort}`)).toBe(true);
    expect(JSON.stringify(shapes)).not.toContain('Dosa batter trick');
    const m = await (await fetch(`${base}/relay/media/m-r1`, { headers: auth })).json();
    expect(m.mime).toBe('image/png');
    expect(Buffer.from(m.b64, 'base64').equals(PNG)).toBe(true);
    const ack = await fetch(`${base}/relay/ack`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ ids: [item.id] }) });
    expect((await ack.json()).acknowledged).toBe(1);
    expect((await fetch(`${base}/relay/media/m-r1`, { headers: auth })).status).toBe(404);
    const after = (await (await fetch(`${base}/relay/inbox`, { headers: auth })).json()).items as Array<Record<string, unknown>>;
    expect(after.find((i) => i.mid === 'm-r1')).toBeUndefined();
  });
});

describe('optional cobalt step (off unless NEOPHI_COBALT_URL is set)', () => {
  const reelBody = (mid: string, path: string) => JSON.stringify({ object: 'instagram', entry: [{ id: 'ig1', time: 1, messaging: [{ sender: { id: 'u9' }, recipient: { id: 'ig1' }, timestamp: 5000, message: { mid, text: 'cobalt test', attachments: [{ type: 'ig_reel', payload: { url: `http://127.0.0.1:${mediaPort}${path}`, title: 'A reel page' } }] } }] }] });
  it('turns a link that is only a web page into media through cobalt, and says so', async () => {
    const body = reelBody('m-c1', '/page/reel');
    await post('/webhooks/instagram', body, { 'x-hub-signature-256': sign(body) });
    await sleep(500);
    const items = (await (await fetch(`${base}/api/inbox`)).json()).items as Array<Record<string, unknown>>;
    const it = items.find((i) => i.mid === 'm-c1')!;
    expect(it.ingest).toBe('full_media');
    expect(it.via).toBe('cobalt');
  });
  it('stays honest when cobalt cannot get it: link and caption only', async () => {
    const body = reelBody('m-c2', '/page/nomedia');
    await post('/webhooks/instagram', body, { 'x-hub-signature-256': sign(body) });
    await sleep(500);
    const items = (await (await fetch(`${base}/api/inbox`)).json()).items as Array<Record<string, unknown>>;
    const it = items.find((i) => i.mid === 'm-c2')!;
    expect(it.ingest).toBe('link_metadata');
    expect(it.cobalt).toBe('no_media');
  });
});

describe('the public address', () => {
  it('shows health but nothing that costs money or exposes saves when a proxy header is present', async () => {
    const proxied = { 'x-forwarded-for': '203.0.113.9' };
    expect((await fetch(`${base}/api/health`, { headers: proxied })).status).toBe(200);
    expect(await (await fetch(`${base}/api/health`, { headers: proxied })).json()).toEqual({ ok: true });
    for (const p of ['/api/inbox', '/api/inbox/ack', '/api/embed', '/api/analyse', '/replay']) {
      const r = await fetch(base + p, { method: p === '/api/inbox' ? 'GET' : 'POST', headers: { ...proxied, 'content-type': 'application/json' }, body: p === '/api/inbox' ? undefined : '{}' });
      expect(r.status).toBe(403);
    }
  });
  it('still lets the webhook through the proxy', async () => {
    const proxied = { 'x-forwarded-for': '203.0.113.9' };
    const r = await fetch(`${base}/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=ok`, { headers: proxied });
    expect(r.status).toBe(200);
  });
});
