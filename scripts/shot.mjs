// Quick look: node scripts/shot.mjs <path> <out.png> [width] [fullPage] [theme] [reduced]
import path from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium } from './browser.mjs';

const [, , route = '/', out = 'shot.png', width = '1440', full = '1', theme = 'light', reduced = '0'] = process.argv;
const browser = await chromium.launch({ executablePath: findChromium() });
const ctx = await browser.newContext({
  viewport: { width: Number(width), height: Number(width) < 600 ? 844 : 900 },
  colorScheme: theme,
  reducedMotion: reduced === '1' ? 'reduce' : 'no-preference',
  serviceWorkers: 'block',
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${process.env.PORT || 4173}${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.screenshot({ path: path.resolve(out), fullPage: full === '1' });
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
