import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkGeminiServer, GEMINI_SERVER, type ServerHealth } from '../ai/provider';
import { Icon } from '../components/Icon';
import { download, toCsv, toMarkdown } from '../lib/exporting';
import { parseRule, previewRule, readInstagramExport, type ParsedRule } from '../lib/extras';
import { addRule, capture, deleteAll, deleteRule, FEATURES, seedSamples, setFeature, updateSettings, useStore } from '../store/store';
import { DeviceReminderSettings } from './DeviceReminders';
import { Bridges, DmReplay } from './Extras';
import { ConfirmButton, useToast } from './ui';

function ProviderSection() {
  const { settings } = useStore();
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    const h = await checkGeminiServer();
    setHealth(h);
    setChecking(false);
    if (!h.gemini && settings.provider === 'gemini') updateSettings({ provider: 'mock' });
  };
  useEffect(() => {
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className="set-sec" aria-labelledby="set-ai">
      <h2 id="set-ai">AI provider</h2>
      <p>
        <b>Now using: {settings.provider === 'gemini' ? 'Gemini, through your local server' : 'the mock provider'}.</b> The mock gives prepared output for sample saves and
        simple rules for anything new. It does not understand pictures.
      </p>
      <p className={`banner${health?.gemini ? ' banner-ai' : ''}`} role="status">
        <Icon name={health?.gemini ? 'check' : 'offline'} />
        <span>
          {checking
            ? 'Looking for the local Gemini server.'
            : health?.gemini
              ? `Local Gemini server found at ${GEMINI_SERVER}. Analysis model: ${health.analysisModel}. Embedding model: ${health.embeddingModel}.`
              : health?.ok
                ? 'The local server is running, but it has no GEMINI_API_KEY in its environment, so Gemini stays off.'
                : `No local Gemini server at ${GEMINI_SERVER}. Start it with "npm run server" in a terminal that has GEMINI_API_KEY set. See the README.`}
        </span>
      </p>
      <div className="set-row">
        <label className="check">
          <input type="checkbox" checked={settings.provider === 'gemini'} disabled={!health?.gemini} onChange={(e) => updateSettings({ provider: e.target.checked ? 'gemini' : 'mock' })} />
          <span>
            <b>Use Gemini for new saves and search</b>
            <small>Sends the note, caption, link and the small key frame of an upload from your computer to Google's Gemini API. Private memories are never sent.</small>
          </span>
        </label>
        <button type="button" className="btn btn-small btn-quiet" onClick={() => void check()} disabled={checking}>
          Check again
        </button>
      </div>
    </section>
  );
}

