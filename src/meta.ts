export interface PageMeta {
  path: string;
  title: string;
  description: string;
}

export const PUBLIC_PAGES: PageMeta[] = [
  { path: '/connect', title: 'Send a Reel to Neophi: connect and install', description: 'Three ways to save: Android sharing, Instagram DMs for testers only in Meta development mode, or paste a link and upload a screenshot. Phone installation steps.' },
  { path: '/', title: 'Neophi: you saved it for a reason', description: 'A memory layer for what you save online. Neophi keeps each save with your own reason, sorts your library around you, and finds it again when you only half remember it. Prototype.' },
  { path: '/how-it-works', title: 'How Neophi works', description: 'Capture, say why, understand with evidence, place, find and use. What runs in the prototype and what is planned.' },
  { path: '/trust', title: 'Trust: how Neophi treats a memory', description: 'Your exact words stay untouched, AI suggestions are separate and labelled, every interpretation links to evidence, and Neophi says when it is not sure.' },
  { path: '/compare', title: 'An honest comparison: Neophi', description: 'What Neophi does today, what is planned, and what other tools say about themselves. As of 14 Nov 2026.' },
  { path: '/how-we-measure', title: 'How we measure: Neophi', description: 'A small 12-item analysis test measured on 20 Nov 2026, its limits, and the planned head-to-head retrieval benchmark.' },
  { path: '/privacy', title: 'Privacy: Neophi', description: 'What the Neophi prototype stores, where, and for how long.' },
  { path: '/terms', title: 'Terms: Neophi', description: 'Plain terms for the Neophi prototype.' },
  { path: '/data-deletion', title: 'Data deletion: Neophi', description: 'How to delete one memory, everything, or ask us to delete data.' },
];

export const NOT_FOUND_META: PageMeta = { path: '/404', title: 'Page not found: Neophi', description: 'This page does not exist.' };
