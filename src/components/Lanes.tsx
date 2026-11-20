// The three lanes: what the source shows, your words, AI suggestions. Used by the home-page demo and the app.

import { NOT_SURE_BELOW, sourceReadable } from '../ai/guard';
import type { Evidence, MemoryAnalysis, SourceAccessState } from '../ai/types';
import { chipLabel, filledRungs, fmtDate, reasonOf, RUNGS } from '../lib/reason';
import type { IntentChip } from '../store/types';
import { Icon } from './Icon';

const isDeva = (s: string) => /[ऀ-ॿ]/.test(s);

export const STATE_COPY: Record<SourceAccessState, { stamp: string; title: string; body: string }> = {
  available: { stamp: 'Source read', title: '', body: '' },
  user_provided: { stamp: 'Your upload', title: '', body: '' },
  deleted: {
    stamp: 'Source deleted',
    title: 'This post is no longer available.',
    body: 'Neophi never saw it, so nothing about it is shown here. Your link and your note are kept as they are.',
  },
  private: {
    stamp: 'Private account',
    title: 'This is from a private account.',
    body: 'Neophi cannot read it and does not try to. Your link and your note are kept as they are.',
  },
  unsupported: {
    stamp: 'Link only',
    title: 'This link was kept, not read.',
    body: 'The prototype does not fetch media from links. Upload a screenshot or a screen recording to add what the source shows.',
  },
};

function EvChip({ ev, active, onPick }: { ev: Evidence; active: boolean; onPick?: (id: string) => void }) {
  const pointable = Boolean(onPick) && (ev.bbox || typeof ev.t === 'number');
  const icon = ev.kind === 'frame' ? 'eye' : ev.kind === 'note' ? 'pen' : 'book';
  if (!pointable)
    return (
      <span className="ev-chip">
        <Icon name={icon} />
        {ev.ref}
      </span>
    );
  return (
    <button type="button" className="ev-chip" aria-pressed={active} onClick={() => onPick?.(ev.id)} title="Show this in the frame">
      <Icon name={icon} />
      {ev.ref}
    </button>
  );
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className={`conf${value < NOT_SURE_BELOW ? ' low' : ''}`}>
      <span className="conf-bar" role="img" aria-label={`Confidence ${pct} out of 100`}>
        <i style={{ width: `${pct}%` }} />
      </span>
      {pct}%
    </span>
  );
}

export function IntentLadder(props: Parameters<typeof reasonOf>[0]) {
  const reason = reasonOf(props);
  const filled = filledRungs(props);
  return (
    <ol className="ladder" aria-label="Where the reason for this save comes from">
      {RUNGS.map((r) => (
        <li key={r.id} aria-current={reason.rung === r.id ? 'true' : undefined} className={filled.includes(r.id) ? 'has-value' : undefined}>
          <b>{r.title}</b>
          {r.blurb}
        </li>
      ))}
    </ol>
  );
}

export interface LanesProps {
  analysis: MemoryAnalysis | null;
  note: string | null;
  extraNotes?: { text: string; at: string }[];
  chosenIntent?: IntentChip | null;
  sourceNow: SourceAccessState;
  isPrivate?: boolean;
  suggestionsRemoved?: boolean;
  analysedAt?: string;
  activeEvidence?: string | null;
  onEvidence?: (id: string) => void;
  onUpload?: () => void;
}

