import { describe, expect, it } from 'vitest';
import { exactNote, guardAnalysis } from '../src/ai/guard';
import { createMockProvider, ruleBasedRaw } from '../src/ai/provider/mock';
import type { AnalyseInput, RawAnalysis } from '../src/ai/types';
import { SAMPLE_SAVES } from '../src/data/sample/saves';

const base: AnalyseInput = { mediaKind: 'video', sourceState: 'available' };

describe('Rule 1: explicit_user_intent is the user note or null', () => {
  it('discards whatever the model wrote and keeps the note exactly as typed', () => {
    const raw: RawAnalysis = { explicit_user_intent: 'User wants to buy a red shirt for a wedding' };
    const note = '  the red shirt!!  ';
    const out = guardAnalysis(raw, { ...base, note }, 'gemini');
    expect(out.explicit_user_intent).toBe(note);
  });

  it('is null when the user typed nothing, even if the model filled it', () => {
    const raw: RawAnalysis = { explicit_user_intent: 'Wants to visit this shack' };
    for (const note of [undefined, null, '', '   ', '\n\t']) {
      expect(guardAnalysis(raw, { ...base, note }, 'gemini').explicit_user_intent).toBeNull();
    }
  });

  it('keeps Hindi and Hinglish notes byte for byte', () => {
    for (const note of ['बालकनी के लिए, ये वाला shelf', 'Sunday ko banana hai, kasuri methi wala step']) {
      expect(guardAnalysis({}, { ...base, note }, 'mock').explicit_user_intent).toBe(note);
      expect(exactNote(note)).toBe(note);
    }
  });

  it('holds for every sample save and for the rule-based fallback', async () => {
    const mock = createMockProvider(0);
    for (const s of SAMPLE_SAVES) {
      const out = await mock.analyse({ sampleId: s.id, note: s.note, mediaKind: s.mediaKind, sourceState: s.stateAtSave });
      expect(out.explicit_user_intent).toBe(s.note);
    }
    const typed = 'laal shirt wala';
    expect(ruleBasedRaw({ ...base, note: typed }).explicit_user_intent).not.toBe(typed); // the raw output is deliberately wrong
    expect((await mock.analyse({ ...base, note: typed })).explicit_user_intent).toBe(typed);
    expect((await mock.analyse({ ...base, note: '' })).explicit_user_intent).toBeNull();
  });
});

describe('Rule 2: AI suggestions are always tagged as AI', () => {
  it('forces origin "ai" and the label "AI suggestion" over anything the model sent', () => {
    const raw: RawAnalysis = {
      evidence: [{ id: 'e1', kind: 'frame', ref: 'frame 00:07' }],
      inferred_possible_intents: [
        { intent: 'Shop for a similar shirt', confidence: 0.6, origin: 'user', label: 'Your words', evidence: 'e1' },
        { intent: 'Learn the routine', confidence: 0.4 },
      ],
    };
    const out = guardAnalysis(raw, { ...base, note: 'the red shirt' }, 'gemini');
    expect(out.inferred_possible_intents).toHaveLength(2);
    for (const i of out.inferred_possible_intents) {
      expect(i.origin).toBe('ai');
      expect(i.label).toBe('AI suggestion');
    }
  });

  it('never lets a suggestion leak into the user lane', () => {
    const raw: RawAnalysis = { inferred_possible_intents: [{ intent: 'Buy it', confidence: 0.9 }], explicit_user_intent: 'Buy it' };
    const out = guardAnalysis(raw, { ...base, note: null }, 'gemini');
    expect(out.explicit_user_intent).toBeNull();
    expect(out.inferred_possible_intents[0].intent).toBe('Buy it');
  });
});

describe('Rule 3: observations carry evidence or are shown as uncertain', () => {
  const raw: RawAnalysis = {
    evidence: [{ id: 'e1', kind: 'frame', ref: 'frame 00:07', t: 7, bbox: { x: 10, y: 10, w: 20, h: 20 } }],
    observed_objects: [
      { label: 'red shirt', where: '00:07', confidence: 0.8, evidence: 'e1' },
      { label: 'brand logo', where: '00:09', confidence: 0.9 },
      { label: 'watch', where: '00:10', confidence: 0.9, evidence: 'e9' },
    ],
    inferred_possible_intents: [{ intent: 'Find the brand', confidence: 0.9, evidence: 'nope' }],
    actionable_entities: [{ type: 'product', name: 'Shirt', evidence: 'e1' }, { type: 'product', name: 'Watch', evidence: 'e9' }],
    note_grounding: { status: 'grounded', evidence: ['e9'], explanation: 'It is there.' },
  };
  const out = guardAnalysis(raw, { ...base, note: 'the red shirt' }, 'gemini');

  it('keeps a linked observation as certain', () => {
    expect(out.observed_objects[0]).toMatchObject({ label: 'red shirt', evidence: 'e1', uncertain: false });
  });
  it('marks an observation with no evidence, or a dangling reference, as uncertain', () => {
    expect(out.observed_objects[1]).toMatchObject({ uncertain: true, evidence: undefined });
    expect(out.observed_objects[2]).toMatchObject({ uncertain: true, evidence: undefined });
    expect(out.inferred_possible_intents[0].uncertain).toBe(true);
    expect(out.actionable_entities.map((e) => e.uncertain)).toEqual([false, true]);
  });
  it('does not count an uncertain suggestion towards intent confidence', () => {
    expect(out.intent_confidence).toBe(0);
  });
  it('downgrades "grounded" to "not sure" when its evidence does not exist', () => {
    expect(out.note_grounding.status).toBe('not_sure');
  });
});

describe('Unreadable sources invent nothing', () => {
  it('drops every source observation when the source is deleted, private or unsupported', () => {
    const raw: RawAnalysis = {
      source_summary: 'A cafe counter.',
      observed_objects: [{ label: 'Counter', where: 'image', confidence: 0.9, evidence: 'e1' }],
      visible_text: ['OPEN'],
      transcript_summary: 'Hello',
      evidence: [{ id: 'e1', kind: 'frame', ref: 'frame' }, { id: 'n1', kind: 'note', ref: 'your note' }],
    };
    for (const sourceState of ['deleted', 'private', 'unsupported'] as const) {
      const out = guardAnalysis(raw, { mediaKind: 'none', sourceState, note: 'caption idea' }, 'gemini');
      expect(out.source_summary).toBe('');
      expect(out.observed_objects).toEqual([]);
      expect(out.visible_text).toEqual([]);
      expect(out.transcript_summary).toBe('');
      expect(out.evidence.map((e) => e.id)).toEqual(['n1']);
      expect(out.source_access_state).toBe(sourceState);
      expect(out.explicit_user_intent).toBe('caption idea');
    }
  });

  it('the deleted sample keeps the note and shows nothing about the source', async () => {
    const s = SAMPLE_SAVES.find((x) => x.id === 's-deleted')!;
    const out = await createMockProvider(0).analyse({ sampleId: s.id, note: s.note, mediaKind: 'none', sourceState: 'deleted' });
    expect(out.observed_objects).toEqual([]);
    expect(out.source_summary).toBe('');
    expect(out.explicit_user_intent).toBe(s.note);
  });
});
