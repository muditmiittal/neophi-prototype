import { Icon } from '../components/Icon';
import { Scene } from '../components/Scene';
import { ThemeToggle, Wordmark } from '../components/SiteLayout';
import { ONBOARDING_SAMPLE_IDS, SAMPLE_SAVES } from '../data/sample/saves';
import { finishOnboarding, seedSamples } from '../store/store';

const three = ONBOARDING_SAMPLE_IDS.map((id) => SAMPLE_SAVES.find((s) => s.id === id)!);

export function Onboarding() {
  return (
    <div className="onb">
      <header className="onb-bar">
        <a href="/" className="brand" aria-label="Neophi, back to the site">
          <Wordmark />
        </a>
        <ThemeToggle />
      </header>
      <main className="onb-main">
        <div className="onb-copy">
          <h1>Keep a thought. Come back to it.</h1>
          <p>
            This is a demo account. Everything you do stays in this browser: there is no sign-in and no server. Start with three sample saves so the library is not
            empty, then add your own. Today brings back useful saves with a reason you can inspect.
          </p>
          <ol className="onb-points">
            <li>
              <Icon name="pen" />
              <span>
                <b>Your note is yours.</b> It is stored exactly as you type it.
              </span>
            </li>
            <li>
              <Icon name="spark" />
              <span>
                <b>AI stays in its lane.</b> Suggestions are dashed and labelled.
              </span>
            </li>
            <li>
              <Icon name="question" />
              <span>
                <b>No guessing.</b> When Neophi is not sure, it says so.
              </span>
            </li>
          </ol>
          <div className="onb-actions">
            <button type="button" className="btn btn-primary" onClick={() => seedSamples(ONBOARDING_SAMPLE_IDS)} autoFocus>
              Start with these 3 samples <Icon name="arrow" />
            </button>
            <button type="button" className="btn" onClick={() => seedSamples('all')}>
              Load the full sample library ({SAMPLE_SAVES.length})
            </button>
            <button type="button" className="link-btn" onClick={finishOnboarding}>
              Start empty
            </button>
          </div>
          <p className="hint">Sample saves are invented for this prototype: the pictures are drawings and the accounts do not exist.</p>
        </div>
        <ul className="onb-samples" aria-label="The three sample saves">
          {three.map((s, i) => (
            <li key={s.id} className="polaroid" style={{ rotate: `${[-4, 2.5, -1.5][i]}deg` }}>
              <Scene id={s.scene} title={`Sample illustration: ${s.title}`} />
              <p className={s.note ? 'onb-note' : 'onb-note is-empty'}>{s.note ?? 'no note: one tap, "Go there"'}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
