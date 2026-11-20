import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Demo } from '../components/Demo';
import { Hero } from '../components/Hero';
import { Icon } from '../components/Icon';
import { HeroPanel, Panel } from '../components/Immersive';
import { RUNGS } from '../lib/reason';

function Waitlist() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saved' | 'invalid' | 'error'>('idle');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setState('invalid');
    try {
      const list: string[] = JSON.parse(localStorage.getItem('neophi.waitlist') ?? '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('neophi.waitlist', JSON.stringify(list));
      setState('saved');
    } catch {
      setState('error');
    }
  };
  return (
    <form className="waitlist" onSubmit={submit} noValidate>
      <label className="field">
        <span>Email for the waitlist</span>
        <span className="waitlist-row">
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setState('idle');
            }}
            aria-invalid={state === 'invalid'}
            aria-describedby="waitlist-msg"
          />
          <button className="btn btn-primary" type="submit">
            Keep my place
          </button>
        </span>
      </label>
      <p id="waitlist-msg" className="hint" role="status">
        {state === 'saved'
          ? 'Saved in this browser only. The prototype sends nothing anywhere; you can clear it in the app settings.'
          : state === 'invalid'
            ? 'Enter an email address with a name and domain, such as you@example.com.'
            : state === 'error'
              ? 'This browser could not store the address. Nothing was sent. You can try again with site storage enabled.'
            : 'Prototype: the address is stored in this browser only and is not sent to anyone.'}
      </p>
    </form>
  );
}

export function Home() {
  return (
    <>
      <HeroPanel />
      <Hero />
      <Panel video="loop_today" className="steps pf-paper" label="How it goes">
        <div className="wrap">
          <h2 id="steps-title" className="sr-only">
            How it goes
          </h2>
          <ol className="steps-row">
            <li>
              <span className="steps-n" aria-hidden="true">
                1
              </span>
              <h3>Save it, and say why</h3>
              <p>Paste a link or upload a screenshot. Add a few words, tap one chip, or add nothing. The reason is yours, in your language.</p>
              <div className="steps-art" aria-hidden="true">
                <span className="chip">Buy</span>
                <span className="chip" style={{ background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
                  Try
                </span>
                <span className="chip">Go there</span>
                <span className="steps-note">Sunday ko banana hai</span>
              </div>
            </li>
            <li>
              <span className="steps-n" aria-hidden="true">
                2
              </span>
              <h3>It sorts itself around you</h3>
              <p>Categories come from your own notes and saves, each with a line on why it exists. Rename, merge or pin them. No tagging.</p>
              <div className="steps-art" aria-hidden="true">
                <span className="steps-tab">Sunday cooking</span>
                <span className="steps-tab">Goa in January</span>
                <span className="steps-why">why: two notes are about going there</span>
              </div>
            </li>
            <li>
              <span className="steps-n" aria-hidden="true">
                3
              </span>
              <h3>Find it half remembered</h3>
              <p>Search the way you remember it, in English, Hindi or Hinglish. Every result says why it matched.</p>
              <div className="steps-art" aria-hidden="true">
                <span className="steps-query">
                  <Icon name="search" /> laal shirt wala dance, pichle mahine
                </span>
                <span className="steps-why">matched: "red" and "shirt" are in your note</span>
              </div>
            </li>
          </ol>
        </div>
      </Panel>

      <Panel video="loop_lanes" id="reason-demo" className="reason-demo pf-paper" label="Your reason next to the AI’s guess"><div className="wrap">
        <p className="label">Illustrative sample · your reason comes first</p>
        <h2 id="reason-title">What your reason looks like next to the AI’s guess</h2>
        <div className="split">
          <div className="lane lane-you"><h3>Your exact words</h3><p className="your-words">Sunday ko banana hai, kasuri methi wala step</p><p className="hint">Kept exactly as typed. AI cannot rewrite this field.</p></div>
          <div className="lane lane-ai"><h3>AI suggestion · not sure</h3><p>Maybe you want to try this recipe.</p><p className="hint">No evidence for your intention. This stays a guess; it never becomes your reason.</p></div>
        </div>
        <a href="#try">Try it with an invented sample and inspect the evidence</a>
      </div></Panel>
      <Panel video="loop_student" className="measured-strip pf-paper" label="Measured on 12 test saves"><div className="wrap"><h2 id="measured-title">Measured on 12 test saves</h2><p>Small test · 20 Nov 2026</p><ul><li><b>12 of 12</b> analyses returned valid output</li><li><b>41 of 41</b> observed objects carried an evidence reference</li><li><b>About 15.5 seconds</b> average analysis time</li><li><b>About US$0.0052</b> average estimated cost per save at published prices read that day</li></ul><p className="hint">Valid output and reference coverage do not establish accuracy. This is a small test, not a retrieval benchmark or a price promise. <Link to="/how-we-measure">Read the method and limits</Link>.</p></div></Panel>
      <Demo />

      <Panel video="loop_evening" tone="night" className="trust-band" label="Four rules for a memory you can trust">
        <div className="wrap trust-band-in">
          <div>
            <h2 id="trust-title">A memory you can trust has rules.</h2>
            <p>These four are enforced in code, not asked of a model. Three of them have unit tests you can run.</p>
            <Link className="btn trust-band-btn" to="/trust">
              Read how each rule works <Icon name="arrow" />
            </Link>
          </div>
          <ol className="trust-rules">
            <li>
              <b>Your exact words stay untouched.</b> Whatever a model writes in that field is thrown away.
            </li>
            <li>
              <b>AI suggestions are separate and labelled.</b> A dashed line always means "this can be wrong".
            </li>
            <li>
              <b>Every interpretation links to evidence.</b> A frame, a second, a quote. Tap it to see it.
            </li>
            <li>
              <b>It says "not sure" when it is not.</b> No evidence, no claim.
            </li>
          </ol>
        </div>
      </Panel>

      <Panel video="loop_traveller" className="ladder-sec pf-paper" label="One reason per save">
        <div className="wrap ladder-sec-in">
          <div>
            <h2 id="ladder-title">One reason per save, and where it came from.</h2>
            <p>
              Each memory carries a single reason with a stated source, strongest first. That is what lets Neophi sort, search and act without pretending to know
              what you meant.
            </p>
          </div>
          <ol className="ladder-big">
            {RUNGS.map((r, i) => (
              <li key={r.id}>
                <span className="tnum">{i + 1}</span>
                <b>{r.title}</b>
                <span>
                  {
                    [
                      'Your own note, never edited by AI.',
                      'One tap on a chip such as Buy or Go there, or a project you put it in.',
                      'A labelled suggestion with evidence and a confidence.',
                      'Shown as unknown. Nothing is made up to fill the gap.',
                    ][i]
                  }
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <Panel video="night_footer" tone="night" className="closing" label="Compare and plans">
        <div className="wrap closing-in">
          <div className="closing-compare">
            <h2 id="closing-title">Other tools save Reels too.</h2>
            <p>
              We put what Neophi does today next to what is only planned, and next to what other tools say about themselves. Nothing there claims we are better:
              that waits for a measured benchmark.
            </p>
            <p className="closing-links">
              <Link to="/compare">See the honest comparison</Link>
              <Link to="/how-we-measure">How we will measure it</Link>
            </p>
          </div>
          <div className="closing-wait index-card">
            <h3>Plans: decided after we measure cost.</h3>
            <p>There is no price list yet. We will set limits from what processing really costs and what people actually use.</p>
            <Waitlist />
          </div>
        </div>
      </Panel>
    </>
  );
}
