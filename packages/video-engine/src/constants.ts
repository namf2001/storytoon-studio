import type { AspectRatio } from "@storytoon/shared-types";

export const FPS = 30;
export const COMPOSITION_ID = "StoryVideo";

/** Returns pixel dimensions for an aspect ratio (Full HD). */
export function dimensionsFor(ratio: AspectRatio): { width: number; height: number } {
  return ratio === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
}

/** Converts milliseconds to frames. */
export function msToFrames(ms: number): number {
  return Math.max(1, Math.round((ms / 1000) * FPS));
}
