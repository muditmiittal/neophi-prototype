import { Link } from 'react-router-dom';
import { PageIntro } from '../components/Immersive';
import { Icon } from '../components/Icon';

const RULES: { title: string; plain: string; how: string; shown: 'you' | 'ai' | 'source' | 'unsure' }[] = [
  {
    title: 'Your exact words stay untouched',
    plain: 'What you type as the reason for a save is stored character for character. If you type nothing, the field is empty. It is never filled in for you.',
    how: 'The field is written by code from what you typed. Whatever a model returns for it is discarded before the memory is stored. Tested: tests/guard.test.ts, rule 1.',
    shown: 'you',
  },
  {
    title: 'AI suggestions are separate and labelled',
    plain: 'A guess about why you saved something is shown in its own lane, with a dashed border and the words "AI suggestion". It never moves into your lane.',
    how: 'Every suggestion is stamped as coming from AI by code, whatever label the model gave it. Tested: rule 2.',
    shown: 'ai',
  },
  {
    title: 'Every interpretation links to evidence',
    plain: 'An observation points at a frame, a time range or a quote. Tap the chip and the frame shows the region.',
    how: 'An observation whose evidence reference is missing, or points at nothing, is marked uncertain by code and shown that way. Tested: rule 3.',
    shown: 'source',
  },
  {
    title: 'It says "not sure" when it is not',
    plain: 'Low confidence and missing evidence are shown as "not sure", not hidden and not rounded up. A save with no reason at all is shown as unknown.',
    how: 'Suggestions under 45 out of 100 confidence, and any without evidence, are displayed as "not sure" and never used as the reason for a save.',
    shown: 'unsure',
  },
];

function Mini({ kind }: { kind: (typeof RULES)[number]['shown'] }) {
  if (kind === 'you')
    return (
      <div className="lane lane-you">
        <span className="lane-title">
          <Icon name="pen" /> Your words
        </span>
        <p className="your-words">Sunday ko banana hai, kasuri methi wala step</p>
      </div>
    );
  if (kind === 'ai')
    return (
      <div className="lane lane-ai">
        <span className="lane-title">
          <Icon name="spark" /> AI suggestions
        </span>
        <p className="obs-row">
          Look for a similar red shirt{' '}
          <span className="chip" style={{ borderStyle: 'dashed', borderColor: 'var(--teal)' }}>
            AI suggestion
          </span>
        </p>
      </div>
    );
  if (kind === 'source')
    return (
      <div className="lane lane-source">
        <span className="lane-title">
          <Icon name="eye" /> Source shows
        </span>
        <p className="obs-row">
          Second dancer from the left wears a red shirt{' '}
          <span className="ev-chip">
            <Icon name="eye" /> frame 00:07 to 00:12
          </span>
        </p>
      </div>
    );
  return (
    <div className="lane lane-ai">
      <span className="lane-title">
        <Icon name="spark" /> AI suggestions
      </span>
      <p className="obs-row">
        <span className="muted">Try making this at home</span>
        <span className="not-sure">
          <Icon name="question" /> Not sure
        </span>
      </p>
    </div>
  );
}

export function Trust() {
  return (
    <div className="page wrap">
      <PageIntro video="loop_lanes">
        <h1>Four rules for a memory you can trust</h1>
        <p>They are written as code that every analysis passes through, not as instructions to a model. A model can ignore an instruction. It cannot get past a check.</p>
      </PageIntro>

      <div className="rule-list">
        {RULES.map((r) => (
          <section className="rule-item" key={r.title}>
            <div>
              <h2>{r.title}</h2>
              <Mini kind={r.shown} />
            </div>
            <div>
              <p style={{ color: 'var(--ink)', fontSize: '1.08rem' }}>{r.plain}</p>
              <p>{r.how}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="split" style={{ marginTop: 48 }}>
        <div className="prose">
          <h2>When the source is gone</h2>
          <p>
            Posts get deleted and accounts go private. If Neophi never saw the source, the "Source shows" lane stays empty: it keeps your link and your note, invents
            nothing, and offers to take your own copy.
          </p>
          <p>
            If the source was read before it went away, the text Neophi recorded then is kept and dated, and marked as a record of something that is no longer there.
            The media itself is not kept.
          </p>
          <h2>Private memories</h2>
          <p>Mark a memory private and AI stays off for it: only the link and your note are stored, nothing is analysed, and it never appears in suggestions or insights.</p>
        </div>
        <div className="prose">
          <h2>The ledger</h2>
          <p>Every memory has a ledger: what is stored, what AI added, and when. Steps that AI took, such as placing a save in a category, can be undone from there.</p>
          <h2>Your data, your call</h2>
          <ul>
            <li>Delete one memory, or everything, in one step. Deleting is final.</li>
            <li>Export everything as JSON, Markdown or CSV.</li>
            <li>Uploads are reduced to a small key frame on your device. The original file is not stored.</li>
          </ul>
          <p>
            Details: <Link to="/privacy">Privacy</Link>, <Link to="/data-deletion">Data deletion</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