export function Lanes(p: LanesProps) {
  const a = p.analysis;
  const ev = (id?: string) => (id && a ? a.evidence.find((e) => e.id === id) : undefined);
  const wasRead = a ? sourceReadable(a.source_access_state) : false;
  const goneLater = wasRead && !sourceReadable(p.sourceNow);
  const state = STATE_COPY[p.sourceNow];
  const suggestions = !a || p.suggestionsRemoved ? [] : a.inferred_possible_intents;
  const providerLine =
    a?.provider === 'gemini'
      ? 'From Gemini, through your local server.'
      : a?.provider === 'mock'
        ? 'From the mock provider: prepared for samples, simple rules for anything new.'
        : '';

  return (
    <div className="lanes">
      <section className="lane lane-source" aria-labelledby="lane-source">
        <h3 id="lane-source" className="lane-title">
          <Icon name="eye" /> Source shows
        </h3>
        {p.isPrivate ? (
          <p className="lane-empty">
            <b>AI is off for this memory.</b> Nothing was read or analysed. Only your link and your note are stored.
          </p>
        ) : !a ? (
          <p className="lane-empty">Not analysed yet.</p>
        ) : !wasRead ? (
          <div className="lane-empty">
            <p>
              <b>{state.title}</b> {state.body}
            </p>
            {p.onUpload && (
              <button type="button" className="btn btn-small btn-quiet" style={{ marginTop: 12 }} onClick={p.onUpload}>
                <Icon name="upload" /> Upload your own copy
              </button>
            )}
          </div>
        ) : (
          <div className="obs-list">
            {goneLater && (
              <p className="banner banner-warn">
                <Icon name="lock" />
                <span>
                  The source was removed after you saved it. This is the text Neophi recorded{p.analysedAt ? ` on ${fmtDate(p.analysedAt)}` : ''}, while it was still
                  there. The media itself was not kept.
                </span>
              </p>
            )}
            {a.source_summary && <p>{a.source_summary}</p>}
            {a.observed_objects.map((o, i) => {
              const e = ev(o.evidence);
              return (
                <div key={i} className={`obs${o.uncertain ? ' is-uncertain' : ''}`}>
                  <span className="obs-text">{o.label}</span>
                  <span className="obs-row">
                    {e ? (
                      <EvChip ev={e} active={p.activeEvidence === e.id} onPick={p.onEvidence} />
                    ) : (
                      <span className="not-sure">
                        <Icon name="question" /> Not sure: no evidence found
                      </span>
                    )}
                    {e && <Confidence value={o.confidence} />}
                  </span>
                </div>
              );
            })}
            {a.visible_text.length > 0 && (
              <p className="hint">
                Text on screen: {a.visible_text.map((t) => `"${t}"`).join(', ')}
              </p>
            )}
            {a.transcript_summary && <p className="hint">Audio: {a.transcript_summary}</p>}
          </div>
        )}
      </section>

      <section className="lane lane-you" aria-labelledby="lane-you">
        <h3 id="lane-you" className="lane-title">
          <Icon name="pen" /> Your words
        </h3>
        {p.note ? (
          <>
            <p className={`your-words${isDeva(p.note) ? ' deva' : ''}`}>{p.note}</p>
            {p.extraNotes?.map((n) => (
              <p key={n.at} className={`your-words${isDeva(n.text) ? ' deva' : ''}`} style={{ marginTop: 8, fontSize: '1.05rem' }}>
                {n.text}
              </p>
            ))}
            <p className="hint" style={{ marginTop: 8 }}>
              Kept exactly as you typed it. AI never edits this.
            </p>
          </>
        ) : (
          <p className="lane-empty">
            <b>You did not write a note.</b> Neophi leaves this empty instead of guessing one for you.
          </p>
        )}
        {p.chosenIntent && (
          <p className="obs-row" style={{ marginTop: 12 }}>
            <span className="hint">You chose</span>
            <span className="chip">{chipLabel(p.chosenIntent)}</span>
            <span className="hint">one tap, stored apart from your words</span>
          </p>
        )}
        {a && p.note && a.note_grounding.status !== 'no_note' && !p.isPrivate && (
          <div className="obs" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            {a.note_grounding.status === 'grounded' ? (
              <>
                <span>
                  <b>Found in the source.</b> {a.note_grounding.explanation}
                </span>
                <span className="obs-row">
                  {a.note_grounding.evidence.map((id) => {
                    const e = ev(id);
                    return e ? <EvChip key={id} ev={e} active={p.activeEvidence === id} onPick={p.onEvidence} /> : null;
                  })}
                </span>
              </>
            ) : (
              <span className="obs-row">
                <span className="not-sure">
                  <Icon name="question" /> Not sure
                </span>
                <span className="hint">{a.note_grounding.explanation}</span>
              </span>
            )}
          </div>
        )}
      </section>

      <section className="lane lane-ai" aria-labelledby="lane-ai">
        <h3 id="lane-ai" className="lane-title">
          <Icon name="spark" /> AI suggestions
        </h3>
        {p.isPrivate ? (
          <p className="lane-empty">None. AI is off for this memory.</p>
        ) : p.suggestionsRemoved ? (
          <p className="lane-empty">You removed the AI suggestions for this memory. The ledger can bring them back.</p>
        ) : suggestions.length === 0 ? (
          <p className="lane-empty">
            <b>No suggestion.</b> {a ? 'There is not enough to go on, and Neophi would rather say so.' : 'Not analysed yet.'}
          </p>
        ) : (
          <div className="obs-list">
            {suggestions.map((s, i) => {
              const e = ev(s.evidence);
              const unsure = s.uncertain || s.confidence < NOT_SURE_BELOW;
              return (
                <div key={i} className={`obs${unsure ? ' is-uncertain' : ''}`}>
                  <span className="obs-text">{s.intent}</span>
                  <span className="obs-row">
                    {unsure ? (
                      <span className="not-sure">
                        <Icon name="question" /> Not sure
                      </span>
                    ) : (
                      <span className="chip" style={{ borderStyle: 'dashed', borderColor: 'var(--teal)' }}>
                        {s.label}
                      </span>
                    )}
                    <Confidence value={s.confidence} />
                    {e ? <EvChip ev={e} active={p.activeEvidence === e.id} onPick={p.onEvidence} /> : <span className="hint">no evidence</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {providerLine && !p.isPrivate && (
          <p className="hint" style={{ marginTop: 12 }}>
            {providerLine}
          </p>
        )}
      </section>
    </div>
  );
}
