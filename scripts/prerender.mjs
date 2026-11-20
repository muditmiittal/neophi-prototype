// After the two Vite builds: write a ready-made HTML file for every public page, a bare shell for the app,
// and 404.html. Runs from `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const server = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
// Set this to the verified public origin before publishing. Local builds use relative URLs.
const siteOrigin = process.env.PUBLIC_SITE_URL ? new URL(process.env.PUBLIC_SITE_URL).origin : null;
function publicHead(head) {
  return siteOrigin ? head.replace(/(href|content)="(\/[^"]*)"/g, (_match, attribute, value) => `${attribute}="${new URL(value, siteOrigin).href}"`) : head;
}

const page = ({ html, head }) =>
  template
    .replace('<!--head-->', publicHead(head))
    .replace('<div id="root"><!--app--></div>', `<div id="root" data-prerendered="true">${html}</div>`);

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

for (const p of server.pages) {
  const file = p.path === '/' ? path.join(dist, 'index.html') : path.join(dist, p.path.slice(1), 'index.html');
  write(file, page(server.render(p.path)));
}
write(path.join(dist, '404.html'), page(server.render('/404')));
// The app is client-only: an empty root, rendered in the browser.
write(path.join(dist, 'app', 'index.html'), template.replace('<!--head-->', server.appShellHead()).replace('<!--app-->', ''));
// Include lazy app chunks and fonts, not only the entry module in the HTML.
write(path.join(dist, 'shell-assets.json'), JSON.stringify(fs.readdirSync(path.join(dist, 'assets')).map((name) => `/assets/${name}`)));

fs.rmSync(ssrDir, { recursive: true, force: true });
console.log(`Prerendered ${server.pages.length} public pages, the app shell and 404.html.`);
