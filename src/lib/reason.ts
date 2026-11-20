// The intent ladder: one reason per memory, with a stated source of truth, strongest first.
// 1 you said it, 2 you chose it, 3 AI inferred it, 4 unknown.

import { NOT_SURE_BELOW } from '../ai/guard';
import type { MemoryAnalysis } from '../ai/types';
import { INTENT_CHIPS, type IntentChip } from '../store/types';

export type Rung = 'said' | 'chose' | 'inferred' | 'unknown';

export interface Reason {
  rung: Rung;
  text: string;
}

export const RUNGS: { id: Rung; title: string; blurb: string }[] = [
  { id: 'said', title: 'You said it', blurb: 'Your exact words' },
  { id: 'chose', title: 'You chose it', blurb: 'A chip or a project' },
  { id: 'inferred', title: 'AI inferred it', blurb: 'Labelled, with evidence' },
  { id: 'unknown', title: 'Unknown', blurb: 'Left empty' },
];

export const chipLabel = (chip: IntentChip): string => INTENT_CHIPS.find((c) => c.id === chip)?.label ?? chip;

export function bestSuggestion(analysis: MemoryAnalysis | null, removed = false) {
  if (!analysis || removed) return null;
  const usable = analysis.inferred_possible_intents.filter((i) => !i.uncertain && i.confidence >= NOT_SURE_BELOW);
  return usable.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

export function reasonOf(m: {
  note: string | null;
  chosenIntent: IntentChip | null;
  analysis: MemoryAnalysis | null;
  suggestionsRemoved?: boolean;
  projectNames?: string[];
}): Reason {
  if (m.note) return { rung: 'said', text: m.note };
  if (m.chosenIntent) return { rung: 'chose', text: chipLabel(m.chosenIntent) };
  if (m.projectNames?.length) return { rung: 'chose', text: `For: ${m.projectNames[0]}` };
  const s = bestSuggestion(m.analysis, m.suggestionsRemoved);
  if (s) return { rung: 'inferred', text: s.intent };
  return { rung: 'unknown', text: 'No reason recorded' };
}

/** Which rungs hold a value at all (the active one is the strongest of these). */
export function filledRungs(m: Parameters<typeof reasonOf>[0]): Rung[] {
  const out: Rung[] = [];
  if (m.note) out.push('said');
  if (m.chosenIntent || m.projectNames?.length) out.push('chose');
  if (bestSuggestion(m.analysis, m.suggestionsRemoved)) out.push('inferred');
  return out;
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
