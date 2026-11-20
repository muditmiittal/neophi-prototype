// Small numeric helpers shared by the spiral. No DOM, no graphics library.

export const TAU = Math.PI * 2;

export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

export const lerp = (from: number, to: number, share: number) =>
  from + (to - from) * share;

export const frac = (value: number) => value - Math.floor(value);

/** 0 below `from`, 1 above `to`, an eased S-curve in between. */
export function smooth(from: number, to: number, value: number) {
  const share = clamp((value - from) / (to - from), 0, 1);
  return share * share * (3 - 2 * share);
}

/** Moves `current` toward `target` so that most of the gap closes in `seconds`. */
export function approach(
  current: number,
  target: number,
  seconds: number,
  dt: number,
) {
  if (seconds <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dt / seconds));
}
