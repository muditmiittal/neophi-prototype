// Opens a memory with a shared-element morph: the card picture grows into the memory page.
// Uses the browser's View Transitions API where it exists; elsewhere (and for reduced motion) the
// ordinary link behaviour runs, so nothing is lost.
import type { MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import type { NavigateFunction } from 'react-router-dom';

type Doc = Document & { startViewTransition?: (update: () => void) => unknown };

export function morphTo(event: MouseEvent<HTMLElement>, navigate: NavigateFunction, to: string) {
  const doc = document as Doc;
  if (!doc.startViewTransition) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  event.preventDefault();
  const el = event.currentTarget;
  el.style.setProperty('view-transition-name', 'memory-hero');
  doc.startViewTransition(() => {
    flushSync(() => navigate(to));
    el.style.removeProperty('view-transition-name');
  });
}
