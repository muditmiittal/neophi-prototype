// "Try a memory": pick a sample save, write why (or do not), analyse, read the three lanes.
// Runs on the mock provider; nothing leaves the page.

import { useMemo, useRef, useState } from 'react';
import { createMockProvider } from '../ai/provider/mock';
import type { MemoryAnalysis } from '../ai/types';
import { DEMO_SAMPLE_IDS, SAMPLE_SAVES } from '../data/sample/saves';
import { Frame } from './Frame';
import { Icon } from './Icon';
import { IntentLadder, Lanes } from './Lanes';
import { Scene } from './Scene';

const samples = DEMO_SAMPLE_IDS.map((id) => SAMPLE_SAVES.find((s) => s.id === id)!);
const provider = createMockProvider(700);

export function Demo() {
  const [id, setId] = useState(samples[0].id);
  const sample = samples.find((s) => s.id === id)!;
  const [note, setNote] = useState(sample.note ?? '');
  const [status, setStatus] = useState<'idle' | 'analysing' | 'done'>('idle');
  const [result, setResult] = useState<{ analysis: MemoryAnalysis; note: string | null } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const run = useRef(0);

  const pick = (nextId: string) => {
    const next = samples.find((s) => s.id === nextId)!;
    run.current++;
    setId(nextId);
    setNote(next.note ?? '');
    setStatus('idle');
    setResult(null);
    setActive(null);
    setTime(0);
  };

  const analyse = async () => {
    const mine = ++run.current;
    setStatus('analysing');
    setActive(null);
    const analysis = await provider.analyse({ sampleId: sample.id, note, mediaKind: sample.mediaKind, sourceState: sample.stateAtSave, caption: sample.caption, url: sample.url });
    if (mine !== run.current) return;
    setResult({ analysis, note: analysis.explicit_user_intent });
    setStatus('done');
    // Show the strongest evidence straight away: the note's own grounding if there is one.
    const first = analysis.note_grounding.evidence[0] ?? analysis.observed_objects.find((o) => o.evidence)?.evidence ?? null;
    const ev = analysis.evidence.find((e) => e.id === first);
    setActive(ev?.bbox ? ev.id : null);
    if (ev?.t != null) setTime(ev.t);
    resultRef.current?.focus({ preventScroll: true });
  };

  const activeEv = useMemo(() => result?.analysis.evidence.find((e) => e.id === active) ?? null, [result, active]);
  const onEvidence = (evId: string) => {
    const ev = result?.analysis.evidence.find((e) => e.id === evId);
    setActive(active === evId ? null : evId);
    if (ev?.t != null) setTime(ev.t);
  };

  const unreadable = sample.stateAtSave !== 'available' && sample.stateAtSave !== 'user_provided';

  return (
    <section className="demo" id="try" aria-labelledby="try-title">
      <div className="wrap">
        <header className="section-head">
          <h2 id="try-title">Try a memory</h2>
          <p>Pick a save, say why you saved it, or say nothing. Then read what Neophi keeps apart: what the source shows, your words, and its own suggestions.</p>
        </header>

        <div className="demo-grid">
          <form
            className="demo-form index-card"
            onSubmit={(e) => {
              e.preventDefault();
              void analyse();
            }}
          >
            <fieldset className="demo-picker">
              <legend className="label">1. Pick a sample save</legend>
              <div className="demo-picks">
                {samples.map((s) => (
                  <label key={s.id} className={`demo-pick${s.id === id ? ' is-on' : ''}`}>
                    <input type="radio" name="sample" className="sr-only" checked={s.id === id} onChange={() => pick(s.id)} />
                    <span className="polaroid">
                      {s.scene === 'none' ? (
                        <span className="demo-pick-gone">
                          <Icon name="offline" />
                        </span>
                      ) : (
                        <Scene id={s.scene} />
                      )}
                    </span>
                    <span className="demo-pick-name">{s.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="field">
              <span>2. Why did you save it? (optional)</span>
              <textarea
                className="textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type in English, Hindi or Hinglish. Or leave it empty."
                rows={2}
                maxLength={280}
              />
              <span className="hint">Try clearing it: an empty note stays empty.</span>
            </label>

            <button type="submit" className="btn btn-primary" disabled={status === 'analysing'}>
              {status === 'analysing' ? (
                <>
                  <span className="analysing-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Analysing
                </>
              ) : (
                <>
                  <Icon name="spark" /> 3. Analyse
                </>
              )}
            </button>
            <p className="hint">Sample saves and the analysis are prepared for this demo (mock provider). The rules that keep your words apart are real code.</p>
          </form>

          <div className="demo-result" ref={resultRef} tabIndex={-1} aria-live="polite" aria-busy={status === 'analysing'}>
            <div className="demo-frame">
              <Frame
                sceneId={sample.scene}
                title={sample.title}
                mediaKind={sample.mediaKind}
                durationSec={sample.durationSec}
                time={time}
                onTime={setTime}
                active={activeEv}
                gone={unreadable ? sample.stateAtSave : null}
                sample
              />
              <p className="demo-caption">
                {sample.caption ? (
                  <>
                    <span className="stamp">Sample</span> {sample.author}: "{sample.caption}"
                  </>
                ) : (
                  <>
                    <span className="stamp">Sample</span> A link to a post that was deleted before Neophi could read it.
                  </>
                )}
              </p>
            </div>
            <div className="demo-lanes">
              {status === 'done' && result ? (
                <>
                  <IntentLadder note={result.note} chosenIntent={null} analysis={result.analysis} />
                  <Lanes
                    analysis={result.analysis}
                    note={result.note}
                    sourceNow={sample.stateNow}
                    activeEvidence={active}
                    onEvidence={onEvidence}
                    onUpload={unreadable ? () => (window.location.href = '/app/capture') : undefined}
                  />
                </>
              ) : (
                <div className={`demo-wait${status === 'analysing' ? ' is-busy' : ''}`}>
                  <div className="lane lane-source">
                    <span className="lane-title">
                      <Icon name="eye" /> Source shows
                    </span>
                  </div>
                  <div className="lane lane-you">
                    <span className="lane-title">
                      <Icon name="pen" /> Your words
                    </span>
                  </div>
                  <div className="lane lane-ai">
                    <span className="lane-title">
                      <Icon name="spark" /> AI suggestions
                    </span>
                  </div>
                  <p className="hint">{status === 'analysing' ? 'Reading the sample and checking the output against the rules.' : 'Press Analyse to fill the three lanes.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
