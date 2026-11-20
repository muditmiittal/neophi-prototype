// Seeds the demo library (click the full-sample button), then photographs the app at two widths.
// node scripts/shots-app.mjs   (server on PORT, default 4173)
import path from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium } from './browser.mjs';

const base = `http://localhost:${process.env.PORT || 4173}`;
const out = (n) => path.resolve('SCREENSHOTS', `${n}.png`);
const browser = await chromium.launch({ executablePath: findChromium() });
const errors = [];
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag} ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${tag} ${e}`));
  await page.goto(`${base}/app`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Load the full sample library/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: out(`library-${tag}`) });
  await page.goto(`${base}/app/m/s-dance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(`memory-detail-${tag}`), fullPage: true });
  await page.goto(`${base}/app/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(`projects-${tag}`), fullPage: true });
  await page.goto(`${base}/app/search`, { waitUntil: 'networkidle' });
  const box = page.locator('input').first();
  await box.fill('red shirt dance last month');
  await box.press('Enter');
  await page.waitForTimeout(900);
  await page.screenshot({ path: out(`search-${tag}`), fullPage: true });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