function RulesSection() {
  const state = useStore();
  const [text, setText] = useState('anything about Goa goes to Goa trip');
  const [parsed, setParsed] = useState<ParsedRule | { error: string } | null>(null);
  const preview = parsed && !('error' in parsed) ? previewRule(parsed, state.memories) : null;
  return (
    <section className="set-sec" aria-labelledby="set-rules">
      <h2 id="set-rules">
        Rules in plain language <span className="stamp">Preview only</span>
      </h2>
      <p>Write a rule the way you would say it. Neophi shows what it would do before anything moves. In the prototype rules are saved but never applied.</p>
      <form
        className="set-row"
        onSubmit={(e) => {
          e.preventDefault();
          setParsed(parseRule(text, state.categories, state.projects));
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} aria-label="Rule" />
        <button className="btn btn-small" type="submit">
          Preview
        </button>
      </form>
      {parsed && 'error' in parsed && (
        <p className="field-error" role="alert">
          {parsed.error}
        </p>
      )}
      {parsed && !('error' in parsed) && preview && (
        <div className="rule-preview index-card" role="status">
          <p>
            <b>
              Saves about "{parsed.keyword}" would go to the {parsed.targetKind} "{parsed.targetName}".
            </b>
          </p>
          <p>
            Would add {preview.wouldAdd.length}: {preview.wouldAdd.map((m) => m.title).join(', ') || 'none'}.
          </p>
          <p>
            Already there {preview.alreadyThere.length}: {preview.alreadyThere.map((m) => m.title).join(', ') || 'none'}.
          </p>
          <p className="hint">Private memories are never touched by rules.</p>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              addRule({ text, keyword: parsed.keyword, targetKind: parsed.targetKind, targetId: parsed.targetId });
              setParsed(null);
            }}
          >
            Save the rule (not applied in the prototype)
          </button>
        </div>
      )}
      {state.rules.length > 0 && (
        <ul className="rule-saved">
          {state.rules.map((r) => (
            <li key={r.id}>
              <span>{r.text}</span>
              <span className="stamp">Saved, not applied</span>
              <button type="button" className="icon-btn" aria-label={`Delete rule: ${r.text}`} onClick={() => deleteRule(r.id)}>
                <Icon name="x" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SettingsPage() {
  const state = useStore();
  const toast = useToast();
  const { settings } = state;
  const [waitlist, setWaitlist] = useState<string[]>([]);
  const [importMsg, setImportMsg] = useState('');
  useEffect(() => {
    try {
      setWaitlist(JSON.parse(localStorage.getItem('neophi.waitlist') ?? '[]'));
    } catch {
      setWaitlist([]);
    }
  }, []);
  const bytes = new Blob([JSON.stringify(state)]).size;
  const thumbs = state.memories.filter((m) => m.thumb).length;

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const found = readInstagramExport(JSON.parse(await file.text()));
      if (!found.length) return setImportMsg('No Instagram post or Reel links were found in that file. The file to choose is saved_posts.json from your Instagram data download.');
      let added = 0;
      for (const f of found.slice(0, 500)) {
        const r = capture({ url: f.url, note: '', noteLanguage: settings.noteLanguage, chosenIntent: null, isPrivate: false, channel: 'import', createdAt: f.savedAt });
        if (!r.duplicate) added++;
      }
      setImportMsg(`Imported ${added} links; ${Math.min(found.length, 500) - added} of the processed links were already in your library.${found.length > 500 ? ` ${found.length - 500} links were not processed because this import handles up to 500 at a time.` : ''} They are links only: add a note or upload a copy to give them a reason and a picture.`);
    } catch {
      setImportMsg('That file could not be read as JSON. Choose saved_posts.json from the JSON version of your Instagram data download.');
    }
  };

  return (
    <div className="settings">
      <header className="page-top">
        <h1>Settings</h1>
        <p>Demo account. Everything below applies to this browser only.</p>
      </header>

      <DeviceReminderSettings />
      <ProviderSection />

      <section className="set-sec" aria-labelledby="set-feat">
        <h2 id="set-feat">Features</h2>
        <ul className="toggles">
          {FEATURES.map((f) => (
            <li key={f.id}>
              <label className="check">
                <input type="checkbox" checked={settings.features[f.id] !== false} onChange={(e) => setFeature(f.id, e.target.checked)} />
                <span>
                  <b>{f.label}</b>
                  <small>{f.hint}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="set-sec" aria-labelledby="set-lang">
        <h2 id="set-lang">Language</h2>
        <div className="set-row">
          <label className="field-inline">
            <span>I usually write notes in</span>
            <select className="select" value={settings.noteLanguage} onChange={(e) => updateSettings({ noteLanguage: e.target.value as typeof settings.noteLanguage })}>
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
        </div>
        <p className="hint">The interface is in English for now. Notes and search work in English, Hindi and Hinglish, in Devanagari or Latin script.</p>
      </section>

      <section className="set-sec" aria-labelledby="set-ret">
        <h2 id="set-ret">Retention of uploads</h2>
        <p>An upload is reduced to one small key frame on your device. The original image or video is never stored. Choose how long the key frame is kept:</p>
        <div className="seg seg-text" role="radiogroup" aria-label="Keep key frames for">
          {([1, 7, 0] as const).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={settings.retentionDays === d} aria-pressed={settings.retentionDays === d} onClick={() => updateSettings({ retentionDays: d })}>
              {d === 0 ? 'Until I delete the memory' : d === 1 ? '1 day' : '7 days'}
            </button>
          ))}
        </div>
        <p className="hint">Applies to uploads from now on. When the time is up the key frame is removed the next time the app opens; your note and the recorded text stay. {thumbs} key frame{thumbs === 1 ? ' is' : 's are'} stored now.</p>
      </section>

      {settings.features.rules && <RulesSection />}

      <Bridges />

      <section className="set-sec" aria-labelledby="set-import">
        <h2 id="set-import">Bring saves in</h2>
        <div className="set-row">
          <label className="btn btn-small btn-quiet">
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onImport(e.target.files?.[0])} />
            <Icon name="upload" /> Import Instagram's saved_posts.json
          </label>
          <button
            type="button"
            className="btn btn-small btn-quiet"
            onClick={() => {
              seedSamples('all');
              toast('Sample library loaded.');
            }}
          >
            Load the sample library
          </button>
        </div>
        <p className="hint" role="status">
          {importMsg || 'From Instagram: Accounts Centre, Your information and permissions, Download your information, format JSON. Links only are imported; no media, and nothing is sent anywhere. Tested on a hand-made file, not yet on a real export.'}
        </p>
        <DmReplay />
      </section>

      <section className="set-sec" aria-labelledby="set-stored">
        <h2 id="set-stored">What is stored</h2>
        <ul className="stored">
          <li>
            <b className="tnum">{state.memories.length}</b> memories: the link, your note exactly as typed, your chosen reason, the analysis and the ledger.
          </li>
          <li>
            <b className="tnum">{state.categories.length}</b> categories, <b className="tnum">{state.projects.length}</b> projects, <b className="tnum">{state.rules.length}</b> rules.
          </li>
          <li>
            <b className="tnum">{thumbs}</b> key frames of uploads. No original files.
          </li>
          <li>
            Waitlist email: {waitlist.length ? waitlist.join(', ') : 'none'}.{' '}
            {waitlist.length > 0 && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  localStorage.removeItem('neophi.waitlist');
                  setWaitlist([]);
                }}
              >
                Remove it
              </button>
            )}
          </li>
          <li>
            About <b className="tnum">{Math.max(1, Math.round(bytes / 1024))}</b> KB in this browser's local storage. Instagram messages may also be temporarily queued on the capture server; see Privacy.
          </li>
        </ul>
        <p className="hint">
          More in <Link to="/privacy">Privacy</Link> and <Link to="/data-deletion">Data deletion</Link>.
        </p>
      </section>

      <section className="set-sec" aria-labelledby="set-export">
        <h2 id="set-export">Export everything</h2>
        <div className="set-row">
          <button type="button" className="btn btn-small" onClick={() => download('neophi-export.json', JSON.stringify(state, null, 2), 'application/json')}>
            <Icon name="download" /> JSON (complete)
          </button>
          <button type="button" className="btn btn-small" onClick={() => download('neophi-export.md', toMarkdown(state), 'text/markdown')}>
            <Icon name="download" /> Markdown
          </button>
          <button type="button" className="btn btn-small" onClick={() => download('neophi-export.csv', toCsv(state), 'text/csv')}>
            <Icon name="download" /> CSV
          </button>
        </div>
      </section>

      <section className="set-sec set-danger" aria-labelledby="set-del">
        <h2 id="set-del">Delete everything</h2>
        <p>Removes every memory, category, project, rule and setting from this browser, and the waitlist email. It cannot be undone. Export first if you want a copy.</p>
        <ConfirmButton
          label="Delete all"
          icon={<Icon name="trash" />}
          confirm="Delete everything in this browser?"
          onConfirm={() => {
            deleteAll();
          }}
        />
      </section>
    </div>
  );
}
