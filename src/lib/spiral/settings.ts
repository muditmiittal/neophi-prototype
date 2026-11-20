// Every number that shapes the spiral lives here, with what it does. Pass only the fields you
// want to change to mountSpiral({ settings }); each group is merged over these defaults.

export type SpiralProfile = {
  /** Spiral arms leaving the centre. */
  arms: number;
  /** Revolutions each arm makes before it reaches the screen edge (lower is straighter). */
  turns: number;
  /** Where the drawn spiral ends, as a share of the half-diagonal of the stage. */
  reach: number;
  /** Where cards are born, as a share of the reach. */
  birth: number;
  /** Cards riding the spiral (desktop: at `tunedAreaMpx`, fewer on smaller stages). */
  cards: number;
  /** Tallest a card may grow, as a share of the stage height. */
  cardHeight: number;
};

export type SpiralSettings = {
  /**
   * "disc": cards ride arms out of a centre. "coil": cards ride a cone-shaped spring, narrow at
   * the top and wide at the bottom, and flow down it (turns = revolutions down the whole spring,
   * birth = top radius as a share of the bottom radius, arms = interleaved springs).
   */
  shape: "disc" | "coil";
  /** Coil only: the spring leans toward the viewer from above by this many degrees. */
  coilTiltDeg: number;
  desktop: SpiralProfile;
  /** Used when the stage is narrower than `mobileBelowPx`: fewer arms, fewer cards. */
  mobile: SpiralProfile;
  mobileBelowPx: number;
  /** Stage area, in megapixels, that the desktop card count was tuned for. */
  tunedAreaMpx: number;
  space: {
    /** The disc of the spiral leans away from the viewer by this many degrees. */
    tiltDeg: number;
    /** The centre of the spiral sits this many pixels behind its rim. */
    depthPx: number;
    /** Camera field of view in degrees (narrow is flatter). */
    fovDeg: number;
  };
  motion: {
    /** Seconds a card takes from the centre to the edge. */
    journeySeconds: number;
    /** Extra journeys the cards make for every 1000 pixels the page is scrolled. */
    scrollJourneys: number;
    /** Radians the whole spiral turns for every pixel the page is scrolled (0 keeps it still). */
    scrollTurn: number;
    /** Seconds for one full turn of the whole spiral (negative turns the other way). */
    turnSeconds: number;
    /** Offsets each arm along its journey so cards never line up in rings. */
    armStagger: number;
    /** Gentle floating drift, in pixels, and how long one sway takes. */
    driftPx: number;
    driftSeconds: number;
    /** The opening reveal travels from the centre to the edge in this many seconds. */
    revealSeconds: number;
    /** After a hover ends, the paused card rejoins its place over this many seconds. */
    rejoinSeconds: number;
  };
  pointer: {
    /** How far the pointer's pull reaches, in pixels. */
    reachPx: number;
    /** How far a nearby card moves toward the pointer. */
    pullPx: number;
    /** How far a nearby card lifts toward the viewer. */
    liftPx: number;
  };
  look: {
    /** Share of the gap to its neighbour that a card may fill. */
    fill: number;
    /** Corner radius of a grown card, in pixels. Newborn cards are circles. */
    cornerPx: number;
    /** Newborn cards start at this share of their full size. */
    birthScale: number;
    /** Share of the journey over which a card turns from a circle into its real shape. */
    shapeUntil: number;
    /** Softness at birth (share of the card height) and where on the journey it clears. */
    soften: number;
    softenUntil: number;
    /** Newborn cards are washed with the paper colour until this share of the journey. */
    washUntil: number;
    /** Share of the journey over which a card fades in. */
    fadeUntil: number;
    /** Strength of the hairline around each card (0 hides it). */
    frame: number;
    /** Page colours: the background the cards wash toward, and the hairline. */
    paper: string;
    line: string;
    /** Guide drawing under the cards: arms, rings and travelling dots. */
    guide: string;
    guideAlpha: number;
    rings: number;
    dotsPerArm: number;
  };
  keepOut: {
    /** Clear space kept around the text block, in pixels. */
    padPx: number;
    /** Cards fade over this distance as they near the text block. */
    bandPx: number;
    /** Opacity of a card that passes behind the text block (0 hides it). */
    ghost: number;
  };
  video: {
    /** A video plays only while its card is at least this tall on screen... */
    minHeightPx: number;
    /** ...and its centre is inside this share of the stage, measured from the middle. */
    centreShare: number;
    /** At most this many videos play at once. */
    maxPlaying: number;
  };
  throttle: {
    /** Below this frame rate the spiral sheds cards until it is smooth again. */
    minFps: number;
    shedAfterSeconds: number;
    shedStep: number;
    /** Never show fewer than this share of the cards. */
    floor: number;
    recoverAfterSeconds: number;
    recoverStep: number;
  };
};

export type SpiralOverrides = {
  [Group in keyof SpiralSettings]?: SpiralSettings[Group] extends object
    ? Partial<SpiralSettings[Group]>
    : SpiralSettings[Group];
};

export const DEFAULT_SETTINGS: SpiralSettings = {
  shape: "disc",
  coilTiltDeg: 16,
  desktop: {
    arms: 5,
    turns: 0.9,
    reach: 0.74,
    birth: 0.07,
    cards: 70,
    cardHeight: 0.24,
  },
  mobile: {
    arms: 3,
    turns: 0.65,
    reach: 0.82,
    birth: 0.08,
    cards: 15,
    cardHeight: 0.24,
  },
  mobileBelowPx: 700,
  tunedAreaMpx: 1.5,
  space: { tiltDeg: 24, depthPx: 520, fovDeg: 32 },
  motion: {
    journeySeconds: 95,
    scrollJourneys: 0.35,
    scrollTurn: 0,
    turnSeconds: 420,
    armStagger: 0.62,
    driftPx: 5,
    driftSeconds: 5,
    revealSeconds: 3,
    rejoinSeconds: 6,
  },
  pointer: { reachPx: 280, pullPx: 10, liftPx: 60 },
  look: {
    fill: 0.8,
    cornerPx: 12,
    birthScale: 0.4,
    shapeUntil: 0.32,
    soften: 0.1,
    softenUntil: 0.2,
    washUntil: 0.26,
    fadeUntil: 0.12,
    frame: 0.55,
    paper: "#f3ead9",
    line: "#b8822e",
    guide: "#8c6320",
    guideAlpha: 0.3,
    rings: 5,
    dotsPerArm: 2,
  },
  keepOut: { padPx: 10, bandPx: 48, ghost: 0.14 },
  video: { minHeightPx: 140, centreShare: 0.7, maxPlaying: 2 },
  throttle: {
    minFps: 30,
    shedAfterSeconds: 2,
    shedStep: 0.15,
    floor: 0.3,
    recoverAfterSeconds: 6,
    recoverStep: 0.05,
  },
};

const GROUPS = [
  "desktop",
  "mobile",
  "space",
  "motion",
  "pointer",
  "look",
  "keepOut",
  "video",
  "throttle",
] as const;

/** Fresh settings for one spiral: the defaults with the caller's overrides merged in. */
export function resolveSettings(overrides: SpiralOverrides = {}) {
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS, ...overrides };
  for (const group of GROUPS)
    merged[group] = { ...DEFAULT_SETTINGS[group], ...overrides[group] };
  return merged as SpiralSettings;
}
