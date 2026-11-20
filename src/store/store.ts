// App state for the demo account. Everything lives in localStorage under one key; there is no server.

import { useSyncExternalStore } from 'react';
import { guardAnalysis } from '../ai/guard';
import { getProvider } from '../ai/provider';
import type { AnalyseInput, LocalImageFacts, SourceAccessState } from '../ai/types';
import { SAMPLE_CATEGORIES, SAMPLE_PROJECTS, SAMPLE_SAVES, sampleDate, type SampleSave } from '../data/sample/saves';
import { placeMemory, whyFor } from '../lib/categorise';
import { snoozeUntil } from '../lib/resurface';
import { chipLabel } from '../lib/reason';
import type { AppState, Category, IntentChip, LedgerEntry, Memory, Platform, Project, Rule, Settings } from './types';

const KEY = 'neophi.v1';

export const FEATURES: { id: string; label: string; hint: string }[] = [
  { id: 'intentChips', label: 'Intent chips at capture', hint: 'One tap instead of typing: Buy, Try, Go there and so on.' },
  { id: 'momentPins', label: 'Moment pins', hint: 'Pin the exact seconds of a clip that matter.' },
  { id: 'projects', label: 'Projects and outcome builders', hint: 'Group saves under a goal and turn them into a plan.' },
  { id: 'privateMemories', label: 'Private memories', hint: 'Link and note only. Never analysed.' },
  { id: 'insights', label: 'Insights card', hint: 'A few labelled patterns in what you save.' },
  { id: 'rules', label: 'Plain-language rules', hint: 'Preview only in the prototype.' },
  { id: 'resurface', label: 'Resurface one', hint: 'Bring back a save using the explainable Today rules.' },
  { id: 'duplicates', label: 'Duplicate detection', hint: 'The same link saved twice becomes one memory with both notes.' },
];

const defaultSettings = (): Settings => ({
  features: Object.fromEntries(FEATURES.map((f) => [f.id, true])),
  noteLanguage: 'en',
  retentionDays: 0,
  view: 'grid',
  provider: 'mock',
});

const empty = (): AppState => ({ version: 1, onboarded: false, memories: [], categories: [], projects: [], rules: [], settings: defaultSettings(), waitlist: [] });

