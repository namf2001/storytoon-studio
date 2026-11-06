import type { CaptionWord } from "@storytoon/shared-types";

/** A point in the stickman coordinate system (viewBox 0 0 160 220, y down). */
export interface RigPoint {
  x: number;
  y: number;
}

/** One arm in its resting ("idle") pose. The other arm poses are derived from the shoulder. */
export interface RigArm {
  shoulder: RigPoint;
  elbow: RigPoint;
  hand: RigPoint;
}

/** Mouth shapes used for lip-sync. "rest" is the closed line. */
export type StickmanViseme = "rest" | "A" | "I" | "U" | "E" | "O";

/**
 * StickmanRig is the full, JSON-serialisable description of a stickman character.
 * Every coordinate is in viewBox units (0..160 x 0..220).
 */
export interface StickmanRig {
  version: 1;
  name: string;
  gender: "male" | "female";
  style: {
    stroke: string;
    strokeWidth: number;
    skin: string;
    shade: string;
    shadeOpacity: number;
    shirt: string;
    hair: string;
    handRadius: number;
    groundShadow: number;
  };
  head: {
    cx: number;
    cy: number;
    r: number;
    /** Max face-feature shift (px) when the head turns fully left/right. */
    turnShift: number;
    /** Max head roll in degrees. */
    maxTilt: number;
  };
  hair: {
    bun: { enabled: boolean; cx: number; cy: number; r: number };
    fringe: { enabled: boolean; depth: number };
  };
  eyes: {
    left: RigPoint;
    right: RigPoint;
    /** Length of the vertical line eye. */
    height: number;
    /** Radius used by round eye moods (shocked). */
    dotRadius: number;
  };
  brows: {
    enabled: boolean;
    offsetY: number;
    width: number;
  };
  mouth: {
    cx: number;
    cy: number;
    width: number;
    openHeight: number;
  };
  body: {
    /** Center X of the half-ellipse base (default: 80). */
    cx: number;
    /** Bottom baseline Y where the body rests (default: 210). */
    bottomY: number;
    /** Half-width / horizontal radius of the half-ellipse dome (default: 42). */
    rx: number;
    /** Vertical height / vertical radius of the dome (default: 104). */
    ry: number;
    /** Legacy trapezoid coordinates for backwards compatibility with saved rigs. */
    neckLeft?: RigPoint;
    neckRight?: RigPoint;
    footLeft?: RigPoint;
    footRight?: RigPoint;
    bulge?: number;
  };
  arms: {
    left: RigArm;
    right: RigArm;
  };
  motion: {
    bounce: number;
    breathe: number;
    blinkEveryFrames: number;
    blinkFrames: number;
    /** Frames per viseme when lip-sync has no word text to read. */
    talkFramesPerShape: number;
  };
}

/** DEFAULT_MALE_RIG matches the right-hand character of the reference reel. */
export const DEFAULT_MALE_RIG: StickmanRig = {
  version: 1,
  name: "Stickman Nam",
  gender: "male",
  style: {
    stroke: "#1c1c1e",
    strokeWidth: 1,
    skin: "#ffffff",
    shade: "#c7c7cc",
    shadeOpacity: 0.6,
    shirt: "#ffffff",
    hair: "#3f3f46",
    handRadius: 5.5,
    groundShadow: 0.14,
  },
  head: {
    cx: 80,
    cy: 68,
    r: 44,
    turnShift: 10,
    maxTilt: 12,
  },
  hair: {
    bun: {
      enabled: false,
      cx: 32,
      cy: 66,
      r: 18,
    },
    fringe: {
      enabled: false,
      depth: 26,
    },
  },
  eyes: {
    left: {
      x: 66,
      y: 63,
    },
    right: {
      x: 96,
      y: 63,
    },
    height: 13,
    dotRadius: 7,
  },
  brows: {
    enabled: false,
    offsetY: -12,
    width: 12,
  },
  mouth: {
    cx: 81,
    cy: 85,
    width: 24,
    openHeight: 20,
  },
  body: {
    cx: 81,
    bottomY: 190,
    rx: 42,
    ry: 80.5,
    neckLeft: {
      x: 54,
      y: 108,
    },
    neckRight: {
      x: 106,
      y: 108,
    },
    footLeft: {
      x: 39,
      y: 190,
    },
    footRight: {
      x: 123,
      y: 190,
    },
    bulge: 0,
  },
  arms: {
    left: {
      shoulder: {
        x: 53.5,
        y: 129.5,
      },
      elbow: {
        x: 36,
        y: 165,
      },
      hand: {
        x: 8.5,
        y: 133.5,
      },
    },
    right: {
      shoulder: {
        x: 111,
        y: 133.5,
      },
      elbow: {
        x: 145.5,
        y: 145.5,
      },
      hand: {
        x: 140,
        y: 114.5,
      },
    },
  },
  motion: {
    bounce: 2.5,
    breathe: 0.012,
    blinkEveryFrames: 150,
    blinkFrames: 5,
    talkFramesPerShape: 5,
  },
};

