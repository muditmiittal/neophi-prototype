// Re-encode the two read-only brand sources with the already installed browser.
import fs from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await fs.mkdir('public/brand', { recursive: true });
  for (const [name, width, mime, extension] of [['hero_scatter_to_settle', 1376, 'image/webp', 'webp'], ['og_share_card', 1200, 'image/jpeg', 'jpg']]) {
    const source = await fs.readFile(`D:/Neophi/_work/brand/${name}.png`);
    const result = await page.evaluate(async ({ base64, width, mime }) => {
      const img = new globalThis.Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const canvas = globalThis.document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round(img.height * width / img.width);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL(mime, 0.82).split(',')[1];
    }, { base64: source.toString('base64'), width, mime });
    const output = Buffer.from(result, 'base64');
    await fs.writeFile(`public/brand/${name}.${extension}`, output);
    console.log(`${name}: ${source.length} -> ${output.length} bytes (${extension})`);
  }
} finally { await browser.close(); }
