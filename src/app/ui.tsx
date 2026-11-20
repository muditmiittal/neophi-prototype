// Shared pieces of the app: toast, memory card, draft view, two-step confirm.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { STATE_COPY } from '../components/Lanes';
import { Scene } from '../components/Scene';
import { download } from '../lib/exporting';
import { draftToMarkdown, type Draft } from '../lib/outcomes';
import { morphTo } from '../lib/morph';
import { fmtDate, reasonOf } from '../lib/reason';
import { analyseMemory, moveMemory } from '../store/store';
import type { Category, Memory, Project } from '../store/types';

export const ToastContext = createContext<(text: string) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export const PLATFORM_LABEL = { instagram: 'Instagram', youtube: 'YouTube', web: 'Web page', upload: 'Your upload' } as const;

export function ReasonLine({ m, projects }: { m: Memory; projects: Project[] }) {
  const reason = reasonOf({ ...m, projectNames: m.projectIds.map((p) => projects.find((x) => x.id === p)?.name ?? '').filter(Boolean) });
  const deva = /[ऀ-ॿ]/.test(reason.text);
  if (reason.rung === 'said')
    return (
      <p className={`reason reason-said${deva ? ' deva' : ''}`} title="You said it">
        <Icon name="pen" label="You said:" /> {reason.text}
      </p>
    );
  if (reason.rung === 'chose')
    return (
      <p className="reason reason-chose" title="You chose it">
        <Icon name="check" label="You chose:" /> {reason.text}
      </p>
    );
  if (reason.rung === 'inferred')
    return (
      <p className="reason reason-ai" title="AI inferred it">
        <Icon name="spark" label="AI suggestion:" /> {reason.text}
      </p>
    );
  return (
    <p className="reason reason-unknown" title="Unknown">
      <Icon name="question" /> {m.private ? 'Private. AI is off.' : 'No reason recorded'}
    </p>
  );
}

export function Thumb({ m }: { m: Memory }) {
  if (m.thumb) return <img className="thumb" src={m.thumb} alt="" loading="lazy" />;
  if (m.sceneId && m.sceneId !== 'none') return <Scene id={m.sceneId} />;
  return (
    <span className="thumb thumb-gone">
      <Icon name={m.private ? 'lock' : m.sourceNow === 'unsupported' ? 'link' : 'offline'} />
      <span className="stamp stamp-warn">{m.private ? 'Private' : STATE_COPY[m.sourceNow].stamp}</span>
    </span>
  );
}

export function MemoryCard({ m, categories, projects, view }: { m: Memory; categories: Category[]; projects: Project[]; view: 'grid' | 'list' }) {
  const cat = categories.find((c) => c.id === m.categoryId);
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <article
      className={`mcard mcard-${view}${m.status !== 'ready' ? ' is-busy' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/neophi-memory', m.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <Link to={`/app/m/${m.id}`} className="mcard-pic polaroid" aria-label={`Open ${m.title}`} onClick={(e) => morphTo(e, navigate, `/app/m/${m.id}`)}>
        <Thumb m={m} />
        {m.mediaKind === 'video' && (m.thumb || (m.sceneId && m.sceneId !== 'none')) && (
          <span className="mcard-play" aria-hidden="true">
            <Icon name="play" />
          </span>
        )}
      </Link>
      <div className="mcard-body">
        <h3>
          <Link to={`/app/m/${m.id}`}>{m.title}</Link>
        </h3>
        {m.status === 'analysing' ? (
          <p className="reason reason-unknown" role="status">
            <span className="analysing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Analysing
          </p>
        ) : m.status === 'error' ? (
          <p className="reason reason-unknown">
            Analysis did not finish. Your save is kept.{' '}
            <button type="button" className="link-btn" onClick={() => void analyseMemory(m.id)}>
              Try again
            </button>
          </p>
        ) : (
          <ReasonLine m={m} projects={projects} />
        )}
        <p className="mcard-meta">
          <span className="mcard-cat">{m.private ? 'Private' : (cat?.name ?? 'Not sure yet')}</span>
          <span>{fmtDate(m.createdAt)}</span>
          <span>{PLATFORM_LABEL[m.source.platform]}</span>
          {m.sample && <span className="stamp">Sample</span>}
          {!m.private && m.sourceNow !== 'available' && m.sourceNow !== 'user_provided' && m.sourceNow !== 'unsupported' && <span className="stamp stamp-warn">{STATE_COPY[m.sourceNow].stamp}</span>}
        </p>
        {!m.private && (
          <label className="mcard-move">
            <span className="sr-only">Move {m.title} to a category</span>
            <select
              value={m.categoryId ?? ''}
              onChange={(e) => {
                const to = e.target.value || null;
                moveMemory(m.id, to);
                toast(`Moved to ${to ? (categories.find((c) => c.id === to)?.name ?? 'the category') : 'Not sure yet'}. Open the memory's ledger to undo.`);
              }}
            >
              <option value="">Move to: Not sure yet</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  Move to: {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}

export function DraftView({ draft, mock, onClose }: { draft: Draft; mock?: boolean; onClose?: () => void }) {
  const toast = useToast();
  const md = draftToMarkdown(draft);
  return (
    <section className="draft index-card" aria-label={draft.title}>
      <header>
        <h3>{draft.title}</h3>
        <span className="stamp stamp-teal">{mock ? 'Draft from sample data' : 'Draft'}</span>
      </header>
      <p className="hint">Assembled from text already stored on your memories. Each line says where it comes from. Nothing was looked up or made up.</p>
      {draft.sections.map((s) => (
        <div key={s.heading} className="draft-sec">
          <h4>{s.heading}</h4>
          <ul>
            {s.lines.map((l, i) => (
              <li key={i}>
                <span>{l.text}</span>
                <small>
                  {l.from}
                  {l.memoryId && (
                    <>
                      {' '}
                      <Link to={`/app/m/${l.memoryId}`}>open</Link>
                    </>
                  )}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {draft.gaps.length > 0 && (
        <div className="draft-sec draft-gaps">
          <h4>Not known</h4>
          <ul>
            {draft.gaps.map((g) => (
              <li key={g}>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="draft-actions">
        <button
          type="button"
          className="btn btn-small btn-quiet"
          onClick={() => {
            navigator.clipboard?.writeText(md).then(
              () => toast('Copied as Markdown.'),
              () => toast('Copy was blocked by the browser. Use Download instead.'),
            );
          }}
        >
          Copy as Markdown
        </button>
        <button type="button" className="btn btn-small btn-quiet" onClick={() => download(`${draft.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`, md, 'text/markdown')}>
          <Icon name="download" /> Download
        </button>
        {onClose && (
          <button type="button" className="btn btn-small btn-quiet" onClick={onClose}>
            Close
          </button>
        )}
      </p>
    </section>
  );
}

export function ConfirmButton({ label, confirm, onConfirm, icon }: { label: string; confirm: string; onConfirm: () => void; icon?: ReactNode }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="btn btn-small btn-danger" onClick={() => setAsking(true)}>
        {icon}
        {label}
      </button>
    );
  return (
    <span className="confirm" role="alertdialog" aria-label={confirm}>
      <span>{confirm}</span>
      <button type="button" className="btn btn-small btn-danger" onClick={onConfirm} autoFocus>
        Yes, delete
      </button>
      <button type="button" className="btn btn-small btn-quiet" onClick={() => setAsking(false)}>
        Keep
      </button>
    </span>
  );
}

export function EmptyState({ title, children, icon = 'folder' }: { title: string; children: ReactNode; icon?: 'folder' | 'search' | 'offline' | 'question' }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
