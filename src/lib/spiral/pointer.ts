// Follows the mouse or pen over the stage. Touch never counts as hovering: on a phone the cards
// are not pulled about, and a tap is handled as a click by the engine.

export type PointerState = { x: number; y: number; active: boolean };

/** Things on top of the spiral that keep their own clicks and hovers. */
export const INTERACTIVE =
  "a, button, summary, input, select, textarea, label, dialog";

/** Stage coordinates (pixels from the middle, y up) of a mouse or pointer event. */
export function stagePoint(event: MouseEvent, layer: Element) {
  const rect = layer.getBoundingClientRect();
  const left = event.clientX - rect.left;
  const top = event.clientY - rect.top;
  return {
    x: left - rect.width / 2,
    y: rect.height / 2 - top,
    inside: left >= 0 && top >= 0 && left <= rect.width && top <= rect.height,
  };
}

export const onControl = (event: Event) =>
  event.target instanceof Element && event.target.closest(INTERACTIVE) !== null;

export function trackPointer(layer: Element) {
  const state: PointerState = { x: 0, y: 0, active: false };

  const move = (event: PointerEvent) => {
    const point = stagePoint(event, layer);
    const hovering = event.pointerType !== "touch" && !onControl(event);
    state.x = point.x;
    state.y = point.y;
    state.active = point.inside && hovering;
  };
  const leave = () => {
    state.active = false;
  };

  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);

  return {
    state,
    dispose() {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    },
  };
}

export type PointerTracker = ReturnType<typeof trackPointer>;
