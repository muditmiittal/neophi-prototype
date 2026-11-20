import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { itinerary, projectBrief, type Draft } from '../lib/outcomes';
import { deleteProject, toggleProject, updateProject, useStore } from '../store/store';
import { ConfirmButton, DraftView, EmptyState, MemoryCard, useToast } from './ui';

const OUTCOME = { itinerary: 'Itinerary', content_brief: 'Content brief' } as const;

export function Projects() {
  const { projects, memories } = useStore();
  return (
    <div className="projects">
      <header className="page-top">
        <h1>Projects</h1>
        <p>A category is a topic. A project is a goal: the saves attach to something you want to finish, and Neophi drafts the finished thing from them.</p>
      </header>
      {projects.length === 0 ? (
        <EmptyState title="No projects yet" icon="folder">
          <p>Open a category in the library and choose "Make it a project", or load the sample library to see two.</p>
          <Link className="btn" to="/app/library">
            Go to the library
          </Link>
        </EmptyState>
      ) : (
        <ul className="project-list">
          {projects.map((p) => {
            const mine = memories.filter((m) => m.projectIds.includes(p.id));
            return (
              <li key={p.id} className="index-card project-card">
                <h2>
                  <Link to={`/app/projects/${p.id}`}>{p.name}</Link>
                </h2>
                {p.goal && <p>{p.goal}</p>}
                <p className="mcard-meta">
                  <span>
                    {mine.length} {mine.length === 1 ? 'save' : 'saves'}
                  </span>
                  <span>Builds: {OUTCOME[p.outcome]}</span>
                  {p.sample && <span className="stamp">Sample</span>}
                </p>
                <Link className="btn btn-small" to={`/app/projects/${p.id}`}>
                  Open <Icon name="arrow" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const state = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const p = state.projects.find((x) => x.id === id);
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!p)
    return (
      <EmptyState title="This project is not here" icon="question">
        <Link className="btn" to="/app/projects">
          All projects
        </Link>
      </EmptyState>
    );
  const mine = state.memories.filter((m) => m.projectIds.includes(p.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const build = () => setDraft(p.outcome === 'itinerary' ? itinerary(p.name, mine) : projectBrief(p.name, mine));

  return (
    <div className="projects">
      <p className="detail-back">
        <Link to="/app/projects">
          <Icon name="back" /> Projects
        </Link>
      </p>
      <header className="page-top">
        <h1>
          {p.name} {p.sample && <span className="stamp">Sample</span>}
        </h1>
        <label className="field">
          <span>Goal, in your words</span>
          <input className="input" value={p.goal} onChange={(e) => updateProject(p.id, { goal: e.target.value })} placeholder="What do you want to end up with?" maxLength={160} />
        </label>
      </header>

      <div className="project-grid">
        <section aria-labelledby="proj-saves">
          <h2 id="proj-saves">
            {mine.length} {mine.length === 1 ? 'save' : 'saves'} in this project
          </h2>
          {mine.length === 0 ? (
            <p className="hint">Open a memory and tap this project under "Where it lives" to add it.</p>
          ) : (
            <div className="mgrid mgrid-list">
              {mine.map((m) => (
                <div key={m.id} className="project-row">
                  <MemoryCard m={m} categories={state.categories} projects={state.projects} view="list" />
                  <button type="button" className="icon-btn" aria-label={`Remove ${m.title} from this project`} onClick={() => toggleProject(m.id, p.id)}>
                    <Icon name="x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="proj-outcome" className="project-outcome">
          <h2 id="proj-outcome">Outcome: {OUTCOME[p.outcome]}</h2>
          <div className="steps-next-row">
            <label className="field-inline">
              <span>Build a</span>
              <select
                className="select"
                value={p.outcome}
                onChange={(e) => {
                  updateProject(p.id, { outcome: e.target.value as typeof p.outcome });
                  setDraft(null);
                }}
              >
                <option value="itinerary">Itinerary</option>
                <option value="content_brief">Content brief</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary" onClick={build} disabled={mine.length === 0}>
              <Icon name="spark" /> Build the {OUTCOME[p.outcome].toLowerCase()}
            </button>
          </div>
          {draft ? (
            <DraftView draft={draft} mock={mine.some((m) => m.sample)} />
          ) : (
            <p className="hint">The draft uses only what is stored on these saves: your notes, the captions and the recorded evidence. Where they do not say, the draft says "not known".</p>
          )}
        </section>
      </div>

      <p className="danger">
        <ConfirmButton
          label="Delete project"
          icon={<Icon name="trash" />}
          confirm="Delete the project? The saves stay."
          onConfirm={() => {
            deleteProject(p.id);
            toast('Project deleted. Its saves are still in your library.');
            navigate('/app/projects');
          }}
        />
      </p>
    </div>
  );
}
