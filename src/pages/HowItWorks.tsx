import { Link } from 'react-router-dom';
import { PageIntro } from '../components/Immersive';

type Status = 'real' | 'mock' | 'plan';
const LABEL: Record<Status, string> = { real: 'Works in the prototype', mock: 'Works with sample or mock data', plan: 'Planned, not built' };

const LOOP: { title: string; body: string; status: Status; note: string }[] = [
  {
    title: 'Capture',
    body: 'Paste a link or upload an image or a video. The same link saved twice becomes one memory with both notes.',
    status: 'real',
    note: 'Links are kept, not fetched: the prototype has no server that reads other sites. Instagram DM capture is limited to app-role testers in Meta development mode, with collection on the local demo device. Media downloads can fail.',
  },
  {
    title: 'Say why',
    body: 'A few words in English, Hindi or Hinglish, one tap on a chip such as Buy or Go there, or nothing at all.',
    status: 'real',
    note: 'Your note is stored exactly as typed. A chip is stored as your choice, apart from your words.',
  },
  {
    title: 'Understand, with evidence',
    body: 'Neophi describes what the source shows and ties your note to a frame, a second or a quote. If it cannot, it says "not sure".',
    status: 'mock',
    note: 'Sample saves use a prepared analysis. For your own uploads the mock provider measures colours on your device; real understanding needs the optional Gemini server.',
  },
  {
    title: 'Place',
    body: 'Categories are built from your notes and saves, each with a line on why it exists. A category can become a project with a goal.',
    status: 'real',
    note: 'Sorting uses simple word matching in the prototype. Rename, merge, pin and move by hand all work.',
  },
  {
    title: 'Find',
    body: 'Search the way you remember it: "red shirt dance last month", or "laal shirt wala dance, pichle mahine". Every result says why it matched.',
    status: 'real',
    note: 'Matching runs in your browser with a small word list for Hindi and Hinglish. Meaning-based search with Gemini Embedding 2 is wired to the optional server.',
  },
  {
    title: 'Use',
    body: 'Turn a memory into a content brief, a list of steps or a reminder. Turn a project into an itinerary or a brief.',
    status: 'mock',
    note: 'Outcomes are assembled from the text already stored on your memories and are marked as drafts.',
  },
  {
    title: 'Trust',
    body: 'A ledger on every memory lists what is stored, what AI added and when, with undo. Private memories are never analysed. Export and delete are always there.',
    status: 'real',
    note: 'Your library is in this browser. There is no account. DM capture temporarily queues messages on the server; see Privacy for retention.',
  },
];

export function HowItWorks() {
  return (
    <div className="page wrap">
      <PageIntro video="loop_today">
        <h1>How it works</h1>
        <p>One loop, seven steps. Each step says plainly whether it runs today, runs on sample data, or is still a plan.</p>
      </PageIntro>

      <div className="rule-list">
        {LOOP.map((s) => (
          <section className="rule-item" key={s.title}>
            <div>
              <h2>{s.title}</h2>
              <span className={`status status-${s.status}`}>{LABEL[s.status]}</span>
            </div>
            <div>
              <p style={{ color: 'var(--ink)', fontSize: '1.08rem' }}>{s.body}</p>
              <p>{s.note}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="prose" style={{ marginTop: 40 }}>
        <h2>Where Google AI fits</h2>
        <p>
          The optional server uses a configured Gemini analysis model for accessible media and an embedding model for meaning-based search. Your note stays in its own field. Model output is checked before storage.
        </p>
        <p>
          In this prototype that path is an optional local server. It reads the key from its own environment and stays off unless you start it. Whichever provider
          answers, the same code checks the output before anything is stored. See <Link to="/trust">Trust</Link> for the rules.
        </p>
        <h2>What is not here yet</h2>
        <ul>
          <li>Sign-in and sync. The prototype uses one demo account, in this browser.</li>
          <li>Public Instagram DM access. The current flow is for app-role testers in Meta development mode; media downloads can fail.</li>
          <li>Prices. Plans come after we measure what a save costs to process.</li>
        </ul>
      </div>
    </div>
  );
}
