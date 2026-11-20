import { clamp, lerp } from "./math";
import type { SpiralSettings } from "./settings";

// Watches the frame time. When the frame rate stays low the spiral shows fewer cards; when it has
// been comfortably smooth for a while, the cards come back a few at a time.

const SMOOTHING = 0.05;
const HEADROOM_FPS = 20;

export function createGovernor(rules: SpiralSettings["throttle"]) {
  let frame = 1 / 60;
  let lowFor = 0;
  let goodFor = 0;
  let density = 1;

  function shed() {
    density = Math.max(rules.floor, density * (1 - rules.shedStep));
    lowFor = 0;
  }

  function recover() {
    density = Math.min(1, density + rules.recoverStep);
    goodFor = 0;
  }

  return {
    /** Feed one frame's duration in seconds; returns the share of cards to show. */
    sample(dt: number) {
      frame = lerp(frame, clamp(dt, 0.001, 0.25), SMOOTHING);
      const fps = 1 / frame;
      const low = fps < rules.minFps;
      lowFor = low ? lowFor + dt : 0;
      goodFor = low ? 0 : goodFor + dt;
      if (lowFor > rules.shedAfterSeconds) shed();
      const roomy = fps > rules.minFps + HEADROOM_FPS;
      if (roomy && goodFor > rules.recoverAfterSeconds) recover();
      return density;
    },
    fps: () => 1 / frame,
    density: () => density,
  };
}

export type Governor = ReturnType<typeof createGovernor>;
