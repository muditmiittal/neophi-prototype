// The Memory contract. Shape follows SYSTEM_DESIGN.md section 3; fields marked "prototype" are additions
// this build needs to show evidence and the intent ladder on screen.

export type SourceAccessState = 'available' | 'private' | 'deleted' | 'unsupported' | 'user_provided';
export type Purpose = 'shop' | 'learn' | 'create' | 'travel' | 'food' | 'try_later' | 'other';

/** Region of the key frame, in percent of its width and height. */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Evidence {
  id: string;
  kind: 'frame' | 'quote' | 'caption' | 'note';
  /** Human-readable reference: "frame 00:09", a quoted line, and so on. */
  ref: string;
  /** Seconds into the clip, for frame evidence. */
  t?: number;
  tEnd?: number;
  bbox?: BBox | null;
}

export interface ObservedObject {
  label: string;
  where: string;
  bbox: BBox | null;
  confidence: number;
  /** prototype: id of an Evidence item. Missing or dangling means "shown as uncertain". */
  evidence?: string;
  /** Set by the guard, never by a provider. */
  uncertain?: boolean;
}

export interface InferredIntent {
  intent: string;
  confidence: number;
  label: 'AI suggestion';
  /** Set by the guard: every inferred intent is tagged as coming from AI. */
  origin: 'ai';
  evidence?: string;
  uncertain?: boolean;
}

export interface ActionableEntity {
  type: 'product' | 'place' | 'recipe' | 'tool' | 'person';
  name: string;
  evidence: string;
  uncertain?: boolean;
}

export type SuggestedAction = 'content_brief' | 'recipe_steps' | 'set_reminder' | 'itinerary_stop';

/** prototype: how the user's own words connect to the source. */
export interface NoteGrounding {
  status: 'grounded' | 'not_sure' | 'no_note' | 'not_attempted';
  evidence: string[];
  explanation: string;
}

export interface MemoryAnalysis {
  source_summary: string;
  observed_objects: ObservedObject[];
  visible_text: string[];
  transcript_summary: string;
  /** The user's exact words, or null. Written by code from the input, never by a model. */
  explicit_user_intent: string | null;
  inferred_possible_intents: InferredIntent[];
  intent_confidence: number;
  actionable_entities: ActionableEntity[];
  suggested_actions: SuggestedAction[];
  evidence: Evidence[];
  source_access_state: SourceAccessState;
  purpose: Purpose;
  note_grounding: NoteGrounding;
  /** prototype: which provider produced this, shown on screen. */
  provider: 'mock' | 'gemini' | 'none';
}

/** What a provider may return: anything. The guard decides what survives. */
export type RawAnalysis = Partial<Record<keyof MemoryAnalysis, unknown>>;

export interface LocalImageFacts {
  width: number;
  height: number;
  /** Colour names measured on the device, strongest first, with the region where each is densest. */
  colours: { name: string; share: number; bbox: BBox }[];
}

export interface AnalyseInput {
  /** Id of a built-in sample save, if this is one. */
  sampleId?: string;
  url?: string;
  caption?: string;
  /** The user's note exactly as typed. Empty or whitespace means no note. */
  note?: string | null;
  noteLanguage?: 'en' | 'hi' | 'hinglish';
  mediaKind: 'video' | 'image' | 'none';
  /** State of the source as the capture step found it. */
  sourceState: SourceAccessState;
  /** Facts measured locally from an uploaded image or a video key frame. */
  local?: LocalImageFacts;
  /** Downscaled JPEG data URL of an upload; sent to the local Gemini server only when that provider is on. */
  imageDataUrl?: string;
  durationSec?: number;
  /** Message id of an Instagram DM: lets the server attach the media it fetched for that share. */
  dmMid?: string;
}

export interface AIProvider {
  readonly name: 'mock' | 'gemini';
  analyse(input: AnalyseInput): Promise<MemoryAnalysis>;
  embed(text: string): Promise<number[]>;
}
