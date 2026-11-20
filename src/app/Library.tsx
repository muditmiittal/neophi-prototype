import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { resurface as dailyResurface } from '../lib/resurface';
import { insights } from '../lib/extras';
import { fmtDate } from '../lib/reason';
import { acceptCategory, addCategory, mergeCategory, moveMemory, pinCategory, projectFromCategory, renameCategory, seedSamples, updateSettings, useStore } from '../store/store';
import { UNSORTED, type Memory, type Platform } from '../store/types';
import { CaptureSheet } from './CaptureSheet';
import { EmptyState, MemoryCard, ReasonLine, useToast } from './ui';

type DateFilter = 'any' | '7' | '30' | 'older';
const PRIVATE = 'private';

export function Library({ capture }: { capture: boolean }) {
  const state = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [dropOn, setDropOn] = useState<string | null>(null);
  const drop = (categoryId: string, name: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropOn(null);
    const id = e.dataTransfer.getData('text/neophi-memory');
    if (!id) return;
    moveMemory(id, categoryId);
    toast(`Moved to ${name}. Open the memory's ledger to undo.`);
  };
  const dragOver = (key: string) => (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('text/neophi-memory')) return;
    e.preventDefault();
    setDropOn(key);
  };
  const { memories, categories, projects, settings } = state;
  const [sel, setSel] = useState<string>('all');
  const [source, setSource] = useState<Platform | 'all'>('all');
  const [date, setDate] = useState<DateFilter>('any');
  const [hasNote, setHasNote] = useState(false);
  const [resurfaced, setResurfaced] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newCat, setNewCat] = useState('');

  const orderedCats = useMemo(() => [...categories].sort((a, b) => Number(b.pinned) - Number(a.pinned)), [categories]);
  const count = (id: string) => memories.filter((m) => !m.private && m.categoryId === id).length;
  const unsorted = memories.filter((m) => !m.private && !m.categoryId);
  const privates = memories.filter((m) => m.private);
  const current = categories.find((c) => c.id === sel);
  if (sel !== 'all' && sel !== UNSORTED && sel !== PRIVATE && !current) setSel('all');

  const shown = useMemo(() => {
    const now = Date.now();
    return memories
      .filter((m) => {
        if (sel === PRIVATE) return m.private;
        if (sel === UNSORTED) return !m.private && !m.categoryId;
        if (sel !== 'all') return !m.private && m.categoryId === sel;
        return true;
      })
      .filter((m) => source === 'all' || m.source.platform === source)
      .filter((m) => !hasNote || Boolean(m.note))
      .filter((m) => {
        const age = (now - new Date(m.createdAt).getTime()) / 86_400_000;
        return date === 'any' || (date === '7' && age <= 7) || (date === '30' && age <= 30) || (date === 'older' && age > 30);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [memories, sel, source, date, hasNote]);

  const filtersOn = source !== 'all' || date !== 'any' || hasNote;
  const clearFilters = () => {
    setSource('all');
    setDate('any');
    setHasNote(false);
  };

  const resurface = () => {
    const pool = dailyResurface(memories, new Date()).filter(({ memory }) => memory.id !== resurfaced);
    if (!pool.length) return toast('No saves qualify for resurfacing today. Your library is still available.');
    setResurfaced(pool[0].memory.id);
  };
  const back: Memory | undefined = memories.find((m) => m.id === resurfaced);
  const patterns = settings.features.insights ? insights(memories, categories, projects) : [];

  return (
    <div className="lib">
      <aside className="lib-side" aria-label="Categories">
        <h2 className="lib-side-title">Your categories</h2>
        <ul className="tabs">
          <li>
            <button type="button" className="tab" aria-pressed={sel === 'all'} onClick={() => setSel('all')}>
              <span>All saves</span>
              <span className="tnum">{memories.length}</span>
            </button>
          </li>
          {orderedCats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`tab${dropOn === c.id ? ' is-drop' : ''}`}
                aria-pressed={sel === c.id}
                onClick={() => setSel(c.id)}
                onDragOver={dragOver(c.id)}
                onDragLeave={() => setDropOn(null)}
                onDrop={drop(c.id, c.name)}
              >
                <span>
                  {c.pinned && <Icon name="pin" label="Pinned" />} {c.name}
                </span>
                <span className="tnum">{count(c.id)}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="tab tab-unsure" aria-pressed={sel === UNSORTED} onClick={() => setSel(UNSORTED)}>
              <span>Not sure yet</span>
              <span className="tnum">{unsorted.length}</span>
            </button>
          </li>
          {settings.features.privateMemories && privates.length > 0 && (
            <li>
              <button type="button" className="tab tab-unsure" aria-pressed={sel === PRIVATE} onClick={() => setSel(PRIVATE)}>
                <span>
                  <Icon name="lock" /> Private
                </span>
                <span className="tnum">{privates.length}</span>
              </button>
            </li>
          )}
        </ul>
        <form
          className="lib-newcat"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newCat.trim()) return;
            setSel(addCategory(newCat));
            setNewCat('');
          }}
        >
          <input className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" aria-label="Name for a new category" maxLength={40} />
          <button className="btn btn-small btn-quiet" type="submit" aria-label="Add category">
            <Icon name="plus" />
          </button>
        </form>

        {patterns.length > 0 && (
          <section className="insights" aria-labelledby="insights-title">
            <h2 id="insights-title" className="lib-side-title">
              Patterns in what you save
            </h2>
            <ul>
              {patterns.map((p) => (
                <li key={p.text} className={p.kind === 'ai' ? 'is-ai' : undefined}>
                  <span className={`stamp${p.kind === 'ai' ? ' stamp-teal' : ''}`}>{p.kind === 'ai' ? 'AI suggestion' : 'Counted'}</span>
                  {p.text}
                </li>
              ))}
            </ul>
            {memories.some((m) => m.sample) && <p className="hint">Includes sample saves, so these describe the demo data, not you.</p>}
          </section>
        )}
      </aside>

      <section className="lib-main" aria-label="Saves">
        {current && (
          <div className="cat-panel index-card">
            {renaming === current.id ? (
              <form
                className="cat-rename"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = String(new FormData(e.currentTarget).get('name') ?? '');
                  renameCategory(current.id, name);
                  setRenaming(null);
                }}
              >
                <input className="input" name="name" defaultValue={current.name} aria-label="Category name" autoFocus maxLength={40} />
                <button className="btn btn-small" type="submit">
                  Save name
                </button>
                <button className="btn btn-small btn-quiet" type="button" onClick={() => setRenaming(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <h2>{current.name}</h2>
            )}
            <p className="cat-why">
              <b>Why this category:</b> {current.why}{' '}
              <span className={`stamp${current.origin === 'auto' && !current.accepted ? ' stamp-teal' : ''}`}>{current.origin === 'auto' && !current.accepted ? 'Suggested by AI' : 'Yours'}</span>
            </p>
            <div className="cat-actions">
              {current.origin === 'auto' && !current.accepted && (
                <button type="button" className="btn btn-small" onClick={() => acceptCategory(current.id)}>
                  <Icon name="check" /> Looks right
                </button>
              )}
              <button type="button" className="btn btn-small btn-quiet" onClick={() => setRenaming(current.id)}>
                <Icon name="pen" /> Rename
              </button>
              <button type="button" className="btn btn-small btn-quiet" aria-pressed={current.pinned} onClick={() => pinCategory(current.id)}>
                <Icon name="pin" /> {current.pinned ? 'Unpin' : 'Pin to top'}
              </button>
              {categories.length > 1 && (
                <label className="cat-merge">
                  <Icon name="merge" />
                  <span className="sr-only">Merge this category into</span>
                  <select
                    className="select"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const into = categories.find((c) => c.id === e.target.value)!;
                      mergeCategory(current.id, into.id);
                      setSel(into.id);
                      toast(`Merged into ${into.name}.`);
                    }}
                  >
                    <option value="">Merge into…</option>
                    {categories
                      .filter((c) => c.id !== current.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {settings.features.projects && (
                <label className="cat-merge">
                  <Icon name="flag" />
                  <span className="sr-only">Turn this category into a project</span>
                  <select
                    className="select"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      navigate(`/app/projects/${projectFromCategory(current.id, e.target.value as 'itinerary' | 'content_brief')}`);
                    }}
                  >
                    <option value="">Make it a project…</option>
                    <option value="itinerary">with an itinerary</option>
                    <option value="content_brief">with a content brief</option>
                  </select>
                </label>
              )}
            </div>
          </div>
        )}
        {sel === UNSORTED && (
          <div className="cat-panel index-card">
            <h2>Not sure yet</h2>
            <p className="cat-why">Saves with too little to go on. Neophi leaves them here instead of forcing a category. Open one and move it by hand, or add a note.</p>
          </div>
        )}
        {sel === PRIVATE && (
          <div className="cat-panel index-card">
            <h2>Private</h2>
            <p className="cat-why">Link and note only. These are never analysed, never sorted by AI and never counted in patterns.</p>
          </div>
        )}

        <div className="lib-tools">
          <label className="field-inline">
            <span>Source</span>
            <select className="select" value={source} onChange={(e) => setSource(e.target.value as Platform | 'all')}>
              <option value="all">All sources</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="web">Web pages</option>
              <option value="upload">My uploads</option>
            </select>
          </label>
          <label className="field-inline">
            <span>Saved</span>
            <select className="select" value={date} onChange={(e) => setDate(e.target.value as DateFilter)}>
              <option value="any">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="older">Older than 30 days</option>
            </select>
          </label>
          <button type="button" className="chip" aria-pressed={hasNote} onClick={() => setHasNote((v) => !v)}>
            <Icon name="pen" /> Has my note
          </button>
          <span className="lib-tools-end">
            {settings.features.resurface && (
              <button type="button" className="btn btn-small btn-quiet" onClick={resurface}>
                <Icon name="shuffle" /> Resurface one
              </button>
            )}
            <span className="seg" role="group" aria-label="View">
              <button type="button" aria-pressed={settings.view === 'grid'} onClick={() => updateSettings({ view: 'grid' })} aria-label="Grid view">
                <Icon name="grid" />
              </button>
              <button type="button" aria-pressed={settings.view === 'list'} onClick={() => updateSettings({ view: 'list' })} aria-label="List view">
                <Icon name="list" />
              </button>
            </span>
          </span>
        </div>

        {back && (
          <div className="resurface index-card" role="status">
            <div>
              <p className="hint">Remember this? You saved it on {fmtDate(back.createdAt)}.</p>
              <h3>
                <Link to={`/app/m/${back.id}`}>{back.title}</Link>
              </h3>
              <ReasonLine m={back} projects={projects} />
            </div>
            <p className="resurface-actions">
              <Link className="btn btn-small" to={`/app/m/${back.id}`}>
                Open
              </Link>
              <button type="button" className="btn btn-small btn-quiet" onClick={resurface}>
                Another
              </button>
              <button type="button" className="btn btn-small btn-quiet" onClick={() => setResurfaced(null)} aria-label="Dismiss">
                <Icon name="x" />
              </button>
            </p>
          </div>
        )}

        {memories.length === 0 ? (
          <EmptyState title="Your library is empty">
            <p>Save a link or upload a screenshot, and say why if you like. Neophi does the sorting.</p>
            <p className="empty-actions">
              <Link className="btn btn-primary" to="/app/capture">
                <Icon name="plus" /> Save your first one
              </Link>
              <button type="button" className="btn" onClick={() => seedSamples('all')}>
                Load the sample library
              </button>
            </p>
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState title={filtersOn ? 'Nothing matches these filters' : 'No saves in this category yet'} icon="search">
            <p>{filtersOn ? 'Try fewer filters, or look in all saves.' : 'Saves will appear here when they are sorted into this category.'}</p>
            {filtersOn && (
              <button type="button" className="btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <p className="lib-count hint" role="status">
              {shown.length} {shown.length === 1 ? 'save' : 'saves'}
              {filtersOn && (
                <>
                  {' '}
                  with these filters.{' '}
                  <button type="button" className="link-btn" onClick={clearFilters}>
                    Clear
                  </button>
                </>
              )}
            </p>
            <div className={`mgrid mgrid-${settings.view}`}>
              {shown.map((m) => (
                <MemoryCard key={m.id} m={m} categories={categories} projects={projects} view={settings.view} />
              ))}
            </div>
            {memories.length < 6 && (
              <p className="lib-more hint">
                Want to see sorting and search with more in it?{' '}
                <button type="button" className="link-btn" onClick={() => seedSamples('all')}>
                  Load the full sample library
                </button>
              </p>
            )}
          </>
        )}
      </section>

      {capture && <CaptureSheet onClose={() => navigate('/app/library')} />}
    </div>
  );
}