let uid = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(uid++).toString(36)}`;
const entry = (actor: LedgerEntry['actor'], what: string, at = new Date().toISOString(), undo?: LedgerEntry['undo']): LedgerEntry => ({ id: newId('l'), at, actor, what, undo });

function sweep(state: AppState): AppState {
  // Retention: key frames past their date are removed for real.
  const now = Date.now();
  let changed = false;
  const memories = state.memories.map((m) => {
    if (m.thumb && m.thumbExpiresAt && new Date(m.thumbExpiresAt).getTime() < now) {
      changed = true;
      return { ...m, thumb: undefined, thumbExpiresAt: null, ledger: [...m.ledger, entry('neophi', 'Key frame removed: it reached the retention time you set.')] };
    }
    return m;
  });
  return changed ? { ...state, memories } : state;
}

export let storageFailed = false;

function load(): AppState {
  if (typeof localStorage === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1 || !Array.isArray(parsed.memories)) return empty();
    const settings = { ...defaultSettings(), ...parsed.settings, features: { ...defaultSettings().features, ...parsed.settings?.features } };
    // A memory caught mid-analysis by a reload is shown as failed, with a retry.
    const memories = parsed.memories.map((m) => (m.status === 'analysing' ? { ...m, status: 'error' as const } : m));
    return sweep({ ...empty(), ...parsed, settings, memories });
  } catch {
    storageFailed = true;
    return empty();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

function set(next: AppState | ((s: AppState) => AppState)) {
  state = typeof next === 'function' ? next(state) : next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageFailed = false;
  } catch {
    storageFailed = true; // full or blocked: the session keeps working, nothing is persisted
  }
  listeners.forEach((l) => l());
}

export function useStore(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
export const getState = () => state;

const patchMemory = (id: string, fn: (m: Memory) => Memory) => set((s) => ({ ...s, memories: s.memories.map((m) => (m.id === id ? fn(m) : m)) }));

// ---------- seeding ----------

function fromSample(s: SampleSave, now: Date): Memory {
  const at = sampleDate(s.when, now);
  const input: AnalyseInput = { sampleId: s.id, note: s.note, mediaKind: s.mediaKind, sourceState: s.stateAtSave, caption: s.caption, url: s.url };
  const analysis = s.private ? null : guardAnalysis(s.raw, input, 'mock');
  const catName = SAMPLE_CATEGORIES.find((c) => c.id === s.category)?.name;
  const ledger: LedgerEntry[] = [entry('you', s.platform === 'upload' ? 'You uploaded a screenshot. A small key frame was kept; the original file was not.' : 'You saved this link.', at)];
  if (s.note) ledger.push(entry('you', 'You wrote a note. Stored exactly as typed.', at));
  if (s.chosenIntent) ledger.push(entry('you', `You chose "${chipLabel(s.chosenIntent)}".`, at));
  if (s.private) ledger.push(entry('you', 'You marked this private. AI is off: nothing was read or analysed.', at));
  else if (analysis) {
    const readable = analysis.source_access_state === 'available' || analysis.source_access_state === 'user_provided';
    ledger.push(
      entry('ai', readable ? `AI described the source: ${analysis.observed_objects.length} observations, each tied to evidence or marked not sure (mock provider).` : 'The source could not be read. Nothing about it was recorded.', at),
    );
    if (analysis.inferred_possible_intents.length) ledger.push(entry('ai', `AI added ${analysis.inferred_possible_intents.length} suggestion${analysis.inferred_possible_intents.length > 1 ? 's' : ''}, labelled as AI.`, at, 'suggestions'));
    if (catName) ledger.push(entry('ai', `AI placed it in "${catName}".`, at, 'category'));
    if (s.stateNow !== s.stateAtSave) ledger.push(entry('neophi', 'The source is no longer available. The recorded text is kept; the media was never stored.', new Date(new Date(at).getTime() + 9 * 86_400_000).toISOString()));
  }
  s.projects.forEach((p) => ledger.push(entry('you', `You added it to the project "${SAMPLE_PROJECTS.find((x) => x.id === p)?.name}".`, at)));
  return {
    id: s.id,
    createdAt: at,
    title: s.title,
    sample: true,
    source: { channel: s.platform === 'upload' ? 'upload' : 'link', platform: s.platform, url: s.url || undefined, caption: s.caption || undefined, author: s.author || undefined },
    mediaKind: s.mediaKind,
    sceneId: s.stateNow === 'available' || s.stateNow === 'user_provided' ? s.scene : 'none',
    durationSec: s.durationSec,
    note: s.note,
    extraNotes: [],
    noteLanguage: s.noteLanguage,
    chosenIntent: s.chosenIntent,
    private: Boolean(s.private),
    status: 'ready',
    sourceNow: s.stateNow,
    analysis,
    analysedAt: at,
    categoryId: s.category,
    categoryPinned: false,
    projectIds: s.projects,
    momentPins: (s.pins ?? []).map((p, i) => ({ id: `${s.id}-pin${i}`, ...p })),
    reminderAt: null,
    ledger,
  };
}

export function seedSamples(ids: string[] | 'all') {
  const now = new Date();
  set((s) => {
    const want = SAMPLE_SAVES.filter((x) => (ids === 'all' || ids.includes(x.id)) && !s.memories.some((m) => m.id === x.id));
    const memories = [...s.memories, ...want.map((x) => fromSample(x, now))];
    const usedCats = new Set(memories.map((m) => m.categoryId));
    const usedProjects = new Set(memories.flatMap((m) => m.projectIds));
    const categories: Category[] = [
      ...s.categories,
      ...SAMPLE_CATEGORIES.filter((c) => usedCats.has(c.id) && !s.categories.some((x) => x.id === c.id)).map((c) => ({ ...c, origin: 'auto' as const, accepted: false, pinned: false })),
    ];
    const projects: Project[] = [...s.projects, ...SAMPLE_PROJECTS.filter((p) => usedProjects.has(p.id) && !s.projects.some((x) => x.id === p.id)).map((p) => ({ ...p, sample: true }))];
    return { ...s, onboarded: true, memories, categories, projects };
  });
}

export const finishOnboarding = () => set((s) => ({ ...s, onboarded: true }));

// ---------- capture ----------

export interface CaptureInput {
  sharedTitle?: string;
  sharedText?: string;
  url?: string;
  note: string;
  noteLanguage: Settings['noteLanguage'];
  chosenIntent: IntentChip | null;
  isPrivate: boolean;
  upload?: { thumb: string; mediaKind: 'image' | 'video'; durationSec?: number; local: LocalImageFacts; fileName: string };
  channel?: Memory['source']['channel'];
  createdAt?: string;
  /** A share that arrived as an Instagram DM (replayed sample payload in the prototype). */
  dm?: { mid: string; kind: 'ig_reel' | 'ig_post' | 'other'; caption: string | null; hasMediaLink: boolean; live?: boolean; mediaFetch?: string };
}

export function normaliseUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|igsh|igshid|si$|fbclid)/.test(k)) u.searchParams.delete(k);
    return u.toString().replace(/\/$/, '');
  } catch {
    return raw.trim();
  }
}

function platformOf(url?: string): Platform {
  if (!url) return 'upload';
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (h.endsWith('instagram.com')) return 'instagram';
    if (h.endsWith('youtube.com') || h === 'youtu.be') return 'youtube';
  } catch {
    /* fall through */
  }
  return 'web';
}

function titleFor(input: CaptureInput, platform: Platform): string {
  if (input.sharedTitle) return input.sharedTitle;
  if (input.dm?.caption?.trim()) return input.dm.caption.trim().split(/\r?\n/)[0].slice(0, 80);
  if (input.dm) return input.dm.kind === 'ig_reel' ? 'Reel shared by DM' : input.dm.kind === 'ig_post' ? 'Post shared by DM' : 'Shared by DM';
  if (input.upload) return input.upload.fileName.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'Upload';
  try {
    const u = new URL(input.url!);
    const kind = /\/reel\//.test(u.pathname) ? 'Reel' : /\/shorts\//.test(u.pathname) ? 'Short' : platform === 'instagram' ? 'Post' : 'Page';
    return `${kind} on ${u.hostname.replace(/^www\./, '')}`;
  } catch {
    return 'Saved link';
  }
}

export interface CaptureResult {
  id: string;
  duplicate: boolean;
}

export function capture(input: CaptureInput): CaptureResult {
  const now = input.createdAt ?? new Date().toISOString();
  const url = input.url ? normaliseUrl(input.url) : undefined;
  const typed = input.note.trim().length ? input.note : null;

  if (url && !input.dm && state.settings.features.duplicates) {
    const existing = state.memories.find((m) => m.source.url && normaliseUrl(m.source.url) === url);
    if (existing) {
      patchMemory(existing.id, (m) => ({
        ...m,
        note: m.note ?? typed,
        extraNotes: m.note && typed && typed !== m.note ? [...m.extraNotes, { text: typed, at: now }] : m.extraNotes,
        ledger: [...m.ledger, entry('you', typed ? 'You saved this link again. Your new note was added; nothing was replaced.' : 'You saved this link again. It was already here, so no copy was made.')],
      }));
      return { id: existing.id, duplicate: true };
    }
  }

  if (input.dm) {
    const again = state.memories.find((m) => m.source.externalId === input.dm!.mid);
    if (again) return { id: again.id, duplicate: true }; // Meta can deliver the same message twice
  }
  const platform = input.dm ? 'instagram' : platformOf(url);
  const sourceState: SourceAccessState = input.upload ? 'user_provided' : input.dm?.live && input.dm.mediaFetch === 'ok' ? 'available' : 'unsupported';
  const retention = state.settings.retentionDays;
  const ledger: LedgerEntry[] = [];
  if (url && !input.dm) ledger.push(entry('you', 'You saved this link. It was kept, not fetched.', now));
  if (input.dm)
    ledger.push(
      entry(
        'neophi',
        input.dm.live
          ? `Received as a live Instagram DM. ${input.dm.mediaFetch === 'ok' ? 'The server downloaded the shared media.' : input.dm.hasMediaLink ? `It carried a media link, but the download did not work (${input.dm.mediaFetch ?? 'unknown'}), so only the caption and your note are used.` : 'It carried no media link.'}`
          : `Received as an Instagram DM (a replayed sample payload, not a live message). ${input.dm.hasMediaLink ? 'It carried a media link, which was not fetched: whether it can be downloaded is still untested.' : 'It carried no media link.'}`,
        now,
      ),
    );
  if (input.upload) ledger.push(entry('you', `You uploaded ${input.upload.mediaKind === 'video' ? 'a video' : 'an image'}. A small key frame was made on this device; the original file was not stored.`, now));
  if (typed) ledger.push(entry('you', 'You wrote a note. Stored exactly as typed.', now));
  if (input.chosenIntent) ledger.push(entry('you', `You chose "${chipLabel(input.chosenIntent)}".`, now));
  if (input.isPrivate) ledger.push(entry('you', 'You marked this private. AI is off: nothing was read or analysed.', now));

  const memory: Memory = {
    id: newId('m'),
    createdAt: now,
    title: titleFor(input, platform),
    sample: false,
    source: { sharedText: input.sharedText, channel: input.dm ? 'dm' : (input.channel ?? (input.upload ? 'upload' : 'link')), platform, url, caption: input.dm?.caption ?? undefined, externalId: input.dm?.mid, live: input.dm?.live },
    mediaKind: input.upload?.mediaKind ?? (input.dm?.kind === 'ig_reel' ? 'video' : 'none'),
    thumb: input.upload?.thumb,
    thumbExpiresAt: input.upload && retention ? new Date(Date.now() + retention * 86_400_000).toISOString() : null,
    durationSec: input.upload?.durationSec,
    note: typed,
    extraNotes: [],
    noteLanguage: input.noteLanguage,
    chosenIntent: input.chosenIntent,
    private: input.isPrivate,
    status: input.isPrivate ? 'ready' : 'analysing',
    sourceNow: sourceState,
    analysis: null,
    categoryId: null,
    categoryPinned: false,
    projectIds: [],
    momentPins: [],
    reminderAt: null,
    ledger,
  };
  set((s) => ({ ...s, onboarded: true, memories: [memory, ...s.memories] }));
  if (!input.isPrivate) void analyseMemory(memory.id, input.upload?.local, input.upload?.thumb);
  return { id: memory.id, duplicate: false };
}

/** A note typed in the DM thread after the share arrived: kept exactly as sent, never merged or rewritten. */
export function attachDmNote(mid: string, text: string, deliveryId?: string): boolean {
  const m = state.memories.find((x) => x.source.externalId === mid);
  if (!m) return false;
  if (deliveryId && m.dmNoteIds?.includes(deliveryId)) return true;
  const now = new Date().toISOString();
  const first = !m.note;
  patchMemory(m.id, (x) => ({
    ...x,
    note: x.note ?? text,
    dmNoteIds: deliveryId ? [...(x.dmNoteIds ?? []), deliveryId] : x.dmNoteIds,
    extraNotes: x.note ? [...x.extraNotes, { text, at: now }] : x.extraNotes,
    ledger: [...x.ledger, entry('you', first ? 'Your note arrived in the DM thread. Stored exactly as sent.' : 'Another note arrived in the DM thread. Added; nothing was replaced.', now)],
  }));
  if (first) void analyseMemory(m.id, undefined, undefined);
  return true;
}

const activeAnalyses = new Map<string, symbol>();

export async function analyseMemory(id: string, local?: LocalImageFacts, imageDataUrl?: string) {
  const m = state.memories.find((x) => x.id === id);
  if (!m || m.private) return;
  const run = Symbol();
  activeAnalyses.set(id, run);
  patchMemory(id, (x) => ({ ...x, status: 'analysing' }));
  const input: AnalyseInput = {
    sampleId: m.sample ? m.id : undefined,
    url: m.source.url,
    caption: m.source.caption,
    note: m.note,
    noteLanguage: m.noteLanguage,
    mediaKind: m.mediaKind,
    sourceState: m.sourceNow,
    local,
    imageDataUrl: imageDataUrl ?? m.thumb,
    durationSec: m.durationSec,
    dmMid: m.source.channel === 'dm' ? m.source.externalId : undefined,
  };
  const extra: LedgerEntry[] = [];
  let analysis;
  // Try Gemini for live shares even when the demo uses the mock provider.
  const providerName = m.source.live || state.settings.provider === 'gemini' ? 'gemini' : 'mock';
  try {
    try {
      analysis = await getProvider(providerName).analyse(input);
    } catch (err) {
      if (providerName !== 'gemini') throw err;
      extra.push(entry('neophi', 'The Gemini server did not answer, so the mock provider was used instead.'));
      const fallbackInput = input.dmMid && input.sourceState === 'available'
        ? { ...input, sourceState: 'unsupported' as const }
        : input;
      analysis = await getProvider('mock').analyse(fallbackInput);
    }
  } catch {
    if (activeAnalyses.get(id) !== run) return;
    activeAnalyses.delete(id);
    patchMemory(id, (x) => ({ ...x, status: 'error', ledger: [...x.ledger, entry('neophi', 'Analysis failed. Your link and note are safe; you can try again.')] }));
    return;
  }
  if (activeAnalyses.get(id) !== run) return;
  activeAnalyses.delete(id);
  const current = state.memories.find((x) => x.id === id);
  if (!current || current.private) return;
  const readable = analysis.source_access_state === 'available' || analysis.source_access_state === 'user_provided';
  extra.push(
    entry('ai', readable ? `AI described the source: ${analysis.observed_objects.length} observations, each tied to evidence or marked not sure (${analysis.provider} provider).` : m.source.channel === 'dm' && m.source.caption ? 'Analysis used the caption and any note you sent. Shared media was unavailable for this analysis.' : 'The source was not read, so nothing about it was recorded.'),
  );
  if (analysis.inferred_possible_intents.length) extra.push(entry('ai', `AI added ${analysis.inferred_possible_intents.length} suggestion${analysis.inferred_possible_intents.length > 1 ? 's' : ''}, labelled as AI.`, undefined, 'suggestions'));

  const analysed: Memory = { ...current, analysis, analysedAt: new Date().toISOString(), status: 'ready', suggestionsRemoved: false };
  let categories = state.categories;
  let categoryId = analysed.categoryId;
  if (!analysed.categoryPinned && !categoryId) {
    const placed = placeMemory(analysed, categories, state.memories);
    if (placed.create) {
      const cat: Category = { id: newId('c'), name: placed.create.name, why: placed.create.why, origin: 'auto', accepted: false, pinned: false };
      categories = [...categories, cat];
      categoryId = cat.id;
    } else categoryId = placed.categoryId;
    extra.push(entry('ai', placed.explanation, undefined, categoryId ? 'category' : undefined));
  }
  set((s) => {
    const memories = s.memories.map((x) => (x.id === id ? { ...analysed, categoryId, ledger: [...x.ledger, ...extra] } : x));
    return { ...s, memories, categories: refreshWhy(categories, memories, categoryId) };
  });
}

/** Auto categories that the user has not renamed get a fresh "why" line when their contents change. */
function refreshWhy(categories: Category[], memories: Memory[], touched: string | null): Category[] {
  return categories.map((c) => (c.id === touched && c.origin === 'auto' && !c.id.startsWith('c-') ? { ...c, why: whyFor(memories.filter((m) => m.categoryId === c.id)) } : c));
}

// ---------- memory actions ----------

export const deleteMemory = (id: string) => set((s) => ({ ...s, memories: s.memories.filter((m) => m.id !== id) }));
export const deleteAll = () => {
  try {
    localStorage.removeItem('neophi.waitlist');
  } catch {
    /* nothing to clear */
  }
  set({ ...empty(), onboarded: false });
};

export function moveMemory(id: string, categoryId: string | null) {
  const name = categoryId ? state.categories.find((c) => c.id === categoryId)?.name : 'Not sure yet';
  patchMemory(id, (m) => ({ ...m, categoryId, categoryPinned: true, ledger: [...m.ledger, entry('you', `You moved it to "${name}". It stays there: automatic sorting will not move it.`)] }));
}

export function undoLedger(memoryId: string, entryId: string) {
  patchMemory(memoryId, (m) => {
    const e = m.ledger.find((x) => x.id === entryId);
    if (!e?.undo || e.undone) return m;
    const ledger = m.ledger.map((x) => (x.id === entryId ? { ...x, undone: true } : x));
    if (e.undo === 'category') return { ...m, categoryId: null, categoryPinned: true, ledger: [...ledger, entry('you', 'You undid the AI placement. It is back in Not sure yet and will stay where you put it.')] };
    return { ...m, suggestionsRemoved: true, ledger: [...ledger, entry('you', 'You removed the AI suggestions from this memory.')] };
  });
}
export const restoreSuggestions = (id: string) => patchMemory(id, (m) => ({ ...m, suggestionsRemoved: false, ledger: [...m.ledger, entry('you', 'You brought the AI suggestions back.')] }));

export function setPrivate(id: string, isPrivate: boolean) {
  if (isPrivate) activeAnalyses.delete(id);
  patchMemory(id, (m) =>
    isPrivate
      ? { ...m, private: true, analysis: null, status: 'ready', categoryId: null, momentPins: [], ledger: [...m.ledger, entry('you', 'You made this private. The analysis was deleted and AI is off for it.')] }
      : { ...m, private: false, ledger: [...m.ledger, entry('you', 'You turned AI back on for this memory.')] },
  );
  if (!isPrivate) void analyseMemory(id);
}

export function addPin(id: string, from: number, to: number, label: string) {
  patchMemory(id, (m) => ({ ...m, momentPins: [...m.momentPins, { id: newId('pin'), from, to, label }], ledger: [...m.ledger, entry('you', `You pinned a moment: ${label}.`)] }));
}
export const removePin = (id: string, pinId: string) => patchMemory(id, (m) => ({ ...m, momentPins: m.momentPins.filter((p) => p.id !== pinId) }));

export const markOpened = (id: string) => patchMemory(id, (m) => ({ ...m, lastOpenedAt: new Date().toISOString(), ledger: [...m.ledger, entry('you', 'You opened this memory.')] }));
export const snoozeResurface = (id: string) => patchMemory(id, (m) => ({ ...m, resurfaceSnoozedUntil: snoozeUntil(new Date()), ledger: [...m.ledger, entry('you', 'Not now: resurfacing snoozed for 7 days.')] }));
export const doneResurface = (id: string) => patchMemory(id, (m) => ({ ...m, resurfaceDoneAt: new Date().toISOString(), ledger: [...m.ledger, entry('you', 'Done: removed from automatic resurfacing.')] }));
export const markReminderNotified = (id: string, at: string) => patchMemory(id, (m) => ({ ...m, reminderNotifiedAt: at }));
export const addOwnNote = (id: string, text: string) => patchMemory(id, (m) => ({ ...m, note: m.note || text, extraNotes: m.note ? [...m.extraNotes, { text, at: new Date().toISOString() }] : m.extraNotes, ledger: [...m.ledger, entry('you', 'You added your own words, stored exactly as typed.')] }));

export function setReminder(id: string, at: string | null) {
  patchMemory(id, (m) => ({ ...m, reminderAt: at, ledger: [...m.ledger, entry('you', at ? `You set a reminder for ${new Date(at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}.` : 'You removed the reminder.')] }));
}

export function setChosenIntent(id: string, chip: IntentChip | null) {
  patchMemory(id, (m) => ({ ...m, chosenIntent: chip, ledger: [...m.ledger, entry('you', chip ? `You chose "${chipLabel(chip)}".` : 'You cleared your chosen reason.')] }));
}

export function toggleProject(id: string, projectId: string) {
  const name = state.projects.find((p) => p.id === projectId)?.name;
  patchMemory(id, (m) => {
    const has = m.projectIds.includes(projectId);
    return { ...m, projectIds: has ? m.projectIds.filter((p) => p !== projectId) : [...m.projectIds, projectId], ledger: [...m.ledger, entry('you', has ? `You removed it from the project "${name}".` : `You added it to the project "${name}".`)] };
  });
}

// ---------- categories, projects, rules, settings ----------

export const acceptCategory = (id: string) => set((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, accepted: true } : c)) }));
export const pinCategory = (id: string) => set((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) }));
export const renameCategory = (id: string, name: string) =>
  set((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name, origin: 'you', accepted: true, why: `${c.why} You named it.`.replace(/( You named it\.)+$/, ' You named it.') } : c)) }));

export function mergeCategory(fromId: string, intoId: string) {
  if (fromId === intoId) return;
  const from = state.categories.find((c) => c.id === fromId);
  const into = state.categories.find((c) => c.id === intoId);
  if (!from || !into) return;
  set((s) => {
    const memories = s.memories.map((m) => (m.categoryId === fromId ? { ...m, categoryId: intoId, ledger: [...m.ledger, entry('you', `You merged "${from.name}" into "${into.name}".`)] } : m));
    const count = memories.filter((m) => m.categoryId === intoId).length;
    return {
      ...s,
      memories,
      categories: s.categories.filter((c) => c.id !== fromId).map((c) => (c.id === intoId ? { ...c, accepted: true, why: `${count} saves. You merged "${from.name}" into this.` } : c)),
    };
  });
}

export function addCategory(name: string): string {
  const cat: Category = { id: newId('c'), name: name.trim(), why: 'You made this category.', origin: 'you', accepted: true, pinned: false };
  set((s) => ({ ...s, categories: [...s.categories, cat] }));
  return cat.id;
}

export function projectFromCategory(categoryId: string, outcome: Project['outcome']): string {
  const cat = state.categories.find((c) => c.id === categoryId)!;
  const project: Project = { id: newId('p'), name: cat.name, goal: '', outcome, sample: false };
  set((s) => ({
    ...s,
    projects: [...s.projects, project],
    memories: s.memories.map((m) => (m.categoryId === categoryId && !m.private ? { ...m, projectIds: [...m.projectIds, project.id], ledger: [...m.ledger, entry('you', `You added it to the project "${project.name}".`)] } : m)),
  }));
  return project.id;
}
export const updateProject = (id: string, patch: Partial<Project>) => set((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
export const deleteProject = (id: string) =>
  set((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id), memories: s.memories.map((m) => ({ ...m, projectIds: m.projectIds.filter((p) => p !== id) })) }));

export const addRule = (rule: Omit<Rule, 'id' | 'createdAt'>) => set((s) => ({ ...s, rules: [...s.rules, { ...rule, id: newId('r'), createdAt: new Date().toISOString() }] }));
export const deleteRule = (id: string) => set((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));

export const updateSettings = (patch: Partial<Settings>) => set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
export const setFeature = (id: string, on: boolean) => set((s) => ({ ...s, settings: { ...s.settings, features: { ...s.settings.features, [id]: on } } }));
