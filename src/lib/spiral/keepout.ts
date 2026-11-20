import { smooth } from "./math";

// Rectangles the cards must leave readable, in stage coordinates (pixels from the middle, y up).

export type Rect = { x0: number; x1: number; y0: number; y1: number };
export type Box = { cx: number; cy: number; halfW: number; halfH: number };

/** The stage-coordinate rectangle of `element`, grown by `pad`, inside `stage`. */
export function stageRect(element: Element, stage: DOMRect, pad: number): Rect {
  const r = element.getBoundingClientRect();
  const midX = stage.left + stage.width / 2;
  const midY = stage.top + stage.height / 2;
  return {
    x0: r.left - midX - pad,
    x1: r.right - midX + pad,
    y0: midY - r.bottom - pad,
    y1: midY - r.top + pad,
  };
}

function gap(rect: Rect, box: Box) {
  const dx = Math.max(
    rect.x0 - (box.cx + box.halfW),
    box.cx - box.halfW - rect.x1,
    0,
  );
  const dy = Math.max(
    rect.y0 - (box.cy + box.halfH),
    box.cy - box.halfH - rect.y1,
    0,
  );
  return Math.hypot(dx, dy);
}

/** 1 when `box` is at least `band` pixels from every rectangle, 0 when it touches one. */
export function clearance(rects: readonly Rect[], box: Box, band: number) {
  let nearest = Infinity;
  for (const rect of rects) nearest = Math.min(nearest, gap(rect, box));
  return smooth(0, band, nearest);
}

export const contains = (box: Box, x: number, y: number) =>
  Math.abs(x - box.cx) <= box.halfW && Math.abs(y - box.cy) <= box.halfH;
