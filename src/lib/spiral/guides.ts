import {
  armAngle,
  discPoint,
  perspective,
  poseAt,
  radiusAt,
  type Plan,
  type Pose,
} from "./layout";
import { frac, smooth, TAU } from "./math";
import type { SpiralSettings } from "./settings";

// The quiet drawing under the cards: the arms of the spiral, a few rings on the leaning disc,
// and small dots travelling outward along each arm. Plain 2D canvas, no graphics library.

type Look = SpiralSettings["look"];
type Pen = CanvasRenderingContext2D;

export type GuideState = {
  plan: Plan;
  spin: number;
  /** Seconds of motion so far; the dots stand still while the spiral is paused. */
  time: number;
  /** 0 to 1: the guides fade in with the opening reveal. */
  fade: number;
  pixelRatio: number;
};

const ARM_STEPS = 72;
const RING_STEPS = 96;
const DOT_SPEED = 0.03;
const DOT_RADIUS = 2.4;

/** Canvas position (y down) of a point in space. */
function onCanvas(plan: Plan, pose: Pose): [number, number] {
  const scale = perspective(plan, pose);
  return [pose.x * scale, -pose.y * scale];
}

function trace(pen: Pen, points: readonly [number, number][]) {
  pen.beginPath();
  points.forEach(([x, y], index) =>
    index === 0 ? pen.moveTo(x, y) : pen.lineTo(x, y),
  );
  pen.stroke();
}

function drawArms(pen: Pen, state: GuideState) {
  const { plan, spin } = state;
  for (let arm = 0; arm < plan.arms; arm++) {
    const points = Array.from({ length: ARM_STEPS + 1 }, (_, step) =>
      onCanvas(plan, poseAt(plan, arm, step / ARM_STEPS, spin)),
    );
    trace(pen, points);
  }
}

function drawRings(pen: Pen, state: GuideState, rings: number) {
  const { plan } = state;
  pen.setLineDash([2, 7]);
  for (let ring = 1; ring <= rings; ring++) {
    const r = plan.birthR + ((plan.reachR - plan.birthR) * ring) / rings;
    const points = Array.from({ length: RING_STEPS + 1 }, (_, step) =>
      onCanvas(plan, discPoint(plan, r, (TAU * step) / RING_STEPS)),
    );
    trace(pen, points);
  }
  pen.setLineDash([]);
}

function drawDot(pen: Pen, state: GuideState, arm: number, u: number) {
  const { plan, spin } = state;
  const pose =
    plan.shape === "coil"
      ? poseAt(plan, arm, u, spin)
      : discPoint(
          plan,
          radiusAt(plan, u),
          armAngle(plan, arm, radiusAt(plan, u), spin),
        );
  const [x, y] = onCanvas(plan, pose);
  const strength = smooth(0, 0.15, u) * (1 - smooth(0.8, 1, u));
  pen.globalAlpha *= strength;
  pen.beginPath();
  pen.arc(x, y, DOT_RADIUS * perspective(plan, pose), 0, TAU);
  pen.fill();
  pen.globalAlpha /= strength || 1;
}

function drawDots(pen: Pen, state: GuideState, perArm: number) {
  for (let arm = 0; arm < state.plan.arms; arm++)
    for (let dot = 0; dot < perArm; dot++)
      drawDot(
        pen,
        state,
        arm,
        frac(state.time * DOT_SPEED + dot / perArm + arm * 0.37),
      );
}

export function drawGuides(pen: Pen, state: GuideState, look: Look) {
  const { plan, pixelRatio } = state;
  pen.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    (plan.width / 2) * pixelRatio,
    (plan.height / 2) * pixelRatio,
  );
  pen.clearRect(-plan.width / 2, -plan.height / 2, plan.width, plan.height);
  pen.globalAlpha = look.guideAlpha * state.fade;
  if (pen.globalAlpha <= 0) return;
  pen.lineWidth = 1;
  pen.strokeStyle = look.guide;
  pen.fillStyle = look.guide;
  drawArms(pen, state);
  if (state.plan.shape !== "coil") drawRings(pen, state, look.rings);
  drawDots(pen, state, look.dotsPerArm);
  pen.globalAlpha = 1;
}
