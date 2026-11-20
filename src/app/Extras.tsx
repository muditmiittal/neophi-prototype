// Two owner picks: Google bridges (S15) and the Instagram DM capture stub (C7).
// Neither connects to an account. What works, works through files and plain links, and says so.

import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { download } from '../lib/exporting';
import { parseInstagramWebhook, SAMPLE_DM_PAYLOADS } from '../lib/metaCapture';
import { capture, useStore } from '../store/store';
import { useToast } from './ui';

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export function Bridges() {
  const { memories } = useStore();
  const toast = useToast();
  const reminders = memories.filter((m) => m.reminderAt);
  const places = [
    ...new Set(
      memories
        .filter((m) => !m.private)
        .flatMap((m) => m.analysis?.actionable_entities.filter((e) => e.type === 'place' && !e.uncertain && !/\(.*not (shown|given).*\)/.test(e.name)).map((e) => e.name) ?? []),
    ),
  ];

  const calendar = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Neophi prototype//EN'];
    for (const m of reminders) {
      const start = new Date(m.reminderAt!);
      lines.push('BEGIN:VEVENT', `UID:${m.id}@neophi.prototype`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(new Date(start.getTime() + 15 * 60_000))}`, `SUMMARY:${icsText(`Neophi: ${m.title}`)}`, `DESCRIPTION:${icsText([m.note ? `Your note: ${m.note}` : '', m.source.url ?? ''].filter(Boolean).join('\n'))}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    download('neophi-reminders.ics', lines.join('\r\n'), 'text/calendar');
  };

  const tasks = () => {
    const text = reminders.map((m) => `[ ] ${m.title}${m.note ? `: ${m.note}` : ''} (${new Date(m.reminderAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`).join('\n');
    navigator.clipboard?.writeText(text).then(
      () => toast('Checklist copied. Paste it into Google Tasks or Keep.'),
      () => toast('Copy was blocked by the browser.'),
    );
  };

  return (
    <section className="set-sec" aria-labelledby="set-google">
      <h2 id="set-google">
        Google bridges <span className="stamp">No account connected</span>
      </h2>
      <p>The plan is to connect Calendar, Maps and Tasks with your permission. The prototype connects to nothing: these three work through a file, plain links and the clipboard.</p>
      <ul className="bridges">
        <li>
          <div>
            <b>Calendar</b>
            <small>
              {reminders.length} reminder{reminders.length === 1 ? '' : 's'} set. Downloads a standard calendar file you can import into Google Calendar.
            </small>
          </div>
          <button type="button" className="btn btn-small" onClick={calendar} disabled={reminders.length === 0}>
            <Icon name="download" /> Calendar file
          </button>
        </li>
        <li>
          <div>
            <b>Maps</b>
            <small>{places.length ? 'Place names found in captions. Each opens a Google Maps search in a new tab; nothing is looked up by Neophi.' : 'No named places in your saves yet.'}</small>
            {places.length > 0 && (
              <span className="bridge-places">
                {places.map((p) => (
                  <a key={p} className="chip" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p)}`} target="_blank" rel="noreferrer noopener">
                    {p}
                  </a>
                ))}
              </span>
            )}
          </div>
        </li>
        <li>
          <div>
            <b>Tasks</b>
            <small>Copies your reminders as a checklist to paste into Google Tasks or Keep.</small>
          </div>
          <button type="button" className="btn btn-small" onClick={tasks} disabled={reminders.length === 0}>
            Copy checklist
          </button>
        </li>
        <li>
          <div>
            <b>Sign in with Google</b>
            <small>Not built. The prototype has one demo account and no sign-in of any kind.</small>
          </div>
          <button type="button" className="btn btn-small" disabled>
            Not available
          </button>
        </li>
      </ul>
    </section>
  );
}

export function DmReplay() {
  const { settings } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const replay = (body: unknown) => {
    const events = parseInstagramWebhook(body);
    if (!events.length) return toast('The replay contained no supported share. Nothing was added to your library.');
    let last = '';
    for (const e of events) {
      const r = capture({
        note: e.note ?? '',
        noteLanguage: settings.noteLanguage,
        chosenIntent: null,
        isPrivate: false,
        dm: { mid: e.mid, kind: e.kind, caption: e.title, hasMediaLink: Boolean(e.mediaUrl) },
      });
      last = r.id;
      toast(r.duplicate ? 'That message was already saved once. No copy was made.' : 'Saved from the replayed DM. Analysing now.');
    }
    navigate(`/app/m/${last}`);
  };
  return (
    <div className="dm-replay">
      <h3>
        Instagram DM capture <span className="stamp">Invented replay</span>
      </h3>
      <p className="hint">
        These buttons replay invented payloads through capture without contacting Meta. Replay media links are never fetched. Real DM pickup is a separate local-server flow for app-role testers in Meta development mode; see the Connect page.
      </p>
      <div className="set-row">
        {SAMPLE_DM_PAYLOADS.map((p) => (
          <button key={p.name} type="button" className="btn btn-small btn-quiet" onClick={() => replay(p.body)}>
            <Icon name="play" /> Replay: {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
