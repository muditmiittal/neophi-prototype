// Serves the built site from dist/ with the two rules a static host needs:
//   /app/*        -> dist/app/index.html   (the client-only app)
//   anything else -> the prerendered file, or dist/404.html with status 404
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, file) {
  const ext = path.extname(file);
  res.writeHead(status, {
    'content-type': types[ext] || 'application/octet-stream',
    'cache-control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run "npm run build" first (or "npm start", which does both).');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const clean = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    const target = path.join(dist, clean);
    if (!target.startsWith(dist)) return send(res, 404, path.join(dist, '404.html'));
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return send(res, 200, target);
    const index = path.join(target, 'index.html');
    if (fs.existsSync(index)) return send(res, 200, index);
    if (url.pathname === '/app' || url.pathname.startsWith('/app/')) return send(res, 200, path.join(dist, 'app', 'index.html'));
    return send(res, 404, path.join(dist, '404.html'));
  })
  .listen(port, () => console.log(`Neophi prototype: http://localhost:${port}`));
