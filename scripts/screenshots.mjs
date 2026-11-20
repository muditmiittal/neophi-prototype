import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

await fs.mkdir('SCREENSHOTS', { recursive: true });
const browser = await launchBrowser();
const errors = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  await page.goto('http://localhost:4173/app');
  await page.getByRole('button', { name: /Load the full sample library/ }).click();
  await page.waitForURL('**/app/today');
  // Explicit synthetic samples, never presented as the user's real activity.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('neophi.v1'));
    const now = new Date();
    state.memories[0].reminderAt = new Date(now.getTime() - 60_000).toISOString();
    state.memories[1].source.channel = 'share';
    state.memories[1].createdAt = now.toISOString();
    state.memories[1].note = 'कल यह देखना · sample note';
    state.memories[2].note = null;
    state.memories[2].momentPins = [{ id: 'sample-pin', from: 0, to: 3, label: 'Sample moment' }];
    localStorage.setItem('neophi.v1', JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    globalThis.dispatchEvent(event);
  });
  await page.getByRole('complementary', { name: 'Install app' }).waitFor();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  console.log('Second-visit install hint and dismissal: passed (synthetic browser offer)');
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
    await page.evaluate(async () => { globalThis.scrollTo({ top: 0, behavior: 'instant' }); await globalThis.document.fonts.ready; await new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))); });
    await page.screenshot({ path: `SCREENSHOTS/today-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth), false, `overflow at ${width}`);
    console.log(`Today ${width}: rendered, no horizontal overflow`);
  }
  const back = page.getByRole('region', { name: 'Back to this', exact: true });
  await back.getByRole('button', { name: 'Not now', exact: true }).first().click();
  await back.getByRole('button', { name: 'Done', exact: true }).first().click();
  assert.equal(await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('neophi.v1')); return s.memories.some((m) => m.resurfaceDoneAt) && s.memories.some((m) => m.resurfaceSnoozedUntil); }), true);
  await page.getByRole('button', { name: 'Add your words', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Your exact words' }).fill('  रविवार को देखना · sample  ');
  await page.getByRole('button', { name: 'Keep my words' }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('neophi.v1')).memories.some((m) => m.note === '  रविवार को देखना · sample  ')), true);
  console.log('Snooze, Done and verbatim Hindi note: passed');
  await page.goto(`http://localhost:4173/app/capture?title=Shared%20sample&text=${encodeURIComponent('कल देखना https://example.com/reel')}`);
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Link', exact: true }).inputValue(), 'https://example.com/reel');
  console.log('Share target prefill: passed');
  console.log(`Online console/page errors: ${errors.length}`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  for (const route of ['today', 'library']) {
    await page.goto(`http://localhost:4173/app/${route}`);
    await page.getByRole('navigation', { name: 'App', exact: true }).waitFor();
    if (route === 'today') await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
    else await page.getByRole('button', { name: /All saves/ }).waitFor();
    console.log(`Offline /app/${route}: passed`);
  }
  await fs.writeFile('SCREENSHOTS/console-errors.json', JSON.stringify(errors, null, 2));
  console.log(`Console/page errors: ${errors.length}`);
  for (const error of [...new Set(errors)]) console.log(error);
} finally { await fs.writeFile('SCREENSHOTS/console-errors.json', JSON.stringify(errors, null, 2)); await browser.close(); }
