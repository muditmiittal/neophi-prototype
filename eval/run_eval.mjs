// Runs the eval set against a running Neophi server and writes eval/results.json and eval/REPORT.md.
// Usage:  node eval/run_eval.mjs [items.json] [--base http://127.0.0.1:8787] [--concurrency 2] [--media-dir ./eval/media]
// Needs the server to have Gemini on (GOOGLE_CLOUD_PROJECT + NEOPHI_PROVIDER=vertex, or GEMINI_API_KEY). Never prints secrets.
// What it measures (structural only; a human or judge must still check that cited evidence really supports each claim):
//   evidence-reference rate, abstention rate on items that should be unreadable, latency percentiles, tokens, cost under both price tables.
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a) => a.endsWith('.json')) ?? 'eval/items.seed.json';
const base = flag('--base', 'http://127.0.0.1:8787');
const concurrency = Number(flag('--concurrency', '2'));
const mediaDir = flag('--media-dir', 'eval/media');
// USD per 1M tokens (Vertex pricing read 20 Nov 2026 by the research: introductory through 31 Dec 2026, standard from 1 Jan 2027). Re-check before quoting.
const PRICE = { intro2026: { in: 0.75, out: 3.75 }, std2027: { in: 1.5, out: 7.5 } };
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const { items } = JSON.parse(fs.readFileSync(file, 'utf8'));
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] : null);

async function one(item) {
  const input = { url: item.url ?? null, caption: item.caption || null, note: item.note || null, sourceState: item.mediaFailure ? 'unavailable' : null };
  let attached = false;
  if (item.media && !item.media.startsWith('REPLACE_')) {
    const p = path.join(mediaDir, item.media);
    const ext = path.extname(p).toLowerCase();
    if (MIME[ext] && fs.existsSync(p)) { input.imageDataUrl = `data:${MIME[ext]};base64,${fs.readFileSync(p).toString('base64')}`; attached = true; }
  }
  const t0 = performance.now();
  try {
    const r = await fetch(`${base}/api/analyse`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }), signal: AbortSignal.timeout(120_000) });
    const ms = performance.now() - t0;
    if (!r.ok) return { id: item.id, category: item.category, ok: false, status: r.status, ms };
    const { raw, usage, withMedia } = await r.json();
    const ids = new Set((raw.evidence ?? []).map((e) => e.id));
    const objs = raw.observed_objects ?? [];
    const withEvidence = objs.filter((o) => o.evidence && ids.has(o.evidence)).length;
    const claims = [...objs.map((o) => o.label), ...(raw.actionable_entities ?? []).map((e) => e.name)];
    const abstained = (raw.note_grounding?.status === 'not_sure' || raw.note_grounding?.status === 'no_note' || (raw.intent_confidence ?? 1) < 0.4) && objs.length === 0;
    return { id: item.id, category: item.category, ok: true, ms, attached, withMedia, objects: objs.length, withEvidence, invalidEvidence: objs.length - withEvidence, claims: claims.length, abstained, expectUnreadable: Boolean(item.expectUnreadable), inTok: usage?.promptTokenCount ?? 0, outTok: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0), summary: String(raw.source_summary ?? '').slice(0, 160) };
  } catch (e) {
    return { id: item.id, category: item.category, ok: false, error: e instanceof Error ? e.message : 'error', ms: performance.now() - t0 };
  }
}

const results = [];
let next = 0;
await Promise.all(Array.from({ length: concurrency }, async () => { while (next < items.length) { const i = next++; const r = await one(items[i]); results.push(r); process.stdout.write(r.ok ? '.' : 'x'); } }));
console.log();
results.sort((a, b) => a.id.localeCompare(b.id));

const ok = results.filter((r) => r.ok);
const sum = (k) => ok.reduce((a, r) => a + (r[k] ?? 0), 0);
const cost = (t) => ok.map((r) => (r.inTok * PRICE[t].in + r.outTok * PRICE[t].out) / 1e6);
const unread = ok.filter((r) => r.expectUnreadable);
const lat = ok.map((r) => r.ms);
const summary = {
  items: results.length, succeeded: ok.length, failed: results.length - ok.length,
  objects: sum('objects'), withEvidence: sum('withEvidence'), evidenceReferenceRate: sum('objects') ? sum('withEvidence') / sum('objects') : null,
  invalidEvidence: sum('invalidEvidence'),
  unreadableItems: unread.length, abstainedOnUnreadable: unread.filter((r) => r.abstained).length, fabricatedOnUnreadable: unread.filter((r) => r.objects > 0).length,
  latencyMs: { p50: pct(lat, 50), p90: pct(lat, 90), p95: pct(lat, 95), max: Math.max(0, ...lat) },
  tokens: { inMean: sum('inTok') / (ok.length || 1), outMean: sum('outTok') / (ok.length || 1) },
  costUsdPerSave: { intro2026: { mean: sum('inTok') ? cost('intro2026').reduce((a, b) => a + b, 0) / ok.length : 0, p95: pct(cost('intro2026'), 95) }, std2027: { mean: cost('std2027').reduce((a, b) => a + b, 0) / (ok.length || 1), p95: pct(cost('std2027'), 95) } },
  note: 'Structural checks only. A citation that exists is not proof that it supports the claim: add the blind judge pass and a 15-item human spot check (docs/05_TRAINING_AND_DATA.md).',
};
fs.writeFileSync('eval/results.json', JSON.stringify({ summary, results }, null, 2));
const md = [`# Eval report`, '', `Run on ${new Date().toISOString()} against ${base}, ${results.length} items (${ok.length} succeeded).`, '',
  `| Measure | Value |`, `|---|---|`,
  `| Evidence reference rate (objects with a valid evidence id) | ${summary.withEvidence} of ${summary.objects} |`,
  `| Unreadable items | ${summary.unreadableItems}: abstained ${summary.abstainedOnUnreadable}, produced observations anyway ${summary.fabricatedOnUnreadable} |`,
  `| Latency p50 / p90 / p95 / max (ms) | ${Math.round(summary.latencyMs.p50 ?? 0)} / ${Math.round(summary.latencyMs.p90 ?? 0)} / ${Math.round(summary.latencyMs.p95 ?? 0)} / ${Math.round(summary.latencyMs.max)} |`,
  `| Mean tokens in / out | ${Math.round(summary.tokens.inMean)} / ${Math.round(summary.tokens.outMean)} |`,
  `| Cost per save, 2026 introductory prices (mean / p95) | $${summary.costUsdPerSave.intro2026.mean.toFixed(4)} / $${(summary.costUsdPerSave.intro2026.p95 ?? 0).toFixed(4)} |`,
  `| Cost per save, 2027 standard prices (mean / p95) | $${summary.costUsdPerSave.std2027.mean.toFixed(4)} / $${(summary.costUsdPerSave.std2027.p95 ?? 0).toFixed(4)} |`, '', summary.note, ''].join('\n');
fs.writeFileSync('eval/REPORT.md', md);
console.log(md);
