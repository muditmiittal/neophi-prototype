import {
  boxOf,
  itemFor,
  makeCards,
  onStage,
  stepCard,
  type Card,
  type Frame,
} from "./cards";
import { createGovernor } from "./governor";
import { drawGuides } from "./guides";
import { contains, stageRect, type Rect } from "./keepout";
import { planSpiral, type Plan } from "./layout";
import { lerp, smooth, TAU } from "./math";
import {
  beginMedia,
  createMedia,
  disposeMedia,
  faceOf,
  syncVideos,
  type MediaItem,
  type SpiralCard,
} from "./media";
import { onControl, stagePoint, trackPointer } from "./pointer";
import type { SpiralSettings } from "./settings";
import type { Stage } from "./stage";

// Runs the spiral: keeps the clock, steps every card each frame, hands them to the stage to draw,
// and looks after hovering, clicks, videos, resizing and stopping when nobody can see it.

export type EngineParts = {
  /** The section the spiral decorates: it receives the clicks and the pointer cursor. */
  host: HTMLElement;
  /** The decorative layer that fills the host, and the pieces inside it. */
  layer: HTMLElement;
  underlay: HTMLCanvasElement;
  label: HTMLElement;
  stage: Stage;
  cards: readonly SpiralCard[];
  settings: SpiralSettings;
  keepOut: () => Element[];
  /** Start paused on a finished frame (for visitors who asked for reduced motion). */
  still: boolean;
  onPick: (id: string) => void;
  onHover: (label: string | null) => void;
};

const MAX_STEP_SECONDS = 0.05;
const REVEAL_OVERSHOOT = 1.2;
const STILL_PHASE = 0.37;
const HOVER_MIN_ALPHA = 0.4;
const VIDEO_MIN_ALPHA = 0.5;
const LABEL_GAP = 10;
const NOTHING_PLAYING: ReadonlySet<MediaItem> = new Set();

export class Engine {
  private readonly pen: CanvasRenderingContext2D;
  private readonly media: MediaItem[];
  private readonly governor;
  private readonly pointer;
  private readonly resizes: ResizeObserver;
  private readonly sightings: IntersectionObserver;
  private plan: Plan;
  private cards: Card[] = [];
  private keep: Rect[] = [];
  private held: Card | null = null;
  private time = 0;
  private phase = 0;
  private spin = 0;
  private reveal = 0;
  private paused = false;
  private inView = true;
  private running = false;
  private raf = 0;
  private last = 0;
  private workMs = 0;
  private sinceReport = 0;

  constructor(private readonly parts: EngineParts) {
    const { layer, underlay, settings } = parts;
    this.pen = underlay.getContext("2d")!;
    this.media = createMedia(parts.cards);
    this.allItems = this.media.map((_, index) => index);
    this.media.forEach((item, index) => {
      const key = item.card.section ?? "";
      this.pools.set(key, [...(this.pools.get(key) ?? []), index]);
    });
    this.governor = createGovernor(settings.throttle);
    this.pointer = trackPointer(layer);
    this.plan = planSpiral({ width: 1, height: 1 }, settings);
    if (parts.still) this.beginStill();
    this.resizes = new ResizeObserver(() => this.layout());
    this.sightings = new IntersectionObserver(([entry]) => {
      this.inView = entry?.isIntersecting ?? true;
      this.sync();
    });
    this.listen();
    this.layout();
    this.sync();
  }

  private beginStill() {
    this.paused = true;
    this.phase = STILL_PHASE;
    this.reveal = REVEAL_OVERSHOOT;
  }

  private listen() {
    const { host, layer } = this.parts;
    host.addEventListener("click", this.click);
    document.addEventListener("visibilitychange", this.sync);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.sightings.observe(layer);
    this.resizes.observe(layer);
    for (const element of this.parts.keepOut()) this.resizes.observe(element);
  }

  /** Reads the size of the stage and lays the spiral out for it. */
  private layout() {
    const { layer, underlay, stage, settings } = this.parts;
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    if (width === 0 || height === 0) return;
    this.plan = planSpiral({ width, height }, settings);
    stage.resize(this.plan, settings.space.fovDeg);
    underlay.width = Math.round(width * stage.pixelRatio);
    underlay.height = Math.round(height * stage.pixelRatio);
    this.recount();
    this.measureKeep();
  }

