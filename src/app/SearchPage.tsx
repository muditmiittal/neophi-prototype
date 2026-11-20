import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProvider } from '../ai/provider';
import { cosine } from '../ai/text';
import { Icon } from '../components/Icon';
import { memoryText } from '../lib/categorise';
import { fmtDate } from '../lib/reason';
import { parseQuery, search, type MatchLane } from '../lib/search';
import { useStore } from '../store/store';
import { EmptyState, Thumb } from './ui';

const EXAMPLES = ['red shirt dance last month', 'laal shirt wala dance, pichle mahine', 'kasuri methi', 'subah wala rasta goa', 'बालकनी shelf', 'caption for cafe launch'];

const LANE_CLASS: Record<MatchLane, string> = {
  'Your words': 'you',
  'You chose': 'you',
  'Source shows': 'source',
  'AI suggestion': 'ai',
  'Close in meaning': 'ai',
  When: 'when',
  Category: 'when',
};

// Embeddings from the Gemini server, cached for the session only.
const vectors = new Map<string, number[]>();

export function SearchPage() {
  const { memories, categories, settings } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [text, setText] = useState(q);
  const [semantic, setSemantic] = useState<Map<string, number> | undefined>();
  const [semanticNote, setSemanticNote] = useState('');

  useEffect(() => setText(q), [q]);

  useEffect(() => {
    let cancelled = false;
    setSemantic(undefined);
    setSemanticNote('');
    if (settings.provider !== 'gemini' || !q.trim()) return;
    const provider = getProvider('gemini');
    (async () => {
      try {
        const qv = await provider.embed(q);
        const scores = new Map<string, number>();
        for (const m of memories.filter((x) => !x.private)) {
          const key = `${m.id}:${m.analysedAt ?? ''}`;
          let v = vectors.get(key);
          if (!v) vectors.set(key, (v = await provider.embed(memoryText(m))));
          scores.set(m.id, cosine(qv, v));
        }
        if (!cancelled) {
          setSemantic(scores);
          setSemanticNote(`Meaning-based ranking from the Gemini server is on (${qv.length} dimensions).`);
        }
      } catch {
        if (!cancelled) setSemanticNote('The Gemini server did not answer, so this search used word matching only.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, settings.provider, memories]);

  const results = useMemo(() => search(q, memories, categories, new Date(), semantic), [q, memories, categories, semantic]);
  const parsed = useMemo(() => parseQuery(q), [q]);

  return (
    <div className="search">
      <h1>Find it half remembered</h1>
      <form
        className="search-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParams(text.trim() ? { q: text.trim() } : {});
        }}
      >
        <Icon name="search" />
        <input className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what you remember, in any mix of English and Hindi" aria-label="What do you remember?" autoFocus />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>
      <p className="search-examples">
        <span className="hint">Try</span>
        {EXAMPLES.map((e) => (
          <button key={e} type="button" className="chip" onClick={() => setParams({ q: e })}>
            {e}
          </button>
        ))}
      </p>

      {!q.trim() ? (
        <EmptyState title="Describe it the way you remember it" icon="search">
          <p>A colour, a word from your note, roughly when. Neophi looks in your words first, then in what the source shows, then in its own suggestions, and tells you which one matched.</p>
        </EmptyState>
      ) : results.length === 0 ? (
        <EmptyState title="Nothing matched" icon="search">
          <p>
            Neophi looked for {parsed.terms.length ? parsed.terms.map((t) => `"${t}"`).join(', ') : 'any save'}
            {parsed.time ? ` saved ${parsed.time.label}` : ''} in your notes, the captions, what each source shows and the AI suggestions. Private memories are matched on your note only.
          </p>
          <p>Try fewer words, or a word you might have typed in your note.</p>
        </EmptyState>
      ) : (
        <>
          <p className="hint" role="status">
            {results.length} {results.length === 1 ? 'result' : 'results'}. Understood as: {parsed.terms.map((t) => `"${t}"`).join(', ') || 'any save'}
            {parsed.time ? `, saved ${parsed.time.label}` : ''}. {semanticNote || 'Word matching in this browser; no model was called.'}
          </p>
          <ol className="results">
            {results.map(({ memory: m, reasons }) => (
              <li key={m.id} className="result index-card">
                <Link to={`/app/m/${m.id}`} className="result-pic polaroid" aria-hidden="true" tabIndex={-1}>
                  <Thumb m={m} />
                </Link>
                <div>
                  <h2>
                    <Link to={`/app/m/${m.id}`}>{m.title}</Link>
                  </h2>
                  <p className="mcard-meta">
                    <span>{fmtDate(m.createdAt)}</span>
                    <span>{categories.find((c) => c.id === m.categoryId)?.name ?? (m.private ? 'Private' : 'Not sure yet')}</span>
                    {m.sample && <span className="stamp">Sample</span>}
                  </p>
                  <div className="result-why">
                    <h3>Why this matched</h3>
                    <ul>
                      {reasons.map((r, i) => (
                        <li key={i} className={`match match-${LANE_CLASS[r.lane]}`}>
                          <b>{r.lane}</b>
                          <span>{r.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
