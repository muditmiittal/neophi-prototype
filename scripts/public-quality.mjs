// Dependency-free DOM/contrast audit using the existing Playwright browser.
// This is a focused check, not a substitute for axe or a screen-reader audit.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';
const base = process.env.QUALITY_ORIGIN || 'http://localhost:4173';
const routes = ['/', '/connect', '/how-it-works', '/trust', '/compare', '/how-we-measure', '/privacy', '/terms', '/data-deletion'];
const browser = await launchBrowser();
const errors = [];
const failures = [];
const lines = [];
const log = (message) => { lines.push(message); console.log(message); };
await fs.mkdir('SCREENSHOTS/public', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  // Keep synthetic browser fixtures isolated from any running team's inbox/provider.
  await context.route('**/api/inbox**', (route) => route.fulfill({ json: { items: [] } }));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400 && !(new URL(response.url()).pathname === '/api/health' && response.status() === 404)) errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('404 (Not Found)')) errors.push(message.text()); });
  // The static preview has no API: 404 is expected, and means not reachable.
  for (const route of routes) {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}${route}`);
      await page.evaluate(async () => { await globalThis.document.fonts.ready; });
      const result = await page.evaluate(() => {
        const doc = globalThis.document;
        const issues = [];
        if (doc.querySelectorAll('main').length !== 1) issues.push('one main landmark required');
        if (!doc.querySelector('header') || !doc.querySelector('footer') || !doc.querySelector('nav[aria-label]')) issues.push('missing header/footer/named navigation');
        if (doc.querySelectorAll('h1').length !== 1) issues.push('one h1 required');
        let previous = 0;
        for (const heading of doc.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
          const level = Number(heading.tagName.slice(1));
          if (level > previous + 1) issues.push(`heading skip: ${heading.textContent}`);
          previous = level;
        }
        for (const img of doc.querySelectorAll('img')) if (!img.hasAttribute('alt')) issues.push('image missing alt');
        for (const control of doc.querySelectorAll('input:not([type="hidden"]),textarea,select')) {
          if (!control.labels?.length && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')) issues.push(`unlabelled ${control.tagName}`);
        }
        for (const item of doc.querySelectorAll('[tabindex]')) if (item.tabIndex > 0) issues.push('positive tabindex changes focus order');
        if (!doc.querySelector('a[href="#main"]')) issues.push('missing skip link');
        if (doc.documentElement.scrollWidth > globalThis.innerWidth) issues.push('horizontal overflow');
        return issues;
      });
      failures.push(...result.map((issue) => `${route} ${width}: ${issue}`));
      if (['/', '/connect', '/trust', '/privacy'].includes(route) && width !== 768) {
        await page.screenshot({ path: `SCREENSHOTS/public/${route === '/' ? 'home' : route.slice(1)}-${width}.png`, fullPage: true });
      }
    }
    log(`${route}: landmarks, headings, alt text, labels, focus order and overflow checked at 390, 768, 1440`);
  }
  // Audit the actual computed CSS tokens in both palettes.
  await page.goto(`${base}/connect`);
  for (const theme of ['light', 'dark']) {
    const pairs = await page.evaluate((theme) => {
      globalThis.document.documentElement.dataset.theme = theme;
      const style = globalThis.getComputedStyle(globalThis.document.documentElement);
      const value = (key) => style.getPropertyValue(`--${key}`).trim();
      const lum = (hex) => {
        const c = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      };
      const definitions = ['paper', 'paper-deep', 'card'].flatMap((bg) => ['ink', 'ink-soft', 'muted', 'teal', 'vermilion'].map((fg) => [fg, bg]));
      definitions.push(['on-vermilion', 'vermilion'], ['on-teal', 'teal'], ['muted', 'teal-wash'], ['ink-soft', 'vermilion-wash']);
      return definitions.map(([fg, bg]) => {
        const a = lum(value(fg)); const b = lum(value(bg));
        return { pair: `${fg}/${bg}`, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    }, theme);
    for (const { pair, ratio } of pairs) {
      log(`${theme} ${pair}: ${ratio.toFixed(2)}:1`);
      if (ratio < 4.5) failures.push(`${theme} ${pair} below 4.5:1`);
    }
  }
  // Keyboard interaction uses Tab/Shift+Tab and key presses, never programmatic focus/click.
  const tabTo = async (locator) => {
    for (let i = 0; i < 180; i++) {
      if (await locator.evaluateAll((nodes) => nodes.includes(globalThis.document.activeElement))) return;
      await page.keyboard.press('Tab');
    }
    throw new Error('Keyboard target not reached');
  };
  await page.goto(`${base}/app`);
  await page.getByRole('button', { name: 'Start empty', exact: true }).waitFor();
  await tabTo(page.getByRole('button', { name: 'Start empty', exact: true })); await page.keyboard.press('Enter');
  await tabTo(page.getByRole('link', { name: /Save your first one/ })); await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  const captureIssues = await page.getByRole('dialog', { name: 'Save something' }).evaluate((dialog) => [...dialog.querySelectorAll('input,textarea,select')].filter((input) => !input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')).length);
  assert.equal(captureIssues, 0);
  await tabTo(page.getByRole('textbox', { name: 'Link', exact: true }));
  await page.keyboard.type('https://example.com/keyboard-sample');
  await tabTo(page.getByRole('textbox', { name: /Why are you saving it/ }));
  await page.keyboard.type('keyboard sample reason');
  const save = page.getByRole('button', { name: /^Save$/, exact: true });
  await tabTo(save); await page.keyboard.press('Enter');
  await page.waitForURL('**/app/m/*');
  log('Keyboard: opened capture, entered link and exact note, saved and reached memory detail');
  await tabTo(page.getByRole('link', { name: 'Library', exact: true })); await page.keyboard.press('Enter');
  const memory = page.locator('a[href^="/app/m/"]:not([tabindex="-1"])').first();
  await memory.waitFor(); await tabTo(memory); await page.keyboard.press('Enter'); await page.waitForURL('**/app/m/*');
  log('Keyboard: opened a saved memory from Library');
  await tabTo(page.getByRole('searchbox', { name: 'Search your library' }));
  await page.keyboard.type('keyboard'); await page.keyboard.press('Enter');
  await page.waitForURL('**/app/search?q=keyboard');
  await page.locator('.results a[href^="/app/m/"]').first().waitFor();
  log('Keyboard: searched and received the saved memory');
  await page.goto(`${base}/app/capture`);
  await page.getByRole('dialog').waitFor();
  const transfer = await page.evaluateHandle(() => {
    const canvas = globalThis.document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
    const binary = globalThis.atob(canvas.toDataURL('image/png').split(',')[1]);
    const bytes = Uint8Array.from(binary, (letter) => letter.charCodeAt(0));
    const dt = new globalThis.DataTransfer(); dt.items.add(new globalThis.File([bytes], 'synthetic.png', { type: 'image/png' })); return dt;
  });
  await page.locator('.cap-drop').dispatchEvent('drop', { dataTransfer: transfer });
  await page.getByAltText('Key frame of your upload').waitFor();
  log('Capture: dropped a synthetic PNG and produced a local key frame');
  await page.goto(`${base}/`);
  await page.evaluate(() => { globalThis.Storage.prototype.setItem = () => { throw new Error('synthetic storage failure'); }; });
  await page.getByRole('textbox', { name: /Email for the waitlist/ }).fill('sample@example.com');
  await page.getByRole('button', { name: 'Keep my place' }).click();
  await page.getByRole('status').filter({ hasText: 'This browser could not store the address' }).waitFor();
  log('Waitlist: storage failure described accurately; no invalid-address blame');
  // Local response fixtures: no real server, credentials, inbox or paid API involved.
  await page.route('**/api/health', (route) => route.fulfill({ json: { ok: true, instagram: { webhookConfigured: true, inboxSize: 0, captures: 0, lastMediaFetch: 'none yet', relay: 'off', unexpected: 'must not render' } } }));
  await page.goto(`${base}/app/diagnostics`);
  await page.getByRole('heading', { name: 'Local diagnostics' }).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('must not render'));
  log('Diagnostics: local fixture displayed only allowlisted fields');
  await page.unroute('**/api/health');
  await page.route('**/api/health', (route) => route.fulfill({ json: { ok: true } }));
  await page.goto(`${base}/app/diagnostics`);
  assert.equal((await page.locator('body').innerText()).trim(), 'Not available here');
  log('Diagnostics: public health response displayed only Not available here');
  await page.goto(`${base}/connect`);
  await page.getByRole('status').filter({ hasText: /^reachable$/ }).waitFor();
  log('Connect: same-origin ok:true fixture displayed reachable');
  const remote = await browser.newContext();
  const remotePage = await remote.newPage();
  let remoteHealthCalls = 0;
  await remotePage.route('http://neophi.invalid/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/health') remoteHealthCalls++;
    const response = await remote.request.get(`${base}${pathname}`);
    await route.fulfill({ response });
  });
  await remotePage.goto('http://neophi.invalid/app/diagnostics');
  await remotePage.waitForFunction(() => globalThis.document.body.textContent.trim() === 'Not available here');
  assert.equal(remoteHealthCalls, 0);
  log('Diagnostics: non-local browser URL displayed only Not available here; 0 health requests');
  await remotePage.waitForLoadState('networkidle');
  await remotePage.unrouteAll({ behavior: 'wait' });
  await remote.close();
  // Static preview health 404s are expected and are filtered; all other console errors count.
  const unexpected = errors;
  log(`Unexpected browser errors: ${unexpected.length}`);
  failures.push(...unexpected);
  log(`Audit failures: ${failures.length}`);
  for (const failure of failures) log(`FAIL ${failure}`);
  assert.equal(failures.length, 0);
} finally {
  await fs.writeFile('SCREENSHOTS/public/quality-output.txt', lines.join('\n') + '\n');
  await browser.close();
}
