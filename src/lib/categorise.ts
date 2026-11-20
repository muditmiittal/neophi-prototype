// Sorting a new save into the user's own categories. Deliberately simple in the prototype:
// compare the save's words with the words already in each category, and explain the choice.

import { concepts, cosine, localEmbed } from '../ai/text';
import type { Purpose } from '../ai/types';
import { chipLabel } from './reason';
import type { Category, Memory } from '../store/types';

const DEFAULT_NAME: Record<Purpose, string> = {
  food: 'Food to try',
  travel: 'Places to go',
  shop: 'Things to buy',
  create: 'Content ideas',
  learn: 'Things to learn',
  try_later: 'Try later',
  other: '',
};

export function memoryText(m: Memory): string {
  return [m.note ?? '', ...m.extraNotes.map((n) => n.text), m.source.caption ?? '', m.title, m.private ? '' : (m.analysis?.source_summary ?? '')].join(' ');
}

function sharedWords(memories: Memory[]): string[] {
  const count = new Map<string, number>();
  for (const m of memories) for (const c of new Set(concepts([m.note ?? '', m.source.caption ?? ''].join(' ')))) count.set(c, (count.get(c) ?? 0) + 1);
  return [...count.entries()]
    .filter(([, n]) => n >= Math.min(2, memories.length))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([w]) => w);
}

/** A fresh "why this category" line from what is in it now. */
export function whyFor(memories: Memory[]): string {
  if (memories.length === 0) return 'Empty for now.';
  const words = sharedWords(memories);
  const count = `${memories.length} ${memories.length === 1 ? 'save' : 'saves'}`;
  const withNote = memories.filter((m) => m.note).length;
  if (words.length) return `${count}. Your notes and the captions share ${words.map((w) => `"${w}"`).join(' and ')}.`;
  if (withNote) return `${count}, ${withNote} with a note from you.`;
  return `${count}, grouped by what the source shows.`;
}

export interface Placement {
  categoryId: string | null;
  create?: { name: string; why: string };
  explanation: string;
}

export function placeMemory(m: Memory, categories: Category[], memories: Memory[]): Placement {
  if (m.private) return { categoryId: null, explanation: 'Private memories are not sorted by AI.' };
  const text = memoryText(m);
  if (concepts(text).length === 0) return { categoryId: null, explanation: 'Nothing to go on yet, so it stays in Not sure yet.' };
  const v = localEmbed(text);
  let best: { cat: Category; score: number } | null = null;
  for (const cat of categories) {
    const members = memories.filter((x) => x.categoryId === cat.id && x.id !== m.id);
    const corpus = [cat.name, ...members.map(memoryText)].join(' ');
    const score = cosine(v, localEmbed(corpus));
    if (!best || score > best.score) best = { cat, score };
  }
  if (best) {
    const mine = new Set(concepts(text));
    const theirs = new Set(concepts([best.cat.name, ...memories.filter((x) => x.categoryId === best!.cat.id).map(memoryText)].join(' ')));
    const shared = [...mine].filter((w) => theirs.has(w)).slice(0, 2);
    // A match with no shared word needs a clearly higher score: a save that is unlike everything else should start its own category, not be forced into the nearest one.
    if (best.score >= (shared.length ? 0.2 : 0.4)) {
      return {
        categoryId: best.cat.id,
        explanation: shared.length ? `Placed in ${best.cat.name} because it shares ${shared.map((w) => `"${w}"`).join(' and ')} with saves already there.` : `Placed in ${best.cat.name}: closest match to what is already there.`,
      };
    }
  }
  const purpose = m.analysis?.purpose ?? 'other';
  const name = DEFAULT_NAME[purpose];
  if (name) {
    const existing = categories.find((c) => c.name === name);
    if (existing) return { categoryId: existing.id, explanation: `Placed in ${name}: it looks like something to ${purpose === 'shop' ? 'buy' : purpose}.` };
    return {
      categoryId: null,
      create: { name, why: 'Started from 1 save. Nothing you saved before was like it.' },
      explanation: `Started a new category, ${name}, because nothing you saved before was like it.`,
    };
  }
  if (m.chosenIntent) return { categoryId: null, explanation: `You chose ${chipLabel(m.chosenIntent)}, but there is not enough to pick a category.` };
  return { categoryId: null, explanation: 'Not enough to pick a category, so it stays in Not sure yet.' };
}
