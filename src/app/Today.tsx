import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dueToday, resurface, weeklyRecap } from '../lib/resurface';
import { addOwnNote, doneResurface, setReminder, snoozeResurface, useStore } from '../store/store';
import type { Memory } from '../store/types';
import { NoteInput } from './NoteInput';

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, []);
  return now;
}

function AddWords({ memory }: { memory: Memory }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  return editing ? <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) addOwnNote(memory.id, note); }}>
    <label className="field"><span>Your exact words</span><NoteInput value={note} onChange={setNote} lang={memory.noteLanguage === 'hi' ? 'hi' : undefined} /></label>
    <button className="btn btn-small" disabled={!note.trim()}>Keep my words</button>{' '}
    <button type="button" className="btn btn-small btn-quiet" onClick={() => setEditing(false)}>Cancel</button>
  </form> : <button className="btn btn-small" onClick={() => setEditing(true)}>Add your words</button>;
}

export function Today() {
  const { memories, categories } = useStore();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const counts = new Map<string, number>();
  for (const memory of memories) {
    if (!memory.private && memory.categoryId) counts.set(memory.categoryId, (counts.get(memory.categoryId) ?? 0) + 1);
  }
  const browseCategories = categories.filter((category) => counts.has(category.id));
  const selected = browseCategories.find((category) => category.id === categoryId);
  const now = useNow();
  const picks = resurface(memories, now);
  const due = memories.filter((m) => dueToday(m.reminderAt, now));
  const arrived = memories.filter((m) => ['dm', 'share'].includes(m.source.channel) && Date.parse(m.createdAt) <= now.getTime() && now.getTime() - Date.parse(m.createdAt) <= 86_400_000);
  const needs = memories.filter((m) => !m.note?.trim());
  const recap = weeklyRecap(memories, now);
  const card = (m: Memory, content?: React.ReactNode) => <article className="index-card today-card" key={m.id}>
    <p className="hint">Saved {new Date(m.createdAt).toLocaleDateString('en-GB')}{m.sample && <span className="stamp">Sample</span>}{m.private && ' · Private'}</p>
    <h3><Link to={`/app/m/${m.id}`}>{m.title}</Link></h3>
    {m.note && <p className="today-note">{m.note}</p>}{m.extraNotes.map((note, index) => <p className="today-note" key={index}>{note.text}</p>)}
    {content}
  </article>;
  return <div className="today">
    <header className="page-top"><p className="label">A little space to remember</p><h1>Today</h1><p>Pick up a thought when it is useful to you.</p><Link className="btn btn-primary" to="/app/capture">Save something</Link></header>
    {browseCategories.length > 0 && <div className="today-filters" role="group" aria-label="Browse Today by category">
      <button className="btn btn-small" type="button" aria-pressed={!selected} onClick={() => setCategoryId(null)}>All activity</button>
      {browseCategories.map((category) => <button className="btn btn-small" key={category.id} type="button" aria-pressed={selected?.id === category.id} onClick={() => setCategoryId(category.id)}>
        {category.name} <span className="tnum">{counts.get(category.id)}</span>
      </button>)}
    </div>}
    {selected ? <section aria-labelledby="today-category-title">
      <h2 id="today-category-title">{selected.name}</h2>
      <div className="today-grid">{memories.filter((m) => !m.private && m.categoryId === selected.id).map((m) => card(m))}</div>
    </section> : <>
    {now.getDay() === 0 && <section className="index-card weekly"><h2>Weekly recap</h2><p>{recap.saved} saved this week · {recap.projects} projects touched</p><p className="hint">Your own saves, Monday to now. Sample saves are excluded.</p>{recap.picks.length > 0 && <><h3>Back to these</h3><ul>{recap.picks.map(({ memory, reasons }) => <li key={memory.id}><Link to={`/app/m/${memory.id}`}>{memory.title}</Link> — {reasons[0]}</li>)}</ul></>}</section>}
    {due.length > 0 && <section aria-labelledby="due-title"><h2 id="due-title">Due now</h2><div className="today-grid">{due.map((m) => card(m, <><p className="hint">Reminder: {new Date(m.reminderAt!).toLocaleString('en-GB')}</p><button className="btn btn-small" onClick={() => setReminder(m.id, null)}>Done with reminder</button></>))}</div></section>}
    {picks.length > 0 && <section aria-labelledby="back-title"><h2 id="back-title">Back to this</h2><div className="today-grid">{picks.map(({ memory: m, reasons }) => card(m, <>
      <p className="today-reason">{reasons[0]}</p>
      <details><summary>Why this came back</summary><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p className="hint">Daily selection from stored dates, projects, categories and pins. Earlier opens were not tracked before this update.</p></details>
      <Link className="today-ledger" to={`/app/m/${m.id}#ledger`}>What happened here · {m.ledger.at(-1)?.what ?? 'Saved on this device'} → Ledger</Link>
      <div className="today-actions"><button className="btn btn-small btn-quiet" onClick={() => snoozeResurface(m.id)}>Not now</button><button className="btn btn-small" onClick={() => doneResurface(m.id)}>Done</button></div>
    </>))}</div></section>}
    {arrived.length > 0 && <section aria-labelledby="arrived-title"><h2 id="arrived-title">Just arrived</h2><div className="today-grid">{arrived.map((m) => card(m, <p className="hint">From {m.source.channel === 'dm' ? 'Instagram DM' : 'the share sheet'}{!m.note && ' · No note added'}</p>))}</div></section>}
    {needs.length > 0 && <section aria-labelledby="words-title"><h2 id="words-title">Needs your words</h2><div className="today-grid">{needs.map((m) => card(m, <AddWords memory={m} />))}</div></section>}
    {!due.length && !picks.length && !arrived.length && !needs.length && <p className="index-card weekly">Nothing needs your attention today; save a thought whenever one comes along.</p>}
    </>}
  </div>;
}
