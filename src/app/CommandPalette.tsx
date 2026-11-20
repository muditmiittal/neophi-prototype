// Ctrl+K (or Cmd+K): search the library, jump anywhere, and start a save, from the keyboard.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { search } from '../lib/search';
import { useStore } from '../store/store';

interface Item {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { memories, categories } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('neophi:palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('neophi:palette', onOpen);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery('');
      setAt(0);
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && d.open) d.close();
  }, [open]);

  const go = (to: string) => () => {
    setOpen(false);
    navigate(to);
  };

  const items: Item[] = useMemo(() => {
    const pages: Item[] = [
      { id: 'p-today', label: 'Today', hint: 'Go to', run: go('/app/today') },
      { id: 'p-lib', label: 'Library', hint: 'Go to', run: go('/app/library') },
      { id: 'p-save', label: 'Save something new', hint: 'Action', run: go('/app/capture') },
      { id: 'p-search', label: 'Search page', hint: 'Go to', run: go('/app/search') },
      { id: 'p-proj', label: 'Projects', hint: 'Go to', run: go('/app/projects') },
      { id: 'p-set', label: 'Settings', hint: 'Go to', run: go('/app/settings') },
      {
        id: 'p-theme',
        label: 'Switch light and dark',
        hint: 'Action',
        run: () => {
          const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.dataset.theme = next;
          try {
            localStorage.setItem('neophi.theme', next);
          } catch {
            /* private mode */
          }
          setOpen(false);
        },
      },
    ];
    const q = query.trim();
    if (!q) return pages;
    const lower = q.toLowerCase();
    const hits: Item[] = search(q, memories, categories)
      .slice(0, 7)
      .map((h) => ({
        id: `m-${h.memory.id}`,
        label: h.memory.title,
        hint: h.reasons[0] ? `${h.reasons[0].lane}: ${h.reasons[0].text}` : 'Memory',
        run: go(`/app/m/${h.memory.id}`),
      }));
    const matchedPages = pages.filter((p) => p.label.toLowerCase().includes(lower));
    return [...hits, ...matchedPages, { id: 'q-search', label: `Search the library for "${q}"`, hint: 'Search', run: go(`/app/search?q=${encodeURIComponent(q)}`) }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, memories, categories]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAt((v) => Math.min(items.length - 1, v + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAt((v) => Math.max(0, v - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[at]?.run();
    }
  };

  return (
    <dialog ref={dialog} className="palette" aria-label="Command palette" onClose={() => setOpen(false)} onClick={(e) => e.target === dialog.current && setOpen(false)}>
      <div className="palette-box" onKeyDown={onKeyDown}>
        <label className="palette-field">
          <Icon name="search" />
          <input ref={input} className="palette-input" type="text" placeholder="Search saves, or type a place to go" value={query} onChange={(e) => { setQuery(e.target.value); setAt(0); }} aria-controls="palette-list" aria-activedescendant={items[at] ? `pal-${items[at].id}` : undefined} />
          <kbd className="palette-kbd">Esc</kbd>
        </label>
        <ul id="palette-list" className="palette-list" role="listbox">
          {items.map((it, i) => (
            <li key={it.id} id={`pal-${it.id}`} role="option" aria-selected={i === at} className={i === at ? 'is-on' : undefined} onMouseEnter={() => setAt(i)} onClick={it.run}>
              <span>{it.label}</span>
              <small>{it.hint}</small>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
