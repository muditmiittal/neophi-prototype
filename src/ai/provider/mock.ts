// The default provider. Deterministic: the same input always gives the same analysis.
// Sample saves get a prepared analysis. Anything else gets rules that only use what is actually on hand:
// the user's note, the caption, the link, and colours measured from an upload on the device.

import { SAMPLE_SAVES } from '../../data/sample/saves';
import { exactNote, guardAnalysis, sourceReadable } from '../guard';
import { COLOUR_WORDS, concepts, localEmbed } from '../text';
import type { AIProvider, AnalyseInput, MemoryAnalysis, Purpose, RawAnalysis, SuggestedAction } from '../types';

const PURPOSE_WORDS: Record<Exclude<Purpose, 'other' | 'try_later'>, string[]> = {
  food: ['cook', 'food', 'paneer', 'tea', 'bread', 'dosa', 'curry', 'sunday', 'weekend', 'dinner', 'lunch', 'breakfast', 'cafe'],
  travel: ['go', 'beach', 'road', 'goa', 'place', 'hotel', 'trek', 'fort', 'flight', 'stay', 'scooter'],
  shop: ['buy', 'shirt', 'shoes', 'dress', 'shelf', 'lamp', 'order', 'cost', 'kurti', 'saree', 'lehenga', 'jacket'],
  create: ['hook', 'caption', 'edit', 'shot', 'transition', 'content', 'script', 'angle', 'launch', 'thumbnail'],
  learn: ['learn', 'how', 'tutorial', 'seekhna', 'study', 'explain', 'tip', 'course', 'exercise'],
};

const INTENT_FOR: Record<Purpose, string> = {
  food: 'Cook or try this',
  travel: 'Go to this place',
  shop: 'Look for this to buy',
  create: 'Use this as a reference for your own content',
  learn: 'Learn how this is done',
  try_later: 'Try this later',
  other: '',
};

const ACTIONS_FOR: Record<Purpose, SuggestedAction[]> = {
  food: ['recipe_steps', 'set_reminder'],
  travel: ['itinerary_stop', 'set_reminder'],
  shop: ['set_reminder'],
  create: ['content_brief'],
  learn: ['set_reminder'],
  try_later: ['set_reminder'],
  other: ['set_reminder'],
};

function guessPurpose(text: string): { purpose: Purpose; hits: string[] } {
  const found = concepts(text);
  let best: { purpose: Purpose; hits: string[] } = { purpose: 'other', hits: [] };
  for (const [purpose, list] of Object.entries(PURPOSE_WORDS) as [Purpose, string[]][]) {
    const hits = found.filter((c) => list.includes(c));
    if (hits.length > best.hits.length) best = { purpose, hits };
  }
  return best;
}

export function ruleBasedRaw(input: AnalyseInput): RawAnalysis {
  const note = exactNote(input.note);
  const readable = sourceReadable(input.sourceState);
  const evidence: Record<string, unknown>[] = [];
  if (note) evidence.push({ id: 'n1', kind: 'note', ref: `your note: "${note}"` });
  if (input.caption) evidence.push({ id: 'c1', kind: 'caption', ref: `caption: "${input.caption}"` });

  const observed: Record<string, unknown>[] = [];
  let summary = '';
  let grounding: Record<string, unknown> = {};

  if (readable && input.local) {
    const { width, height, colours } = input.local;
    const shape = height > width * 1.1 ? 'portrait' : width > height * 1.1 ? 'landscape' : 'square';
    evidence.push({ id: 'f0', kind: 'frame', ref: input.mediaKind === 'video' ? 'key frame of your upload' : 'your upload', bbox: { x: 0, y: 0, w: 100, h: 100 } });
    summary = `Your upload: a ${shape} ${input.mediaKind === 'video' ? 'video' : 'image'}, ${width} x ${height} pixels${
      input.durationSec ? `, ${Math.round(input.durationSec)} seconds long` : ''
    }. Measured on this device.`;
    colours.slice(0, 3).forEach((c, i) => {
      const id = `f${i + 1}`;
      evidence.push({ id, kind: 'frame', ref: `${c.name} area in the frame`, bbox: c.bbox });
      observed.push({
        label: `A ${c.name} area (about ${Math.round(c.share * 100)}% of the frame)`,
        where: 'frame',
        bbox: c.bbox,
        confidence: Math.min(0.95, 0.55 + c.share),
        evidence: id,
      });
    });
    if (note) {
      const asked = concepts(note).filter((c) => COLOUR_WORDS.includes(c));
      const hitIndex = colours.slice(0, 3).findIndex((c) => asked.includes(c.name));
      grounding =
        hitIndex >= 0
          ? {
              status: 'grounded',
              evidence: [`f${hitIndex + 1}`],
              explanation: `Found a ${colours[hitIndex].name} area here. The mock provider matches colour only; it cannot tell what the object is.`,
            }
          : {
              status: 'not_sure',
              explanation: 'The mock provider measures colours only, so it cannot tell which part of the picture your note is about.',
            };
    }
  }

  const { purpose, hits } = guessPurpose([note ?? '', input.caption ?? '', input.url ?? ''].join(' '));
  const intents: Record<string, unknown>[] = [];
  if (purpose !== 'other') {
    // A suggestion drawn from the user's own note is still only a suggestion.
    intents.push({ intent: INTENT_FOR[purpose], confidence: Math.min(0.75, 0.4 + hits.length * 0.12), evidence: note ? 'n1' : input.caption ? 'c1' : undefined });
  }

  return {
    source_summary: summary,
    evidence,
    observed_objects: observed,
    visible_text: [],
    transcript_summary: '',
    // Deliberately wrong: a provider must not be able to set this. The guard throws it away.
    explicit_user_intent: note ? `(${purpose}) ${note}` : 'guessed reason',
    inferred_possible_intents: intents,
    actionable_entities: [],
    suggested_actions: ACTIONS_FOR[purpose],
    purpose,
    note_grounding: grounding,
  };
}

export function createMockProvider(delayMs = 900): AIProvider {
  return {
    name: 'mock',
    async analyse(input: AnalyseInput): Promise<MemoryAnalysis> {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      const sample = input.sampleId ? SAMPLE_SAVES.find((s) => s.id === input.sampleId) : undefined;
      const raw = sample ? sample.raw : ruleBasedRaw(input);
      return guardAnalysis(raw, input, 'mock');
    },
    async embed(text: string): Promise<number[]> {
      return localEmbed(text);
    },
  };
}
