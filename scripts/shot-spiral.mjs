/* global document, window */
import path from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium } from './browser.mjs';
const base = `http://localhost:${process.env.PORT || 4173}`;
const b = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  await p.goto(`${base}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(13000);
  console.log(tag, 'spiral on:', await p.evaluate(() => document.documentElement.hasAttribute('data-spiral-on')), 'canvases:', await p.locator('[data-spiral] canvas').count());
  await p.screenshot({ path: path.resolve('SCREENSHOTS', `spiral-home-${tag}.png`) });
  await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(2500);
  await p.screenshot({ path: path.resolve('SCREENSHOTS', `spiral-scrolled-${tag}.png`) });
  console.log(tag, errs.length ? errs.join(' | ') : 'no console errors');
  await ctx.close();
}
await b.close();
