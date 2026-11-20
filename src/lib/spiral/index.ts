import { Engine } from "./engine";
import type { SpiralCard } from "./media";
import { resolveSettings, type SpiralOverrides } from "./settings";
import { Stage } from "./stage";

// A slowly turning spiral of picture and video cards, drawn behind a section of a page.
//
//   const spiral = mountSpiral(section, { cards, onPick: (id) => open(id) });
//   spiral.setPaused(true);   // freeze the motion; hovering and clicking still work
//   spiral.destroy();         // before the section is removed
//
// The section needs a height. Its own content goes above the spiral (z-index 1 or more); mark
// the text that must stay readable with data-spiral-keepout and cards will fade as they pass
// behind it. The layer is decorative and hidden from assistive technology, so the same cards
// must also be on the page as ordinary content. Nothing in this folder knows about the site it
// runs on: copy the folder, add `three`, and pass your own cards and settings.

export { DEFAULT_SETTINGS, resolveSettings } from "./settings";
export type { SpiralOverrides, SpiralSettings } from "./settings";
export type { SpiralCard } from "./media";

export type SpiralOptions = {
  cards: readonly SpiralCard[];
  settings?: SpiralOverrides;
  /** CSS selector, inside the host, of the blocks the cards must keep clear of. */
  keepOut?: string;
  /** Draw the spiral behind the whole screen and keep it there while the page scrolls. */
  fixed?: boolean;
  /** Start paused on a finished frame. */
  still?: boolean;
  /** Called with a card's id when it is clicked or tapped. */
  onPick?: (id: string) => void;
  /** Called with the label of the card under the pointer, or null when there is none. */
  onHover?: (label: string | null) => void;
};

export type SpiralHandle = {
  /** False when the browser has no WebGL: nothing was added to the page. */
  supported: boolean;
  setPaused: (paused: boolean) => void;
  /** Cards born from now on show pictures of this section (card.section). */
  setSection: (id: string) => void;
  destroy: () => void;
};

const UNSUPPORTED: SpiralHandle = {
  supported: false,
  setPaused: () => undefined,
  setSection: () => undefined,
  destroy: () => undefined,
};

const FILL = { position: "absolute", inset: "0", display: "block" } as const;

function createLayer(fixed: boolean) {
  const layer = document.createElement("div");
  layer.dataset["spiral"] = "";
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, FILL, {
    position: fixed ? "fixed" : "absolute",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "0",
    opacity: "0",
    transition: "opacity 1s ease",
  });
  return layer;
}

function createUnderlay() {
  const underlay = document.createElement("canvas");
  Object.assign(underlay.style, FILL, { width: "100%", height: "100%" });
  return underlay;
}

/** The name shown under a hovered card: dark ink on nothing lighter than paper, about 12:1. */
function createLabel() {
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    left: "0",
    top: "0",
    zIndex: "2",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#2b241c",
    color: "#f3ead9",
    font: "600 14px/1.3 system-ui, sans-serif",
    whiteSpace: "nowrap",
    opacity: "0",
    transition: "opacity .2s ease",
  });
  return label;
}

export function mountSpiral(
  host: HTMLElement,
  options: SpiralOptions,
): SpiralHandle {
  const settings = resolveSettings(options.settings);
  const stage = options.cards.length > 0 ? Stage.create(settings.look) : null;
  if (!stage) return UNSUPPORTED;

  const keepOut = options.keepOut ?? "[data-spiral-keepout]";
  const layer = createLayer(options.fixed ?? false);
  const underlay = createUnderlay();
  const label = createLabel();
  Object.assign(stage.canvas.style, FILL, { zIndex: "1" });
  layer.append(underlay, stage.canvas, label);
  host.prepend(layer);

  const engine = new Engine({
    host,
    layer,
    underlay,
    label,
    stage,
    cards: options.cards,
    settings,
    keepOut: () => [...host.querySelectorAll(keepOut)],
    still: options.still ?? false,
    onPick: options.onPick ?? (() => undefined),
    onHover: options.onHover ?? (() => undefined),
  });
  requestAnimationFrame(() => {
    layer.style.opacity = "1";
  });

  return {
    supported: true,
    setPaused: (paused) => engine.setPaused(paused),
    setSection: (id) => engine.setSection(id),
    destroy() {
      engine.destroy();
      layer.remove();
    },
  };
}
