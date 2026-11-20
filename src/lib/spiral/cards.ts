import { clearance, type Box, type Rect } from "./keepout";
import { cardHeightAt, perspective, poseAt, type Plan } from "./layout";
import { approach, frac, lerp, smooth, TAU } from "./math";
import type { SpiralSettings } from "./settings";

// One card's life, with no drawing in it: where it is on its journey, where that puts it in
// space, how the pointer moves it, and how visible it is. The engine calls stepCard every frame.

export type Card = {
  index: number;
  arm: number;
  slot: number;
  /** Fixed place on the journey; arms are staggered so cards never form rings. */
  base: number;
  seed: number;
  /** How far behind its place the card has fallen while it was held under the pointer. */
  lag: number;
  held: boolean;
  /** Which lap of the journey the card is on, and how far along it (0 to 1). */
  cycle: number;
  u: number;
  /** Index of the media item shown on the current lap, and the lap it was chosen on. */
  pick: number;
  pickedLap: number;
  /** Width over height of what the card shows. */
  aspect: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  /** Perspective: size on screen is `w * scale` by `h * scale`. */
  scale: number;
  alpha: number;
  soften: number;
  wash: number;
  round: number;
};

export type Frame = {
  plan: Plan;
  settings: SpiralSettings;
  /** Seconds of motion so far (stands still while paused), and this frame's share of it. */
  time: number;
  dt: number;
  /** Journeys completed by the whole spiral, and the journeys it adds per second. */
  phase: number;
  rate: number;
  spin: number;
  /** How far the opening reveal has travelled along the journey (above 1 it is over). */
  reveal: number;
  pointer: { x: number; y: number; active: boolean };
  keep: readonly Rect[];
  /** Slots per arm that are shown; the governor lowers this on slow machines. */
  activeSlots: number;
};

const REVEAL_BAND = 0.2;
const MAX_WASH = 0.9;
const BEHIND_TEXT_SOFTEN = 0.5;
const LEAVING_FROM = 0.94;
const UNSET = Number.NaN;

export function makeCards(plan: Plan, stagger: number): Card[] {
  const cards: Card[] = [];
  for (let index = 0; index < plan.arms * plan.perArm; index++) {
    const arm = index % plan.arms;
    const slot = Math.floor(index / plan.arms);
    cards.push({
      index,
      arm,
      slot,
      base: (slot + frac(arm * stagger)) / plan.perArm,
      seed: frac(index * 0.754877) * TAU,
      lag: 0,
      held: false,
      cycle: UNSET,
      u: 0,
      pick: -1,
      pickedLap: UNSET,
      aspect: 1,
      x: 0,
      y: 0,
      z: 0,
      w: 0,
      h: 0,
      scale: 1,
      alpha: 0,
      soften: 0,
      wash: 1,
      round: 0,
    });
  }
  return cards;
}

/** Which of `count` media items a card carries on its current lap. */
export function itemFor(card: Card, count: number) {
  const pick = card.index * 7 + card.cycle * 11;
  return ((pick % count) + count) % count;
}

export const boxOf = (card: Card): Box => ({
  cx: card.x * card.scale,
  cy: card.y * card.scale,
  halfW: (card.w * card.scale) / 2,
  halfH: (card.h * card.scale) / 2,
});

/** A held card stands still and falls behind; once released it eases back into its place. */
function travel(card: Card, frame: Frame) {
  const rejoin = frame.settings.motion.rejoinSeconds;
  card.lag = card.held
    ? card.lag + frame.rate * frame.dt
    : approach(card.lag, Math.round(card.lag), rejoin, frame.dt);
  const journey = frame.phase - card.lag + card.base;
  card.cycle = Math.floor(journey);
  card.u = frac(journey);
}

function settle(card: Card, frame: Frame) {
  const { plan, settings } = frame;
  const { driftPx, driftSeconds } = settings.motion;
  const pose = poseAt(plan, card.arm, card.u, frame.spin);
  const sway = (TAU * frame.time) / driftSeconds;
  card.x = pose.x + driftPx * Math.sin(sway + card.seed);
  card.y = pose.y + driftPx * Math.cos(sway * 0.8 + card.seed * 1.7);
  card.z = pose.z;
  card.h = cardHeightAt(plan, pose, settings.look);
  const shaped = smooth(0, settings.look.shapeUntil, card.u);
  card.w = card.h * lerp(1, card.aspect, shaped);
}

/** Cards near the pointer lean toward it and lift toward the viewer. */
function attract(card: Card, frame: Frame) {
  const { pointer, plan } = frame;
  const { reachPx, pullPx, liftPx } = frame.settings.pointer;
  const scale = perspective(plan, card);
  const dx = pointer.x - card.x * scale;
  const dy = pointer.y - card.y * scale;
  const distance = Math.hypot(dx, dy) || 1;
  const near = Math.max(0, 1 - distance / reachPx);
  const pull = card.held ? 0 : (pullPx * near) / (scale * distance);
  card.x += dx * pull;
  card.y += dy * pull;
  card.z += liftPx * (card.held ? 1 : near);
}

function shade(card: Card, frame: Frame) {
  const { look, keepOut } = frame.settings;
  const clear = clearance(frame.keep, boxOf(card), keepOut.bandPx);
  const revealed = smooth(card.u, card.u + REVEAL_BAND, frame.reveal);
  const shown = card.slot < frame.activeSlots ? 1 : 0;
  const newborn = 1 - smooth(0, look.softenUntil, card.u);
  const behindText = (1 - clear) * BEHIND_TEXT_SOFTEN;
  const shaped = smooth(0, look.shapeUntil, card.u);
  const circle = (Math.min(card.w, card.h) * card.scale) / 2;
  const present =
    smooth(0, look.fadeUntil, card.u) * (1 - smooth(LEAVING_FROM, 1, card.u));
  card.alpha = present * lerp(keepOut.ghost, 1, clear) * revealed * shown;
  card.soften = card.held ? 0 : look.soften * (newborn + behindText);
  card.wash = MAX_WASH * (1 - smooth(0, look.washUntil, card.u));
  card.round = lerp(circle, look.cornerPx, shaped);
}

/** Advances one card by one frame and leaves its pose and look on the card. */
export function stepCard(card: Card, frame: Frame) {
  travel(card, frame);
  settle(card, frame);
  if (frame.pointer.active) attract(card, frame);
  card.scale = perspective(frame.plan, card);
  shade(card, frame);
}

/** True when any part of the card can be seen on the stage. */
export function onStage(card: Card, plan: Plan) {
  if (card.alpha < 0.004) return false;
  const box = boxOf(card);
  const insideX = Math.abs(box.cx) - box.halfW < plan.width / 2;
  const insideY = Math.abs(box.cy) - box.halfH < plan.height / 2;
  return insideX && insideY;
}
