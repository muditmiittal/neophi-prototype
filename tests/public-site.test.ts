import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Connect } from '../src/pages/Connect';
import { Diagnostics, localDiagnostics } from '../src/app/Diagnostics';
import { pages, render } from '../src/entry-server';

describe('public capture and metadata contracts', () => {
  it('explains all three methods, their restrictions and real install instructions', () => {
    const html = renderToStaticMarkup(createElement(StaticRouter, { location: '/connect' }, createElement(Connect)));
    for (const text of ['Share from your phone', 'DM a Reel on Instagram', 'Paste a link or drop a screenshot', 'Testers only', 'Meta&#x27;s development mode', 'Android', 'Chrome', 'Safari', 'not an iOS Share extension', 'not reachable']) expect(html).toContain(text);
    expect(html).toContain('no installation');
  });
  it('renders unique titles, descriptions and matching canonicals for every public page', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const page of pages) {
      const { head, html } = render(page.path);
      const title = head.match(/<title>(.*?)<\/title>/)?.[1];
      const description = head.match(/name="description" content="([^"]+)"/)?.[1];
      expect(title).toBeTruthy(); expect(description).toBeTruthy();
      expect(titles.has(title!)).toBe(false); expect(descriptions.has(description!)).toBe(false);
      titles.add(title!); descriptions.add(description!);
      expect(head).toContain(`rel="canonical" href="${page.path}"`);
      expect(head).toContain('name="twitter:card"');
      expect(head).toContain('/brand/og_share_card.jpg');
      expect(html).toContain('<h1');
    }
    expect(pages.some((page) => page.path === '/connect')).toBe(true);
  });
});

describe('local diagnostics boundary', () => {
  it('shows only the unavailable message until a local server provides its local section', () => {
    expect(renderToStaticMarkup(createElement(Diagnostics))).toBe('Not available here');
    expect(localDiagnostics({ ok: true }, 'localhost')).toBeNull();
    expect(localDiagnostics({ ok: true, instagram: {} }, 'demo.example')).toBeNull();
    expect(localDiagnostics({ ok: true, instagram: {} }, 'localhost.example')).toBeNull();
  });
  it('selects only count and status fields, never arbitrary health data', () => {
    const result = localDiagnostics({ ok: true, instagram: { webhookConfigured: true, inboxSize: 2, captures: 3, lastMediaFetch: 'http_403', relay: 'off', unexpected: 'omit this' }, unexpected: 'omit too' }, '127.0.0.1');
    expect(result).toMatchObject({ webhookConfigured: true, inboxSize: 2, counts: { captures: 3 }, lastMediaFetch: 'http_403', relay: 'off' });
    expect(JSON.stringify(result)).not.toContain('omit');
  });
});
