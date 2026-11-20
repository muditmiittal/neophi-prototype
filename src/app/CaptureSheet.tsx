// Save something: a link, an upload, or both; a note, a chip, or neither.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { MAX_UPLOAD_MB, prepareUpload, type PreparedUpload } from '../lib/imageFacts';
import { capture, useStore } from '../store/store';
import { INTENT_CHIPS, type IntentChip } from '../store/types';
import { sharedUrl } from '../lib/shareTarget';
import { NoteInput } from './NoteInput';
import { useToast } from './ui';


export function CaptureSheet({ onClose }: { onClose: () => void }) {
  const { settings } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(() => sharedUrl(params));
  const [note, setNote] = useState('');
  const [lang, setLang] = useState(settings.noteLanguage);
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const speak = () => {
    type Rec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setVoiceMsg('This browser has no speech recognition. Type your reason instead.'); return; }
    const rec = new Ctor();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
      if (said) setNote((n) => (n ? `${n} ${said}` : said).slice(0, 500));
      setVoiceMsg('Heard you. Check the words below: they are stored exactly as shown.');
    };
    rec.onerror = () => setVoiceMsg('Speech recognition did not return words. Try again or type your reason.');
    rec.onend = () => setListening(false);
    setVoiceMsg('');
    setListening(true);
    rec.start();
  };
  const [chip, setChip] = useState<IntentChip | null>(null);
  const [isPrivate, setPrivate] = useState(false);
  const [upload, setUpload] = useState<PreparedUpload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: 'url' | 'file' | 'form'; text: string } | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUpload(await prepareUpload(file));
    } catch (e) {
      setUpload(null);
      setError({ field: 'file', text: e instanceof Error ? e.message : 'The file could not be read on this device. Choose another image or paste a link.' });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const link = url.trim();
    if (!link && !upload) return setError({ field: 'form', text: 'Paste a link or choose a file. One of the two is needed.' });
    if (link) {
      try {
        const u = new URL(link);
        if (!/^https?:$/.test(u.protocol)) throw new Error();
      } catch {
        return setError({ field: 'url', text: 'That does not look like a link. It should start with https://' });
      }
    }
    const result = capture({ sharedTitle: params.get('title') || undefined, sharedText: params.get('text') || undefined, url: link || undefined, note, noteLanguage: lang, chosenIntent: chip, isPrivate, upload: upload ?? undefined, channel: params.has('url') || params.has('text') || params.has('title') ? 'share' : undefined });
    toast(result.duplicate ? 'You had already saved this link. Your new note was added to it.' : isPrivate ? 'Saved as private. Nothing was analysed.' : 'Saved. Analysing now.');
    navigate(`/app/m/${result.id}`);
  };

  return (
    <dialog ref={dialog} className="sheet" aria-labelledby="capture-title" onClose={onClose} onCancel={onClose}>
      <form onSubmit={submit} noValidate>
        <header className="sheet-head">
          <h2 id="capture-title">Save something</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>

        {params.get('title') && <p className="hint">Shared title: {params.get('title')}</p>}
        {params.get('text') && <p className="hint">Shared text: {params.get('text')}</p>}
        <label className="field">
          <span>Link</span>
          <input
            className="input"
            type="url"
            aria-label="Link"
            inputMode="url"
            placeholder="https://www.instagram.com/reel/…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.field === 'url'}
            aria-describedby="cap-url-hint"
            autoFocus
          />
          <span id="cap-url-hint" className={error?.field === 'url' ? 'field-error' : 'hint'}>
            {error?.field === 'url' ? error.text : 'Instagram, YouTube or any page. The prototype keeps the link; it does not fetch it.'}
          </span>
        </label>

        <div className="field">
          <span className="label">Or upload a screenshot, image or video</span>
          {upload ? (
            <div className="cap-upload">
              <img src={upload.thumb} alt="Key frame of your upload" />
              <div>
                <p>
                  <b>{upload.fileName}</b>
                </p>
                <p className="hint">
                  {upload.local.width} x {upload.local.height}
                  {upload.durationSec ? `, ${Math.round(upload.durationSec)} s` : ''}. Only this small key frame is kept; the original file stays on your device.
                </p>
                <button type="button" className="link-btn" onClick={() => setUpload(null)}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy) void onFile(e.dataTransfer.files[0]); }} className={`cap-drop${busy ? ' is-busy' : ''}`}>
              <input type="file" className="sr-only" accept="image/*,video/*" onChange={(e) => void onFile(e.target.files?.[0])} disabled={busy} />
              <Icon name="upload" />
              <span>{busy ? 'Reading the file on this device' : 'Drop a screenshot or choose a file'}</span>
              <small>Up to {MAX_UPLOAD_MB} MB. Works when a link cannot be read.</small>
            </label>
          )}
          {error?.field === 'file' && <span className="field-error">{error.text}</span>}
        </div>

        <label className="field">
          <span>Why are you saving it? (optional)</span>
          <NoteInput value={note} onChange={setNote} lang={lang === 'hi' ? 'hi' : undefined} />
          <span className="hint">Stored exactly as you type it. Leave it empty and it stays empty.</span>
          <span className="hint">
            <button type="button" className="btn btn-small" onClick={speak} disabled={listening} aria-describedby="voice-note-hint">
              {listening ? 'Listening...' : 'Speak your reason'}
            </button>{' '}
            <span id="voice-note-hint" role="status">{voiceMsg || "Uses your browser speech recognition (Hindi or English). The text becomes your words."}</span>
          </span>
        </label>

        {settings.features.intentChips && (
          <fieldset className="cap-chips">
            <legend className="label">Or one tap</legend>
            <div>
              {INTENT_CHIPS.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={chip === c.id} onClick={() => setChip(chip === c.id ? null : c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            <span className="hint">Kept as your choice, apart from your words.</span>
          </fieldset>
        )}

        <div className="cap-row">
          <label className="field">
            <span>Note language</span>
            <select className="select" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          {settings.features.privateMemories && (
            <label className="check">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
              <span>
                <b>Private: keep AI off</b>
                <small>Only the link and your note are stored. Nothing is analysed.</small>
              </span>
            </label>
          )}
        </div>

        {error?.field === 'form' && (
          <p className="field-error" role="alert">
            {error.text}
          </p>
        )}

        <footer className="sheet-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}
