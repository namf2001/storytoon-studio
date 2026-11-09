import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind classes cleanly using clsx and tailwind-merge. */
/** Strip leading emoji/pictographs from generated labels (chrome uses drawn icons, not emoji). */
export function stripEmoji(label: string): string {
  return label.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").replace(/\s{2,}/g, " ").trim();
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
