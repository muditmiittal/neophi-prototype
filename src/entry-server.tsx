import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppRoutes, NOT_FOUND_META, PUBLIC_PAGES, type PageMeta } from './routes';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function head(meta: PageMeta): string {
  // No public hostname has been supplied. Keep canonicals relative rather than inventing one.
  return `<title>${esc(meta.title)}</title>
    <meta name="description" content="${esc(meta.description)}" />
    <link rel="canonical" href="${esc(meta.path)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:url" content="${esc(meta.path)}" />
    <meta property="og:image" content="/brand/og_share_card.jpg" />
    <meta property="og:image:alt" content="Paper memory cards with a red shirt, a note, chai and a scooter." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="/brand/og_share_card.jpg" />
    <meta name="twitter:image:alt" content="Paper memory cards with a red shirt, a note, chai and a scooter." />`;
}

export const pages = PUBLIC_PAGES;

export function render(path: string): { html: string; head: string } {
  const meta = PUBLIC_PAGES.find((p) => p.path === path) ?? NOT_FOUND_META;
  const html = renderToString(
    <StaticRouter location={path}>
      <AppRoutes />
    </StaticRouter>,
  );
  return { html, head: head(meta) };
}

export function appShellHead(): string {
  return head({ path: '/app', title: 'Neophi: your library', description: 'The Neophi prototype app. Demo account, data stays in this browser.' });
}
