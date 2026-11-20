// The three rules, enforced in code. No provider output reaches the app without passing through guardAnalysis.
//
// Rule 1  explicit_user_intent is the user's note, exactly as typed, or null. Whatever a model put there is discarded.
// Rule 2  every inferred intent is tagged origin "ai" and labelled "AI suggestion", whatever the model said.
// Rule 3  every observation must point to an evidence item that exists; otherwise it is marked uncertain.
//
// Also: when the source could not be read (private, deleted, unsupported), nothing about the source is kept.

import type {
  ActionableEntity,
  AnalyseInput,
  BBox,
  Evidence,
  InferredIntent,
  MemoryAnalysis,
  NoteGrounding,
  ObservedObject,
  Purpose,
  RawAnalysis,
  SourceAccessState,
  SuggestedAction,
} from './types';

const PURPOSES: Purpose[] = ['shop', 'learn', 'create', 'travel', 'food', 'try_later', 'other'];
const ACTIONS: SuggestedAction[] = ['content_brief', 'recipe_steps', 'set_reminder', 'itinerary_stop'];
const STATES: SourceAccessState[] = ['available', 'private', 'deleted', 'unsupported', 'user_provided'];
const ENTITY_TYPES: ActionableEntity['type'][] = ['product', 'place', 'recipe', 'tool', 'person'];

/** The user's words pass through untouched. Only "nothing typed" becomes null. */
export function exactNote(note: string | null | undefined): string | null {
  if (typeof note !== 'string') return null;
  return note.trim().length === 0 ? null : note;
}

const str = (v: unknown, max = 600): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num01 = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.min(1, Math.max(0, n));
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function bbox(v: unknown): BBox | null {
  const b = obj(v);
  const ok = ['x', 'y', 'w', 'h'].every((k) => typeof b[k] === 'number' && Number.isFinite(b[k] as number));
  if (!ok) return null;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return { x: clamp(b.x as number), y: clamp(b.y as number), w: clamp(b.w as number), h: clamp(b.h as number) };
}

function cleanEvidence(v: unknown): Evidence[] {
  const out: Evidence[] = [];
  const seen = new Set<string>();
  for (const item of arr(v)) {
    const e = obj(item);
    const id = str(e.id, 40);
    const ref = str(e.ref, 300);
    const kind = e.kind;
    if (!id || !ref || seen.has(id)) continue;
    if (kind !== 'frame' && kind !== 'quote' && kind !== 'caption' && kind !== 'note') continue;
    seen.add(id);
    out.push({
      id,
      kind,
      ref,
      t: typeof e.t === 'number' ? e.t : undefined,
      tEnd: typeof e.tEnd === 'number' ? e.tEnd : undefined,
      bbox: bbox(e.bbox),
    });
  }
  return out;
}

export function sourceReadable(state: SourceAccessState): boolean {
  return state === 'available' || state === 'user_provided';
}

export function guardAnalysis(
  raw: RawAnalysis | null | undefined,
  input: AnalyseInput,
  provider: MemoryAnalysis['provider'],
): MemoryAnalysis {
  const r = obj(raw);
  // The capture step decides the access state; a model may not upgrade it.
  const state: SourceAccessState = STATES.includes(input.sourceState) ? input.sourceState : 'unsupported';
  const readable = sourceReadable(state);
  const note = exactNote(input.note); // Rule 1: from the input, never from `raw`.

  let evidence = cleanEvidence(r.evidence);
  if (!readable) evidence = evidence.filter((e) => e.kind === 'note' || e.kind === 'caption');
  if (!note) evidence = evidence.filter((e) => e.kind !== 'note');
  const known = new Set(evidence.map((e) => e.id));
  const linked = (id: unknown): string | undefined => (typeof id === 'string' && known.has(id) ? id : undefined);

  const observed: ObservedObject[] = readable
    ? arr(r.observed_objects)
        .map((item) => {
          const o = obj(item);
          const ev = linked(o.evidence);
          return {
            label: str(o.label, 120),
            where: str(o.where, 80),
            bbox: bbox(o.bbox),
            confidence: num01(o.confidence),
            evidence: ev,
            uncertain: !ev, // Rule 3
          };
        })
        .filter((o) => o.label)
    : [];

  const intents: InferredIntent[] = arr(r.inferred_possible_intents)
    .map((item) => {
      const i = obj(item);
      const ev = linked(i.evidence);
      return {
        intent: str(i.intent, 200),
        confidence: num01(i.confidence),
        label: 'AI suggestion' as const, // Rule 2
        origin: 'ai' as const, // Rule 2
        evidence: ev,
        uncertain: !ev, // Rule 3
      };
    })
    .filter((i) => i.intent);

  const entities: ActionableEntity[] = arr(r.actionable_entities)
    .map((item) => {
      const e = obj(item);
      const ev = linked(e.evidence);
      const type = ENTITY_TYPES.includes(e.type as ActionableEntity['type']) ? (e.type as ActionableEntity['type']) : 'tool';
      return { type, name: str(e.name, 120), evidence: ev ?? '', uncertain: !ev };
    })
    .filter((e) => e.name);

  const g = obj(r.note_grounding);
  const gEvidence = arr(g.evidence).map(linked).filter((x): x is string => Boolean(x));
  let grounding: NoteGrounding;
  if (!note) {
    grounding = { status: 'no_note', evidence: [], explanation: '' };
  } else if (!readable) {
    grounding = {
      status: 'not_attempted',
      evidence: [],
      explanation: 'The source could not be read, so your note was not matched against it.',
    };
  } else if (g.status === 'grounded' && gEvidence.length > 0) {
    grounding = { status: 'grounded', evidence: gEvidence, explanation: str(g.explanation, 300) };
  } else {
    // A claim of "grounded" with no surviving evidence is downgraded.
    grounding = {
      status: 'not_sure',
      evidence: [],
      explanation: str(g.explanation, 300) || 'Not sure which part of the source your note refers to.',
    };
  }

  const purpose = PURPOSES.includes(r.purpose as Purpose) ? (r.purpose as Purpose) : 'other';

  return {
    source_summary: readable ? str(r.source_summary) : '',
    observed_objects: observed,
    visible_text: readable ? arr(r.visible_text).map((t) => str(t, 200)).filter(Boolean) : [],
    transcript_summary: readable ? str(r.transcript_summary) : '',
    explicit_user_intent: note,
    inferred_possible_intents: intents,
    intent_confidence: intents.length ? Math.max(...intents.map((i) => (i.uncertain ? 0 : i.confidence))) : 0,
    actionable_entities: entities,
    suggested_actions: arr(r.suggested_actions).filter((a): a is SuggestedAction => ACTIONS.includes(a as SuggestedAction)),
    evidence,
    source_access_state: state,
    purpose,
    note_grounding: grounding,
    provider,
  };
}

/** Confidence below this is shown as "not sure" instead of as a suggestion. */
export const NOT_SURE_BELOW = 0.45;