/** DEFAULT_FEMALE_RIG matches the left-hand character of the reference reel (bun + fringe). */
export const DEFAULT_FEMALE_RIG: StickmanRig = {
  ...DEFAULT_MALE_RIG,
  name: "Stickman Nữ",
  gender: "female",
  hair: {
    bun: { enabled: true, cx: 32, cy: 66, r: 18 },
    fringe: { enabled: true, depth: 26 },
  },
  brows: { enabled: true, offsetY: -12, width: 12 },
};

/** STICKMAN_PRESETS lists the built-in starting rigs for the editor. */
export const STICKMAN_PRESETS: Record<string, StickmanRig> = {
  male: DEFAULT_MALE_RIG,
  female: DEFAULT_FEMALE_RIG,
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isObject(base) || !isObject(patch)) {
    if (typeof base === "number") return (Number.isFinite(patch) ? patch : base) as T;
    if (typeof base === typeof patch) return patch as T;
    return base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(base as Record<string, unknown>)) {
    if (key in patch) out[key] = deepMerge((base as Record<string, unknown>)[key], patch[key]);
  }
  return out as T;
}

/**
 * parseStickmanRig validates unknown JSON and fills any missing field from the defaults,
 * so rigs saved by older editors keep working.
 */
export function parseStickmanRig(input: unknown): StickmanRig {
  const gender = isObject(input) && input.gender === "female" ? "female" : "male";
  const base = gender === "female" ? DEFAULT_FEMALE_RIG : DEFAULT_MALE_RIG;
  return deepMerge(base, input);
}

function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** visemeForLetter maps a single (diacritic-free) letter to a mouth shape. */
export function visemeForLetter(ch: string): StickmanViseme | null {
  switch (ch) {
    case "a":
      return "A";
    case "e":
      return "E";
    case "i":
    case "y":
      return "I";
    case "o":
      return "O";
    case "u":
    case "w":
      return "U";
    case "m":
    case "b":
    case "p":
      return "rest";
    default:
      return null;
  }
}

/**
 * visemeForTime picks the mouth shape at `timeMs` from Whisper word timestamps.
 * It walks through the letters of the active word proportionally to the elapsed time,
 * so "xin chào" produces I → A → O instead of a fixed loop. Returns "rest" between words.
 */
export function visemeForTime(words: CaptionWord[], timeMs: number): StickmanViseme {
  const word = words.find((w) => timeMs >= w.startMs && timeMs <= w.endMs);
  if (!word) return "rest";
  const letters = stripDiacritics(word.text).replace(/[^a-z]/g, "");
  const shapes: StickmanViseme[] = [];
  for (const ch of letters) {
    const v = visemeForLetter(ch);
    if (v && shapes[shapes.length - 1] !== v) shapes.push(v);
  }
  if (shapes.length === 0) return "E";
  const span = Math.max(1, word.endMs - word.startMs);
  const progress = Math.min(0.999, (timeMs - word.startMs) / span);
  // Close the mouth briefly at the very end of each word for a readable rhythm.
  if (progress > 0.88) return "rest";
  return shapes[Math.floor((progress / 0.88) * shapes.length)] ?? "A";
}
