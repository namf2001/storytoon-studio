import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionWord, Scene } from "@storytoon/shared-types";
import { BeVietnamPro } from "./load-font";

/** Groups words into natural, punchy 3-4 word phrases (max ~24 chars) broken at punctuation or pauses. */
function buildSmartPages(words: CaptionWord[]): CaptionWord[][] {
  const pages: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  let currentChars = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const t = w.text;
    current.push(w);
    currentChars += t.length + 1;

    const endsSentence = /[.!?:]$/.test(t);
    const endsComma = /,$/.test(t) && (current.length >= 2 || currentChars >= 12);
    let pauseAfter = false;
    if (i + 1 < words.length) {
      pauseAfter = words[i + 1].startMs - w.endMs > 320;
    }

    const nextIsSentenceEnd =
      i + 1 < words.length && /[.!?:]$/.test(words[i + 1].text);

    let shouldBreak = false;
    if (endsSentence || pauseAfter) {
      shouldBreak = true;
    } else if (endsComma && (current.length >= 3 || currentChars >= 15)) {
      shouldBreak = true;
    } else if (current.length >= 4 && !nextIsSentenceEnd) {
      shouldBreak = true;
    } else if (current.length >= 5) {
      shouldBreak = true;
    } else if (currentChars >= 24) {
      shouldBreak = true;
    }

    if (shouldBreak) {
      pages.push(current);
      current = [];
      currentChars = 0;
    }
  }

  if (current.length > 0) {
    pages.push(current);
  }
  return pages;
}

/** Kinetic captions: groups words into punchy short pages and highlights the active word. */
export const Captions: React.FC<{ words: CaptionWord[]; scenes: Scene[] }> = ({ words, scenes }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const pages = useMemo(() => buildSmartPages(words), [words]);

  const scene = scenes.find((s) => nowMs >= s.startMs && nowMs < s.endMs);
  if (scene && !scene.showCaption) return null;

  const page = pages.find((p) => nowMs >= p[0].startMs && nowMs <= p[p.length - 1].endMs + 250);
  if (!page) return null;

  const portrait = height > width;
  const pageTextLen = page.reduce((sum, w) => sum + w.text.length, 0);

  // Dynamic font sizing: scale down slightly if text is longer, ensuring it NEVER overflows
  const fontSize = portrait
    ? pageTextLen > 22
      ? 46
      : pageTextLen > 16
        ? 50
        : 54
    : pageTextLen > 22
      ? 38
      : 42;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: portrait ? 360 : 70,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: "90%",
          display: "inline-flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: portrait ? "4px 10px" : "4px 8px",
          padding: "10px 22px",
          backgroundColor: "rgba(0, 0, 0, 0.52)",
          borderRadius: 24,
          backdropFilter: "blur(6px)",
          border: "1.5px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.65)",
          textAlign: "center",
          fontFamily: `${BeVietnamPro}, -apple-system, BlinkMacSystemFont, 'Inter', Arial, sans-serif`,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.25,
          textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8)",
          boxSizing: "border-box",
        }}
      >
        {page.map((w, i) => {
          const active = nowMs >= w.startMs && nowMs < w.endMs;
          return (
            <span
              key={i}
              style={{
                color: active ? "#FFD60A" : "#FFFFFF",
                fontWeight: active ? 900 : 800,
                transform: active ? "scale(1.08)" : "scale(1.0)",
                display: "inline-block",
                transition: "transform 0.08s ease, color 0.08s ease",
                textShadow: active
                  ? "0 0 14px rgba(255, 214, 10, 0.6), 0 2px 4px #000"
                  : "0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
