// Three small helpers: importing Instagram's own data export, previewing a plain-language rule,
// and counting patterns for the insights card.

import { concepts, sameConcept } from '../ai/text';
import { memoryText } from './categorise';
import { chipLabel, reasonOf, type Rung } from './reason';
import type { Category, Memory, Project } from '../store/types';

// ---- Instagram data export ----
// Instagram's "Download your information" (JSON) puts saved posts in a file such as
// your_instagram_activity/saved/saved_posts.json, shaped like:
//   { "saved_saved_media": [ { "title": "account", "string_map_data": { "Saved on": { "href": "https://...", "timestamp": 1700000000 } } } ] }
// The exact shape has changed over time, so the reader below accepts any JSON and collects every
// instagram.com link it finds with the nearest timestamp. It has been tested on a hand-made file only.

export interface ImportedSave {
  url: string;
  savedAt?: string;
  author?: string;
}

export function readInstagramExport(json: unknown): ImportedSave[] {
  const out = new Map<string, ImportedSave>();
  const walk = (node: unknown, author?: string) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, author));
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    const title = typeof o.title === 'string' && o.title ? o.title : author;
    const href = typeof o.href === 'string' ? o.href : typeof o.link === 'string' ? o.link : undefined;
    if (href && /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\//.test(href) && !out.has(href)) {
      const ts = typeof o.timestamp === 'number' && o.timestamp > 0 ? new Date(o.timestamp * 1000).toISOString() : undefined;
      out.set(href, { url: href, savedAt: ts, author: title });
    }
    Object.values(o).forEach((v) => walk(v, title));
  };
  walk(json);
  return [...out.values()];
}

// ---- Plain-language rules (preview only) ----

export interface ParsedRule {
  keyword: string;
  targetKind: 'project' | 'category';
  targetId: string;
  targetName: string;
}

export function parseRule(text: string, categories: Category[], projects: Project[]): ParsedRule | { error: string } {
  const m = text.trim().match(/(?:anything|everything|saves?|all)?\s*(?:about|with|mentioning|on)\s+(.+?)\s+(?:goes|go|belongs?|should go)\s+(?:to|in|into|under)\s+(.+?)\.?$/i);
  if (!m) return { error: 'Write it like this: anything about Goa goes to Goa trip.' };
  const keyword = m[1].replace(/^["']|["']$/g, '').trim();
  const wanted = m[2].replace(/^["']|["']$/g, '').trim().toLowerCase();
  const project = projects.find((p) => p.name.toLowerCase() === wanted) ?? projects.find((p) => p.name.toLowerCase().includes(wanted) || wanted.includes(p.name.toLowerCase()));
  if (project) return { keyword, targetKind: 'project', targetId: project.id, targetName: project.name };
  const category = categories.find((c) => c.name.toLowerCase() === wanted) ?? categories.find((c) => c.name.toLowerCase().includes(wanted) || wanted.includes(c.name.toLowerCase()));
  if (category) return { keyword, targetKind: 'category', targetId: category.id, targetName: category.name };
  return { error: `There is no project or category called "${m[2].trim()}". Check the name, or make it first.` };
}

export function previewRule(rule: Pick<ParsedRule, 'keyword' | 'targetKind' | 'targetId'>, memories: Memory[]): { wouldAdd: Memory[]; alreadyThere: Memory[] } {
  const want = concepts(rule.keyword);
  const matches = memories.filter((m) => {
    if (m.private) return false; // private memories are never touched by rules
    const have = concepts(memoryText(m));
    return want.length > 0 && want.every((w) => have.some((h) => sameConcept(w, h)));
  });
  const inTarget = (m: Memory) => (rule.targetKind === 'project' ? m.projectIds.includes(rule.targetId) : m.categoryId === rule.targetId);
  return { wouldAdd: matches.filter((m) => !inTarget(m)), alreadyThere: matches.filter(inTarget) };
}

// ---- Insights ----

export interface Insight {
  kind: 'counted' | 'ai';
  text: string;
}

export function insights(memories: Memory[], categories: Category[], projects: Project[]): Insight[] {
  const visible = memories.filter((m) => !m.private && m.status === 'ready');
  if (visible.length < 3) return [];
  const out: Insight[] = [];
  const rungs: Record<Rung, number> = { said: 0, chose: 0, inferred: 0, unknown: 0 };
  visible.forEach((m) => rungs[reasonOf({ ...m, projectNames: m.projectIds.map((p) => projects.find((x) => x.id === p)?.name ?? '') }).rung]++);
  out.push({ kind: 'counted', text: `${rungs.said} of ${visible.length} saves carry a reason in your own words. ${rungs.chose} have one you chose with a tap, ${rungs.inferred} rest on an AI suggestion, ${rungs.unknown} ${rungs.unknown === 1 ? 'is' : 'are'} unknown.` });

  const chips = new Map<string, number>();
  visible.forEach((m) => m.chosenIntent && chips.set(m.chosenIntent, (chips.get(m.chosenIntent) ?? 0) + 1));
  const top = [...chips.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) out.push({ kind: 'counted', text: `The chip you tap most is "${chipLabel(top[0] as never)}": ${top[1]} of ${visible.length} saves.` });

  const hinglish = visible.filter((m) => m.note && m.noteLanguage !== 'en').length;
  if (hinglish) out.push({ kind: 'counted', text: `${hinglish} of your notes ${hinglish === 1 ? 'is' : 'are'} in Hindi or Hinglish.` });

  const biggest = categories.map((c) => ({ c, n: visible.filter((m) => m.categoryId === c.id).length })).sort((a, b) => b.n - a.n)[0];
  if (biggest?.n >= 3) out.push({ kind: 'ai', text: `"${biggest.c.name}" is growing fastest. It may be turning into a goal: you could make it a project.` });
  return out;
}
