// Rasterise the existing SVG with installed Chromium; no canvas or new dependency.
import fs from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';

const mark = await fs.readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
await fs.mkdir(new URL('../public/icons/', import.meta.url), { recursive: true });
const browser = await launchBrowser();
try {
  for (const [name, size, maskable] of [['icon-192', 192, false], ['icon-512', 512, false], ['maskable-512', 512, true]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#f4ecdc}body{display:grid;place-items:center}svg{width:${maskable ? '64%' : '100%'};height:${maskable ? '64%' : '100%'}}</style>${mark}`);
    await page.screenshot({ path: new URL(`../public/icons/${name}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
    await page.close();
    console.log(`Generated ${name}.png: ${size} x ${size}`);
  }
} finally { await browser.close(); }
