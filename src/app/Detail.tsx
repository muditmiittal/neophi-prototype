import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { sourceReadable } from '../ai/guard';
import { Frame } from '../components/Frame';
import { Icon } from '../components/Icon';
import { IntentLadder, Lanes, STATE_COPY } from '../components/Lanes';
import { download, memoryToMarkdown } from '../lib/exporting';
import { contentBrief, recipeSteps, type Draft } from '../lib/outcomes';
import { fmtDate, fmtTime, reasonOf } from '../lib/reason';
import {
  addPin,
  markOpened,
  analyseMemory,
  deleteMemory,
  moveMemory,
  removePin,
  restoreSuggestions,
  setChosenIntent,
  setPrivate,
  setReminder,
  toggleProject,
  undoLedger,
  useStore,
} from '../store/store';
import { INTENT_CHIPS } from '../store/types';
import { ConfirmButton, DraftView, EmptyState, PLATFORM_LABEL, useToast } from './ui';

function nextFriday(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return d;
}
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
};

export function Detail() {
  const { id } = useParams();
  const { hash } = useLocation();
  const state = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const m = state.memories.find((x) => x.id === id);
  const [active, setActive] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pinLabel, setPinLabel] = useState('');
  const [pinLen, setPinLen] = useState(5);

  useEffect(() => {
    if (id) markOpened(id);
    setActive(null);
    setTime(0);
    setDraft(null);
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (hash === '#ledger') document.getElementById('ledger')?.scrollIntoView({ block: 'start' });
  }, [id, hash]);

  const a = m && !m.private ? m.analysis : null;
  const activeEv = useMemo(() => a?.evidence.find((e) => e.id === active) ?? null, [a, active]);

  if (!m)
    return (
      <EmptyState title="This memory is not here" icon="question">
        <p>It may have been deleted, or the link is from another browser. Memories live only in the browser they were saved in.</p>
        <Link className="btn" to="/app/library">
          Back to the library
        </Link>
      </EmptyState>
    );

  const features = state.settings.features;
  const cat = state.categories.find((c) => c.id === m.categoryId);
  const projectNames = m.projectIds.map((p) => state.projects.find((x) => x.id === p)?.name ?? '').filter(Boolean);
  const reason = reasonOf({ ...m, projectNames });
  const hasPic = Boolean(m.thumb) || (m.sceneId && m.sceneId !== 'none');
  const isVideo = m.mediaKind === 'video' && hasPic && (m.durationSec ?? 0) > 0;
  const readable = a ? sourceReadable(a.source_access_state) : false;

  const onEvidence = (evId: string) => {
    const ev = a?.evidence.find((e) => e.id === evId);
    setActive(active === evId ? null : evId);
    if (ev?.t != null) setTime(ev.t);
    document.getElementById('frame')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const actions = a?.suggested_actions ?? [];
  const canBrief = !m.private && (actions.includes('content_brief') || a?.purpose === 'create');
  const canSteps = !m.private && (actions.includes('recipe_steps') || a?.purpose === 'food');

  return (
    <article className="detail">
      <p className="detail-back">
        <Link to="/app/library">
          <Icon name="back" /> Library
        </Link>
      </p>
      <header className="detail-head">
        <h1>{m.title}</h1>
        <p className="mcard-meta">
          <span>{PLATFORM_LABEL[m.source.platform]}</span>
          {m.source.author && <span>{m.source.author}</span>}
          <span>Saved {fmtDate(m.createdAt)}</span>
          {m.sample && <span className="stamp">Sample</span>}
          {m.private ? <span className="stamp stamp-warn">Private: AI off</span> : <span className={`stamp${readable && sourceReadable(m.sourceNow) ? ' stamp-teal' : ' stamp-warn'}`}>{STATE_COPY[m.sourceNow].stamp}</span>}
        </p>
        {m.source.url && (
          <p className="detail-url">
            <Icon name="link" />
            {m.sample ? (
              <span title="Sample link: it does not lead anywhere">{m.source.url}</span>
            ) : (
              <a href={m.source.url} target="_blank" rel="noreferrer noopener">
                {m.source.url}
              </a>
            )}
          </p>
        )}
        {m.source.caption && !m.private && <p className="detail-caption">Caption: "{m.source.caption}"</p>}
      </header>

      {m.status === 'analysing' && (
        <p className="banner banner-ai" role="status">
          <span className="analysing-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Analysing. Your link and note are already saved; the lanes fill in when this finishes.</span>
        </p>
      )}
      {m.status === 'error' && (
        <p className="banner banner-warn" role="alert">
          <Icon name="question" />
          <span>
            The analysis did not finish. Your link and note are safe.{' '}
            <button type="button" className="link-btn" onClick={() => void analyseMemory(m.id)}>
              Try again
            </button>
          </span>
        </p>
      )}

      <div className="detail-grid">
        <div className="detail-left" id="frame" style={{ viewTransitionName: 'memory-hero' } as CSSProperties}>
          <Frame
            sceneId={m.sceneId}
            thumb={m.thumb}
            title={m.title}
            mediaKind={m.mediaKind}
            durationSec={m.durationSec}
            time={time}
            onTime={(t) => {
              setTime(t);
              setActive(null);
            }}
            active={activeEv}
            pins={features.momentPins ? m.momentPins : []}
            gone={m.private ? 'private_memory' : hasPic ? null : m.sourceNow}
            sample={m.sample}
          />
          {m.thumb && (
            <p className="hint">
              Key frame made on this device. The original file was not stored.
              {m.thumbExpiresAt ? ` This key frame removes itself on ${fmtDate(m.thumbExpiresAt)}.` : ''}
            </p>
          )}
          {m.sample && isVideo && <p className="hint">Sample clip: a drawing with a timeline, not a real video. Drag the timeline or tap an evidence chip.</p>}

          {features.momentPins && isVideo && (
            <section className="pins" aria-labelledby="pins-title">
              <h2 id="pins-title">Moment pins</h2>
              {m.momentPins.length === 0 && <p className="hint">Pin the seconds that matter, so you never scrub for them again.</p>}
              <ul>
                {m.momentPins.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="ev-chip"
                      onClick={() => {
                        setTime(p.from);
                        // A pin jumps the frame to the evidence recorded for that moment, if there is one.
                        const ev = a?.evidence.find((e) => e.t != null && e.t >= p.from && e.t <= p.to && e.bbox);
                        setActive(ev?.id ?? null);
                      }}
                    >
                      <Icon name="pin" /> {fmtTime(p.from)} to {fmtTime(p.to)}
                    </button>
                    <span>{p.label}</span>
                    <button type="button" className="icon-btn" aria-label={`Remove pin ${p.label}`} onClick={() => removePin(m.id, p.id)}>
                      <Icon name="x" />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="pins-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const to = Math.min(m.durationSec ?? time, time + pinLen);
                  addPin(m.id, time, to, pinLabel.trim() || `Moment at ${fmtTime(time)}`);
                  setPinLabel('');
                }}
              >
                <input className="input" value={pinLabel} onChange={(e) => setPinLabel(e.target.value)} placeholder="What is at this moment?" aria-label="Label for the pin" maxLength={60} />
                <select className="select" value={pinLen} onChange={(e) => setPinLen(Number(e.target.value))} aria-label="Length of the pin">
                  <option value={3}>3 s</option>
                  <option value={5}>5 s</option>
                  <option value={10}>10 s</option>
                </select>
                <button type="submit" className="btn btn-small">
                  <Icon name="pin" /> Pin from {fmtTime(time)}
                </button>
              </form>
            </section>
          )}
        </div>

        <div className="detail-right">
          <section className="why" aria-labelledby="why-title">
            <h2 id="why-title">Why you saved it</h2>
            <p className={`why-text why-${reason.rung}${/[ऀ-ॿ]/.test(reason.text) ? ' deva' : ''}`}>{reason.text}</p>
            <IntentLadder note={m.note} chosenIntent={m.chosenIntent} analysis={a} suggestionsRemoved={m.suggestionsRemoved} projectNames={projectNames} />
            {features.intentChips && (
              <div className="why-chips" role="group" aria-label="Your chosen reason">
                {INTENT_CHIPS.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={m.chosenIntent === c.id} onClick={() => setChosenIntent(m.id, m.chosenIntent === c.id ? null : c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <Lanes
            analysis={a}
            note={m.note}
            extraNotes={m.extraNotes}
            chosenIntent={m.chosenIntent}
            sourceNow={m.sourceNow}
            isPrivate={m.private}
            suggestionsRemoved={m.suggestionsRemoved}
            analysedAt={m.analysedAt}
            activeEvidence={active}
            onEvidence={onEvidence}
            onUpload={!m.private && !readable && m.status === 'ready' ? () => navigate(`/app/capture${m.source.url && !m.sample ? `?url=${encodeURIComponent(m.source.url)}` : ''}`) : undefined}
          />
          {m.suggestionsRemoved && (
            <button type="button" className="link-btn" onClick={() => restoreSuggestions(m.id)}>
              Bring the AI suggestions back
            </button>
          )}

          <section className="steps-next" aria-labelledby="next-title">
            <h2 id="next-title">Use it</h2>
            <div className="steps-next-row">
              {canBrief && (
                <button type="button" className="btn btn-small" onClick={() => setDraft(contentBrief(m))}>
                  <Icon name="book" /> Content brief
                </button>
              )}
              {canSteps && (
                <button type="button" className="btn btn-small" onClick={() => setDraft(recipeSteps(m))}>
                  <Icon name="list" /> Steps
                </button>
              )}
              <span className="remind">
                <Icon name="bell" />
                {m.reminderAt ? (
                  <>
                    Reminder: {new Date(m.reminderAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                    <button type="button" className="link-btn" onClick={() => setReminder(m.id, null)}>
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    Remind me
                    <button type="button" className="chip" onClick={() => setReminder(m.id, inDays(1).toISOString())}>
                      Tomorrow
                    </button>
                    <button type="button" className="chip" onClick={() => setReminder(m.id, nextFriday().toISOString())}>
                      Friday
                    </button>
                    <button type="button" className="chip" onClick={() => setReminder(m.id, inDays(7).toISOString())}>
                      In a week
                    </button>
                  </>
                )}
              </span>
            </div>
            {m.reminderAt && <p className="hint">Reminders appear in Today. Enable device reminders in Settings for notifications while the app is running. No background push.</p>}
            {!canBrief && !canSteps && !m.private && <p className="hint">No brief or steps for this one: there is too little in the source to build from.</p>}
            {draft && <DraftView draft={draft} mock={m.sample} onClose={() => setDraft(null)} />}
          </section>

          <section className="place" aria-labelledby="place-title">
            <h2 id="place-title">Where it lives</h2>
            {m.private ? (
              <p className="hint">Private memories are not sorted into categories.</p>
            ) : (
              <label className="field-inline">
                <span>Category</span>
                <select
                  className="select"
                  value={m.categoryId ?? ''}
                  onChange={(e) => {
                    moveMemory(m.id, e.target.value || null);
                    toast('Moved. It will stay where you put it.');
                  }}
                >
                  <option value="">Not sure yet</option>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {m.categoryPinned && (
                  <span className="hint">
                    <Icon name="pin" /> placed by you
                  </span>
                )}
              </label>
            )}
            {cat && !m.private && <p className="hint">Why "{cat.name}": {cat.why}</p>}
            {features.projects && state.projects.length > 0 && !m.private && (
              <div className="why-chips" role="group" aria-label="Projects">
                <span className="label">Projects</span>
                {state.projects.map((p) => (
                  <button key={p.id} type="button" className="chip" aria-pressed={m.projectIds.includes(p.id)} onClick={() => toggleProject(m.id, p.id)}>
                    <Icon name="flag" /> {p.name}
                  </button>
                ))}
              </div>
            )}
            {features.privateMemories && (
              <label className="check">
                <input type="checkbox" checked={m.private} onChange={(e) => setPrivate(m.id, e.target.checked)} />
                <span>
                  <b>Private: keep AI off</b>
                  <small>{m.private ? 'Untick to let Neophi analyse this memory.' : 'Ticking this deletes the analysis and keeps only your link and note.'}</small>
                </span>
              </label>
            )}
          </section>

          <section id="ledger" className="ledger" aria-labelledby="ledger-title">
            <h2 id="ledger-title">
              <Icon name="ledger" /> Ledger
            </h2>
            <p className="hint">What is stored for this memory, who added it, and when. Steps AI took can be undone.</p>
            <ol>
              {m.ledger.map((l) => (
                <li key={l.id} className={`ledger-${l.actor}${l.undone ? ' is-undone' : ''}`}>
                  <span className="ledger-who">{l.actor === 'you' ? 'You' : l.actor === 'ai' ? 'AI' : 'Neophi'}</span>
                  <span className="ledger-what">{l.what}</span>
                  <span className="ledger-when tnum">{fmtDate(l.at)}</span>
                  {l.undo && !l.undone && !m.private && (
                    <button type="button" className="btn btn-small btn-quiet" onClick={() => undoLedger(m.id, l.id)}>
                      <Icon name="undo" /> Undo
                    </button>
                  )}
                  {l.undone && <span className="stamp">Undone</span>}
                </li>
              ))}
            </ol>
          </section>

          <section className="danger" aria-label="Export and delete">
            <button type="button" className="btn btn-small btn-quiet" onClick={() => download(`${m.id}.md`, memoryToMarkdown(m, state), 'text/markdown')}>
              <Icon name="download" /> Export as Markdown
            </button>
            <button type="button" className="btn btn-small btn-quiet" onClick={() => download(`${m.id}.json`, JSON.stringify(m, null, 2), 'application/json')}>
              <Icon name="download" /> Export as JSON
            </button>
            <ConfirmButton
              label="Delete"
              icon={<Icon name="trash" />}
              confirm="Delete this memory for good?"
              onConfirm={() => {
                deleteMemory(m.id);
                toast('Deleted. It is gone from this browser.');
                navigate('/app');
              }}
            />
          </section>
        </div>
      </div>
    </article>
  );
}
