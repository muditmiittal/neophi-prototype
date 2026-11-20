import { clamp, lerp, smooth, TAU } from "./math";
import type { SpiralProfile, SpiralSettings } from "./settings";

// Where things are. A logarithmic spiral drawn on a disc; the disc leans away from the viewer and
// its centre sits deeper than its rim, so a card is born far off and travels toward the screen.
// Stage coordinates are pixels from the middle of the stage, y pointing up.

export type Size = { width: number; height: number };

export type Plan = Size & {
  shape: "disc" | "coil";
  /** Coil only: half the height of the spring, and its lean. */
  halfH: number;
  coilSin: number;
  coilCos: number;
  arms: number;
  perArm: number;
  turns: number;
  /** Radius at birth, at the drawn reach, and where a card has left the screen. */
  birthR: number;
  reachR: number;
  endR: number;
  lnSpan: number;
  lnReach: number;
  /** Tallest card in pixels, and the gap (as a share of the radius) a card must fit into. */
  capH: number;
  gap: number;
  camera: number;
  tiltSin: number;
  tiltCos: number;
  depth: number;
};

/** A point in space, with its radius on the disc and its share of the journey (0 to 1). */
export type Pose = { x: number; y: number; z: number; r: number; u: number };

type Lens = { edge: number; camera: number; tilt: number };

const MIN_PER_ARM = 2;
const EXIT_MARGIN = 1.2;
const FULL_SIZE_AT = 0.6;

function profileFor(size: Size, settings: SpiralSettings): SpiralProfile {
  const phone = size.width < settings.mobileBelowPx;
  return phone ? settings.mobile : settings.desktop;
}

function cardCount(size: Size, settings: SpiralSettings) {
  const profile = profileFor(size, settings);
  if (profile === settings.mobile) return profile.cards;
  const area = (size.width * size.height) / 1e6;
  return Math.round(profile.cards * Math.min(1, area / settings.tunedAreaMpx));
}

/**
 * Radius on the disc at which even the far, receding side has passed `edge` pixels from the
 * middle of the screen, so no card is still in view when its journey ends.
 */
function exitRadius({ edge, camera, tilt }: Lens) {
  const room = camera * Math.cos(tilt) - edge * Math.sin(tilt);
  return (edge * camera) / Math.max(room, camera * 0.25);
}

export function planSpiral(size: Size, settings: SpiralSettings): Plan {
  const { width, height } = size;
  const profile = profileFor(size, settings);
  const tilt = (settings.space.tiltDeg * Math.PI) / 180;
  const halfDiagonal = Math.hypot(width, height) / 2;
  const reachR = profile.reach * halfDiagonal;
  const birthR = profile.birth * reachR;
  const capH = profile.cardHeight * height;
  const camera = height / 2 / Math.tan((settings.space.fovDeg * Math.PI) / 360);
  const edge = halfDiagonal + capH * EXIT_MARGIN;
  const endR = exitRadius({ edge, camera, tilt });
  const lnReach = Math.log(reachR / birthR);
  const lnSpan = Math.log(endR / birthR);
  const perArm = Math.max(
    MIN_PER_ARM,
    Math.round(cardCount(size, settings) / profile.arms),
  );
  if (settings.shape === "coil")
    return planCoil(size, settings, profile, perArm, capH, camera);
  const armGap = Math.exp(lnReach / (profile.arms * profile.turns)) - 1;
  const slotGap = Math.exp(lnSpan / perArm) - 1;
  return {
    width,
    height,
    shape: "disc",
    halfH: 0,
    coilSin: 0,
    coilCos: 1,
    arms: profile.arms,
    perArm,
    turns: profile.turns,
    birthR,
    reachR,
    endR,
    lnSpan,
    lnReach,
    capH,
    gap: Math.min(armGap, slotGap),
    camera,
    tiltSin: Math.sin(tilt),
    tiltCos: Math.cos(tilt),
    depth: settings.space.depthPx,
  };
}

function planCoil(
  size: Size,
  settings: SpiralSettings,
  profile: SpiralProfile,
  perArm: number,
  capH: number,
  camera: number,
): Plan {
  const bottomR = Math.min(size.width * 0.44, size.height * 0.62);
  const tilt = (settings.coilTiltDeg * Math.PI) / 180;
  return {
    ...size,
    shape: "coil",
    halfH: size.height * 0.46,
    coilSin: Math.sin(tilt),
    coilCos: Math.cos(tilt),
    arms: profile.arms,
    perArm,
    turns: profile.turns,
    birthR: bottomR * profile.birth,
    reachR: bottomR,
    endR: bottomR,
    lnSpan: 1,
    lnReach: 1,
    capH,
    gap: 1,
    camera,
    tiltSin: 0,
    tiltCos: 1,
    depth: 0,
  };
}

/** A point of the coil: radius grows from the top (u = 0) to the bottom (u = 1). */
function coilPoint(plan: Plan, arm: number, u: number, spin: number): Pose {
  const r = plan.birthR + (plan.reachR - plan.birthR) * u;
  const angle = (TAU * arm) / plan.arms + spin + TAU * plan.turns * u;
  const depth = r * Math.sin(angle);
  return {
    x: r * Math.cos(angle),
    y: plan.halfH * (1 - 2 * u) - depth * plan.coilSin,
    z: depth * plan.coilCos,
    r,
    u,
  };
}

/** Radius on the disc at journey share `u` (0 is birth, 1 is past the screen edge). */
export const radiusAt = (plan: Plan, u: number) =>
  plan.birthR * Math.exp(plan.lnSpan * u);

export function armAngle(plan: Plan, arm: number, r: number, spin: number) {
  const winding = (TAU * plan.turns * Math.log(r / plan.birthR)) / plan.lnReach;
  return (TAU * arm) / plan.arms + spin + winding;
}

/** A point of the leaning disc in space, pushed back the nearer it is to the centre. */
export function discPoint(plan: Plan, r: number, angle: number): Pose {
  const u = clamp(Math.log(r / plan.birthR) / plan.lnSpan, 0, 1);
  const along = r * Math.sin(angle);
  const sink = plan.depth * (1 - u) ** 2;
  return {
    x: r * Math.cos(angle),
    y: along * plan.tiltCos,
    z: -along * plan.tiltSin - sink,
    r,
    u,
  };
}

/** Where a card on `arm` is at journey share `u`. */
export function poseAt(plan: Plan, arm: number, u: number, spin: number): Pose {
  if (plan.shape === "coil") return coilPoint(plan, arm, u, spin);
  const r = radiusAt(plan, u);
  return discPoint(plan, r, armAngle(plan, arm, r, spin));
}

/** How much larger than life something at that depth appears (1 on the screen plane). */
export const perspective = (plan: Plan, at: { z: number }) =>
  plan.camera / (plan.camera - at.z);

/** Height of the card at `pose`, before perspective. */
export function cardHeightAt(
  plan: Plan,
  pose: Pose,
  look: SpiralSettings["look"],
) {
  const grown = smooth(0, FULL_SIZE_AT, pose.u);
  if (plan.shape === "coil") {
    // Room is the distance between neighbours around one turn of the spring at this radius.
    const perTurn = (plan.arms * plan.perArm) / plan.turns;
    const around = (TAU * pose.r) / perTurn;
    return (
      Math.min(plan.capH, look.fill * around) * lerp(look.birthScale, 1, grown)
    );
  }
  const room = look.fill * pose.r * plan.gap;
  return Math.min(plan.capH, room) * lerp(look.birthScale, 1, grown);
}
