// Two small live effects: the card spotlight and tilt follow the pointer, and the page scroll position
// is exposed as --scroll so CSS can turn things with it. Both do nothing for reduced motion.
export function startLiveFx() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;
  const root = document.documentElement;
  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      root.style.setProperty('--scroll', String(Math.round(window.scrollY)));
    });
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.mcard-pic');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
    card.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
    card.style.setProperty('--rx', `${(0.5 - y) * 9}deg`);
  };
  const onLeave = (e: PointerEvent) => {
    const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.mcard-pic');
    card?.style.setProperty('--rx', '0deg');
    card?.style.setProperty('--ry', '0deg');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', onLeave, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerout', onLeave);
  };
}
