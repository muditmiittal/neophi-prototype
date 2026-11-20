import type { MemoryAnalysis, SourceAccessState } from '../ai/types';
import type { SceneId } from '../components/Scene';

export type IntentChip = 'buy' | 'try' | 'learn' | 'remix' | 'go_there' | 'share_with' | 'just_remember';

export const INTENT_CHIPS: { id: IntentChip; label: string }[] = [
  { id: 'buy', label: 'Buy' },
  { id: 'try', label: 'Try' },
  { id: 'learn', label: 'Learn' },
  { id: 'remix', label: 'Remix' },
  { id: 'go_there', label: 'Go there' },
  { id: 'share_with', label: 'Share with' },
  { id: 'just_remember', label: 'Just remember' },
];

export type Platform = 'instagram' | 'youtube' | 'web' | 'upload';

export interface LedgerEntry {
  id: string;
  at: string;
  actor: 'you' | 'ai' | 'neophi';
  what: string;
  /** What undo does, if this step can be undone. */
  undo?: 'category' | 'suggestions';
  undone?: boolean;
}

export interface MomentPin {
  id: string;
  from: number;
  to: number;
  label: string;
}

export interface Memory {
  id: string;
  createdAt: string;
  title: string;
  /** Built-in synthetic save. Shown with a "sample" mark. */
  sample: boolean;
  source: {
    sharedText?: string;
    channel: 'link' | 'upload' | 'import' | 'share' | 'dm';
    /** Meta message id, for a save that arrived as a DM (replay stub). */
    externalId?: string;
    /** True for a real Instagram DM delivered by the server (not a replayed sample payload). */
    live?: boolean;
    platform: Platform;
    url?: string;
    caption?: string;
    author?: string;
  };
  mediaKind: 'video' | 'image' | 'none';
  sceneId?: SceneId;
  /** Downscaled key frame of an upload, kept on this device only. */
  thumb?: string;
  thumbExpiresAt?: string | null;
  durationSec?: number;
  /** The user's exact words. Never rewritten. */
  note: string | null;
  /** Notes from saving the same link again (duplicate detection). */
  extraNotes: { text: string; at: string }[];
  noteLanguage: 'en' | 'hi' | 'hinglish';
  /** One-tap reason. Stored on its own, never mixed into `note`. */
  chosenIntent: IntentChip | null;
  /** Private memory: link and note only, never analysed. */
  private: boolean;
  status: 'analysing' | 'ready' | 'error';
  /** State of the source today. The analysis keeps the state at the time it was made. */
  sourceNow: SourceAccessState;
  analysis: MemoryAnalysis | null;
  analysedAt?: string;
  /** The user switched AI suggestions off for this memory from the ledger. */
  suggestionsRemoved?: boolean;
  categoryId: string | null;
  /** Moved by hand: automatic sorting leaves it alone. */
  categoryPinned: boolean;
  projectIds: string[];
  momentPins: MomentPin[];
  reminderAt?: string | null;
  lastOpenedAt?: string;
  resurfaceSnoozedUntil?: string;
  resurfaceDoneAt?: string;
  reminderNotifiedAt?: string;
  ledger: LedgerEntry[];
}

export interface Category {
  id: string;
  name: string;
  /** Short "why this category" line. */
  why: string;
  origin: 'auto' | 'you';
  accepted: boolean;
  pinned: boolean;
}

export type OutcomeKind = 'itinerary' | 'content_brief';

export interface Project {
  id: string;
  name: string;
  goal: string;
  outcome: OutcomeKind;
  sample: boolean;
}

export interface Rule {
  id: string;
  text: string;
  keyword: string;
  targetKind: 'project' | 'category';
  targetId: string;
  createdAt: string;
}

export interface Settings {
  deviceReminders?: boolean;
  features: Record<string, boolean>;
  noteLanguage: 'en' | 'hi' | 'hinglish';
  /** Days a key-frame thumbnail of an upload is kept. 0 means until the memory is deleted. */
  retentionDays: 0 | 1 | 7;
  view: 'grid' | 'list';
  provider: 'mock' | 'gemini';
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  memories: Memory[];
  categories: Category[];
  projects: Project[];
  rules: Rule[];
  settings: Settings;
  waitlist: string[];
}

export const UNSORTED = 'unsorted';
