// Next steps built from a memory or a project. Every line is assembled from text already stored on the
// memories (your notes, captions, recorded evidence). Nothing is looked up and nothing is invented:
// where the stored text does not say, the draft says so.

import { concepts } from '../ai/text';
import type { Evidence } from '../ai/types';
import type { Memory } from '../store/types';

export interface DraftLine {
  text: string;
  /** Where the line comes from, shown beside it. */
  from: string;
  memoryId?: string;
}

export interface Draft {
  title: string;
  sections: { heading: string; lines: DraftLine[] }[];
  gaps: string[];
}

const quoted = (e: Evidence) => e.ref.match(/"(.+)"/)?.[1] ?? null;

export function contentBrief(m: Memory): Draft {
  const a = m.private ? null : m.analysis;
  const gaps: string[] = [];
  const hook: DraftLine[] = [];
  if (m.note) hook.push({ text: m.note, from: 'your note' });
  a?.visible_text.forEach((t) => hook.push({ text: t, from: 'text on screen' }));
  if (!hook.length) gaps.push('No note and no on-screen text, so there is no hook to start from.');

  const beats: DraftLine[] = (a?.observed_objects ?? []).filter((o) => !o.uncertain).map((o) => ({ text: o.label, from: o.where }));
  if (a?.transcript_summary) beats.push({ text: a.transcript_summary, from: 'audio' });
  if (!beats.length) gaps.push('The source was not read, so there are no beats or shots to list.');

  const lines: DraftLine[] = (a?.evidence ?? [])
    .map((e) => ({ e, q: quoted(e) }))
    .filter((x) => x.q && x.e.kind !== 'note')
    .map((x) => ({ text: x.q!, from: x.e.kind === 'caption' ? 'caption' : 'quote' }));

  return {
    title: `Content brief: ${m.title}`,
    sections: [
      { heading: 'Hook to start from', lines: hook },
      { heading: 'Beats and shots seen in the source', lines: beats },
      { heading: 'Lines worth keeping', lines },
    ].filter((s) => s.lines.length),
    gaps,
  };
}

export function recipeSteps(m: Memory): Draft {
  const a = m.private ? null : m.analysis;
  const gaps: string[] = [];
  const said = a?.transcript_summary ?? '';
  const list = said.includes(':') ? said.slice(said.indexOf(':') + 1) : '';
  const steps = list
    .split(/,|;/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 2)
    .map((s) => ({ text: s.charAt(0).toUpperCase() + s.slice(1), from: 'audio' }));
  if (!steps.length) gaps.push('The source does not spell out the steps, and Neophi will not make up a recipe. Open the source to follow it.');
  const notes: DraftLine[] = [];
  if (m.note) notes.push({ text: m.note, from: 'your note' });
  a?.visible_text.forEach((t) => notes.push({ text: t, from: 'text on screen' }));
  return {
    title: `Steps: ${m.title}`,
    sections: [
      { heading: 'Steps, in the order they are said', lines: steps },
      { heading: 'Your reminders', lines: notes },
    ].filter((s) => s.lines.length),
    gaps,
  };
}

const SLOTS = ['Morning', 'Breakfast', 'Afternoon', 'Before sunset', 'Any time'] as const;

function slotOf(m: Memory): (typeof SLOTS)[number] {
  const text = [m.note ?? '', m.source.caption ?? '', m.title].join(' ').toLowerCase();
  const c = concepts(text);
  if (c.includes('morning')) return 'Morning';
  if (/breakfast|nashta/.test(text)) return 'Breakfast';
  if (/sunset|evening|shaam/.test(text)) return 'Before sunset';
  if (/lunch|afternoon/.test(text)) return 'Afternoon';
  return 'Any time';
}

export function itinerary(name: string, memories: Memory[]): Draft {
  const usable = memories.filter((m) => !m.private);
  const gaps: string[] = [];
  const sections = SLOTS.map((slot) => ({
    heading: slot,
    lines: usable
      .filter((m) => slotOf(m) === slot)
      .map((m) => {
        const places = m.analysis?.actionable_entities.filter((e) => e.type === 'place' && !e.uncertain).map((e) => e.name) ?? [];
        const where = places.length ? places.join(' to ') : m.title;
        return { text: m.note ? `${where}: ${m.note}` : where, from: m.source.caption ? `caption: "${m.source.caption}"` : 'no caption', memoryId: m.id };
      }),
  })).filter((s) => s.lines.length);
  if (!usable.length) gaps.push('No saves in this project yet.');
  if (usable.some((m) => m.analysis?.actionable_entities.some((e) => /not (shown|given)/.test(e.name)))) gaps.push('Some places have no name in the source. They are listed as described, not guessed.');
  gaps.push('Distances, opening hours and the order between days are not known. Nothing was looked up.');
  return { title: `Itinerary draft: ${name}`, sections, gaps };
}

export function projectBrief(name: string, memories: Memory[]): Draft {
  const usable = memories.filter((m) => !m.private);
  const gaps: string[] = [];
  const hook: DraftLine[] = [];
  const structure: DraftLine[] = [];
  const filming: DraftLine[] = [];
  const refs: DraftLine[] = [];
  for (const m of usable) {
    const a = m.analysis;
    const readable = a && (a.source_access_state === 'available' || a.source_access_state === 'user_provided');
    const text = `${m.note ?? ''} ${m.title}`.toLowerCase();
    if (!readable) {
      if (m.note) refs.push({ text: m.note, from: 'your note only: the source was never read', memoryId: m.id });
      gaps.push(`"${m.title}" has only your note. The post was gone before it could be read.`);
      continue;
    }
    if (/hook|start|opening/.test(text)) {
      a.visible_text.forEach((t) => hook.push({ text: t, from: 'text on screen', memoryId: m.id }));
      if (m.note) hook.push({ text: m.note, from: 'your note', memoryId: m.id });
    } else if (/structure|caption|line/.test(text)) {
      if (m.note) structure.push({ text: m.note, from: 'your note', memoryId: m.id });
      a.evidence.filter((e) => e.kind === 'caption').forEach((e) => structure.push({ text: quoted(e) ?? e.ref, from: m.sourceNow === 'deleted' ? 'caption, recorded before the post was deleted' : 'caption', memoryId: m.id }));
    } else {
      if (m.note) filming.push({ text: m.note, from: 'your note', memoryId: m.id });
      a.evidence.filter((e) => e.kind === 'quote').forEach((e) => filming.push({ text: quoted(e) ?? e.ref, from: 'said in the video', memoryId: m.id }));
    }
  }
  if (!usable.length) gaps.push('No saves in this project yet.');
  return {
    title: `Content brief: ${name}`,
    sections: [
      { heading: 'Hook', lines: hook },
      { heading: 'Caption structure', lines: structure },
      { heading: 'Filming notes', lines: filming },
      { heading: 'Other references', lines: refs },
    ].filter((s) => s.lines.length),
    gaps,
  };
}

export function draftToMarkdown(d: Draft): string {
  const out = [`# ${d.title}`, '', '_Draft assembled by Neophi from your saved memories. Nothing here was looked up._', ''];
  for (const s of d.sections) {
    out.push(`## ${s.heading}`, '');
    s.lines.forEach((l) => out.push(`- ${l.text} (${l.from})`));
    out.push('');
  }
  if (d.gaps.length) {
    out.push('## Not known', '');
    d.gaps.forEach((g) => out.push(`- ${g}`));
  }
  return out.join('\n');
}