  /** Where the readable blocks are right now; called on resize and, as the page moves, on scroll. */
  private measureKeep() {
    const { layer, settings } = this.parts;
    const bounds = layer.getBoundingClientRect();
    this.keep = this.parts
      .keepOut()
      .map((element) => stageRect(element, bounds, settings.keepOut.padPx));
  }

  private scrollFrame = 0;
  private section = "";
  private scrollY = typeof window === "undefined" ? 0 : window.scrollY;
  private scrollJourneys = 0;
  private scrollSpin = 0;
  private lastLabel: string | null = null;
  private pools = new Map<string, number[]>();
  private allItems: number[] = [];
  private readonly onScroll = () => {
    const y = window.scrollY;
    this.scrollJourneys +=
      (Math.abs(y - this.scrollY) / 1000) *
      this.parts.settings.motion.scrollJourneys;
    this.scrollSpin +=
      (y - this.scrollY) * this.parts.settings.motion.scrollTurn;
    this.scrollY = y;
    if (this.scrollFrame) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      this.measureKeep();
    });
  };

  private recount() {
    const count = this.plan.arms * this.plan.perArm;
    if (count === this.cards.length) return;
    this.held = null;
    this.cards = makeCards(this.plan, this.parts.settings.motion.armStagger);
    this.parts.stage.setCount(count);
  }

  private readonly sync = () => {
    if (this.inView && !document.hidden) this.start();
    else this.stop();
  };

  private start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    syncVideos(this.media, NOTHING_PLAYING);
  }

  private readonly frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(MAX_STEP_SECONDS, (now - this.last) / 1000);
    this.last = now;
    const began = performance.now();
    this.advance(dt);
    this.draw(dt);
    this.workMs = lerp(this.workMs, performance.now() - began, 0.05);
    this.report(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private advance(dt: number) {
    const { motion } = this.parts.settings;
    const moved = this.paused ? 0 : dt;
    this.time += moved;
    this.phase += moved / motion.journeySeconds;
    if (!this.paused) {
      this.phase += this.scrollJourneys;
      this.spin += this.scrollSpin;
    }
    this.scrollJourneys = 0;
    this.scrollSpin = 0;
    this.spin += (TAU * moved) / motion.turnSeconds;
    this.reveal += (dt * REVEAL_OVERSHOOT) / motion.revealSeconds;
  }

  private frameFor(dt: number): Frame {
    const { settings } = this.parts;
    const density = this.governor.sample(dt);
    return {
      plan: this.plan,
      settings,
      time: this.time,
      dt: this.paused ? 0 : dt,
      phase: this.phase,
      rate: 1 / settings.motion.journeySeconds,
      spin: this.spin,
      reveal: this.reveal,
      pointer: this.pointer.state,
      keep: this.keep,
      activeSlots: Math.max(1, Math.round(this.plan.perArm * density)),
    };
  }

  private draw(dt: number) {
    const { stage, settings } = this.parts;
    const frame = this.frameFor(dt);
    const playing = new Set<MediaItem>();
    for (const card of this.cards) this.present(card, frame, playing);
    this.hover();
    syncVideos(this.media, this.paused ? NOTHING_PLAYING : playing);
    drawGuides(
      this.pen,
      {
        plan: this.plan,
        spin: this.spin,
        time: this.time,
        fade: smooth(0, 1, this.reveal),
        pixelRatio: stage.pixelRatio,
      },
      settings.look,
    );
    stage.render();
  }

  /** The picture a card carries; it is chosen anew each lap, from the section in view. */
  private itemOf(card: Card) {
    if (card.pickedLap !== card.cycle) {
      card.pickedLap = card.cycle;
      const pool = this.pools.get(this.section) ?? this.allItems;
      card.pick = pool[itemFor(card, pool.length)] ?? 0;
    }
    return this.media[card.pick];
  }

  /** Cards born from now on show pictures of this section (the page tells us which is in view). */
  setSection(id: string) {
    this.section = id;
  }

  private present(card: Card, frame: Frame, playing: Set<MediaItem>) {
    const { stage } = this.parts;
    stepCard(card, frame);
    const item = this.itemOf(card);
    if (!item || !onStage(card, this.plan)) return stage.hide(card.index);
    beginMedia(item);
    if (this.wantsVideo(card, playing)) playing.add(item);
    const face = faceOf(item);
    if (face) card.aspect = face.aspect;
    stage.show(card.index, card, face);
  }

  /** A video plays only on a card that is large, clearly visible and near the middle. */
  private wantsVideo(card: Card, playing: ReadonlySet<MediaItem>) {
    const { video } = this.parts.settings;
    if (playing.size >= video.maxPlaying) return false;
    if (card.alpha < VIDEO_MIN_ALPHA) return false;
    if (card.held) return true; // a card under the pointer plays its video whatever its size
    const box = boxOf(card);
    const reachX = (this.plan.width / 2) * video.centreShare;
    const reachY = (this.plan.height / 2) * video.centreShare;
    const central = Math.abs(box.cx) < reachX && Math.abs(box.cy) < reachY;
    return central && box.halfH * 2 >= video.minHeightPx;
  }

  /** The nearest clearly visible card under a point of the stage, if any. */
  private cardAt(x: number, y: number) {
    let top: Card | null = null;
    for (const card of this.cards) {
      if (card.alpha < HOVER_MIN_ALPHA) continue;
      if (!contains(boxOf(card), x, y)) continue;
      if (!top || card.z > top.z) top = card;
    }
    return top;
  }

  private hover() {
    const { x, y, active } = this.pointer.state;
    const pick = active ? this.cardAt(x, y) : null;
    if (this.held) this.held.held = false;
    if (pick) pick.held = true;
    this.held = pick;
    this.parts.host.style.cursor = pick ? "pointer" : "";
    this.caption(pick);
  }

  /** Tells the page when the pointer starts or stops resting on a card (for its own cursor). */
  private announce(label: string | null) {
    if (label === this.lastLabel) return;
    this.lastLabel = label;
    this.parts.onHover(label);
  }

  private caption(card: Card | null) {
    const { label } = this.parts;
    const item = card ? this.itemOf(card) : undefined;
    this.announce(card && item ? item.card.label : null);
    if (!card || !item) {
      label.style.opacity = "0";
      return;
    }
    const box = boxOf(card);
    const left = this.plan.width / 2 + box.cx;
    const top = this.plan.height / 2 - box.cy + box.halfH + LABEL_GAP;
    label.textContent = item.card.label;
    label.style.transform = `translate(${left}px, ${top}px) translateX(-50%)`;
    label.style.opacity = "1";
  }

  private readonly click = (event: MouseEvent) => {
    if (onControl(event)) return;
    const point = stagePoint(event, this.parts.layer);
    const card = point.inside ? this.cardAt(point.x, point.y) : null;
    const item = card ? this.itemOf(card) : undefined;
    if (item) this.parts.onPick(item.card.id);
  };

  /** Once a second, leaves the measured numbers on the layer for anyone who wants to read them. */
  private report(dt: number) {
    this.sinceReport += dt;
    if (this.sinceReport < 1) return;
    this.sinceReport = 0;
    const data = this.parts.layer.dataset;
    data["fps"] = this.governor.fps().toFixed(1);
    data["workMs"] = this.workMs.toFixed(2);
    data["density"] = this.governor.density().toFixed(2);
    data["cards"] = String(this.cards.length);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  destroy() {
    const { host, stage } = this.parts;
    this.stop();
    this.resizes.disconnect();
    this.sightings.disconnect();
    host.removeEventListener("click", this.click);
    document.removeEventListener("visibilitychange", this.sync);
    window.removeEventListener("scroll", this.onScroll);
    cancelAnimationFrame(this.scrollFrame);
    this.pointer.dispose();
    host.style.cursor = "";
    disposeMedia(this.media);
    stage.dispose();
  }
}
