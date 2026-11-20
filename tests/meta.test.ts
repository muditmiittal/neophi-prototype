import { describe, expect, it } from 'vitest';
import { SAMPLE_DM_PAYLOADS, parseInstagramWebhook } from '../src/lib/metaCapture';
// @ts-expect-error plain JavaScript module used by the local server
import { parseInstagramWebhook as serverParse, verifySignature } from '../server/meta.mjs';
import crypto from 'node:crypto';

describe('Instagram DM parsing', () => {
  it('the app and the server stub agree on every sample payload', () => {
    for (const s of SAMPLE_DM_PAYLOADS) expect(serverParse(s.body)).toEqual(parseInstagramWebhook(s.body));
  });
  it('a share followed by text becomes one capture with a note', () => {
    const [first] = SAMPLE_DM_PAYLOADS;
    const c = parseInstagramWebhook(first.body);
    expect(c.length).toBe(1);
    expect(c[0].note).toBe('Goa trip, day 2 subah');
    expect(c[0].ladder).toBe('media_link_present');
  });
  it('ignores bodies that are not Instagram messaging', () => {
    expect(parseInstagramWebhook({ object: 'page', entry: [] })).toEqual([]);
    expect(parseInstagramWebhook(null)).toEqual([]);
  });
  it('checks the webhook signature and refuses a wrong or missing one', () => {
    const body = Buffer.from('{"a":1}');
    const good = 'sha256=' + crypto.createHmac('sha256', 's3').update(body).digest('hex');
    expect(verifySignature(body, good, 's3')).toBe(true);
    expect(verifySignature(body, good, 'other')).toBe(false);
    expect(verifySignature(body, undefined, 's3')).toBe(false);
    expect(verifySignature(body, good, '')).toBe(false);
  });
});
