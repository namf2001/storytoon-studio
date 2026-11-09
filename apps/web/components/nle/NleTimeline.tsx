"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import {
  Combine,
  Film,
  GripVertical,
  Image as ImageIcon,
  Keyboard,
  Lock,
  LockOpen,
  Magnet,
  MoveHorizontal,
  Maximize2,
  Mic,
  Music,
  Plus,
  Redo2,
  Scissors,
  SkipBack,
  SkipForward,
  Sparkles,
  Subtitles,
  Undo2,
  Volume2,
  VolumeX,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { parseMediaCrop, type Scene } from "@storytoon/shared-types";
import { FPS } from "@storytoon/video-engine";
import { fmtMs } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MediaPoolClip {
  label: string;
  url: string;
  badge?: string;
}

export interface TimelineSfxClip {
  id: string;
  label: string;
  preset: "whoosh" | "pop" | "ding" | "impact" | "swoosh";
  startMs: number;
  durationMs: number;
}

interface TrackHeights {
  v1: number;
  t1: number;
  vo: number;
  sfx: number;
  bgm: number;
}

type TrackKey = keyof TrackHeights;

/** Effective gains (0 = muted) the timeline mixer reports to the player. */
export interface TimelineAudioMix {
  voice: number;
  sfx: number;
  bgm: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 40;
const SNAP_PX = 8;
const RULER_H = 28;
const FRAME_MS = 1000 / FPS;

const clampZoom = (z: number) =>
  Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(z * 100) / 100));

/** HH:MM:SS:FF (hours only when needed) — frame-accurate, like pro NLEs. */
export function fmtTimecode(ms: number): string {
  const totalFrames = Math.max(0, Math.round((ms / 1000) * FPS));
  const ff = totalFrames % FPS;
  const totalSec = Math.floor(totalFrames / FPS);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor(totalSec / 60) % 60;
  const ss = totalSec % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${hh ? `${p(hh)}:` : ""}${p(mm)}:${p(ss)}:${p(ff)}`;
}

/** Candidate ruler intervals: 1f, 2f, 5f, 10f, 0.5s, 1s, 2s, 5s, 10s, 15s, 30s, 1m, 2m, 5m. */
const TICK_STEPS_MS = [
  FRAME_MS, 2 * FRAME_MS, 5 * FRAME_MS, 10 * FRAME_MS, 500, 1000, 2000, 5000,
  10000, 15000, 30000, 60000, 120000, 300000,
];

function pickTickStep(pxPerMs: number, minPx = 72): number {
  return TICK_STEPS_MS.find((s) => s * pxPerMs >= minPx) ?? TICK_STEPS_MS[TICK_STEPS_MS.length - 1];
}

function rulerLabel(ms: number, stepMs: number): string {
  if (stepMs < 1000) return fmtTimecode(ms);
  const s = Math.round(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Next value in a cycle of presets (wraps), so the current custom value still advances. */
function nextPreset(list: number[], current: number): number {
  return list.find((v) => v > current) ?? list[0];
}

const TRACK_LABELS: Record<TrackKey, string> = {
  v1: "V1 (Video)",
  t1: "T1 (Phụ đề)",
  vo: "VO (Giọng đọc)",
  sfx: "SFX (Hiệu ứng)",
  bgm: "BGM (Nhạc nền)",
};

/** Hatched cover that blocks editing on a locked track. */
function LockedOverlay() {
  return (
    <div
      aria-hidden
      title="Track đang khoá"
      className="absolute inset-0 z-[35] cursor-not-allowed"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(0,0,0,0.35) 0 6px, rgba(255,255,255,0.04) 6px 12px)",
      }}
    />
  );
}

const DEFAULT_TRACK_HEIGHTS: TrackHeights = {
  v1: 66,
  t1: 28,
  vo: 36,
  sfx: 30,
  bgm: 32,
};

const SFX_PRESETS: Array<{
  preset: TimelineSfxClip["preset"];
  label: string;
  badgeColor: string;
}> = [
  {
    preset: "whoosh",
    label: "Whoosh",
    badgeColor: "border-primary/60 bg-primary/25 text-primary-text",
  },
  {
    preset: "pop",
    label: "Pop",
    badgeColor: "border-primary/60 bg-primary/25 text-primary-text",
  },
  {
    preset: "ding",
    label: "Ding",
    badgeColor: "border-primary/60 bg-primary/25 text-primary-text",
  },
  {
    preset: "impact",
    label: "Impact",
    badgeColor: "border-rose-400/70 bg-rose-950/75 text-rose-200",
  },
  {
    preset: "swoosh",
    label: "Swoosh",
    badgeColor: "border-primary/60 bg-primary/25 text-primary-text",
  },
];

interface Props {
  scenes: Scene[];
  durationMs: number;
  nowMs: number;
  selectedSceneId: string | null;
  onSelectScene: (sc: Scene) => void;
  onSeek: (ms: number) => void;
  audioUrl?: string | null;
  bgmUrl?: string | null;
  onResizeSceneBoundary?: (
    leftSceneId: string,
    rightSceneId: string,
    newBoundaryMs: number
  ) => void;
  onResizeSceneBoundaryEnd?: (
    leftSceneId: string,
    rightSceneId: string,
    newBoundaryMs: number
  ) => void;
  onDropMediaOnScene?: (
    sceneId: string,
    mediaUrl: string,
    isLocalClip: boolean
  ) => void;
  onSplitAtPlayhead?: () => void;
  onAddScene?: () => void;
  onMergeSelectedWithNext?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Delete the selected scene (Delete / Backspace when no SFX clip is selected). */
  onDeleteScene?: (sceneId: string) => void;
  /** Reports the track mixer (mute + volume) so the preview player can follow it. */
  onAudioMixChange?: (mix: TimelineAudioMix) => void;
  /** Starting BGM gain (0–1), e.g. the composition's configured bgmVolume. */
  initialBgmVolume?: number;
}

/**
 * DaVinci Resolve / CapCut Pro style multi-track timeline:
 * - Resizable track heights (V1, T1, VO, SFX, BGM)
 * - Resizable clip boundaries on V1, T1, VO
 * - Separate audio tracks for Voiceover (VO), Sound Effects (SFX), and Background Music (BGM)
 */
export function NleTimeline({
  scenes,
  durationMs,
  nowMs,
  selectedSceneId,
  onSelectScene,
  onSeek,
  audioUrl,
  bgmUrl,
  onResizeSceneBoundary,
  onResizeSceneBoundaryEnd,
  onDropMediaOnScene,
  onSplitAtPlayhead,
  onAddScene,
  onMergeSelectedWithNext,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onDeleteScene,
  onAudioMixChange,
  initialBgmVolume = 0.15,
}: Props) {
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const bgmWaveformContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const bgmWavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(
    null
  );
  const draggingPlayheadRef = useRef(false);

  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const [bgmWaveformReady, setBgmWaveformReady] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hoverLineRef = useRef<HTMLDivElement>(null);
  const hoverLabelRef = useRef<HTMLSpanElement>(null);
  const zoomAnchorRef = useRef<{ ms: number; offsetX: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapLineMs, setSnapLineMs] = useState<number | null>(null);
  const [lockedTracks, setLockedTracks] = useState<Set<TrackKey>>(() => new Set());
  const [selectedSfxId, setSelectedSfxId] = useState<string | null>(null);

  // Resizable track heights
  const [trackHeights, setTrackHeights] = useState<TrackHeights>(
    DEFAULT_TRACK_HEIGHTS
  );

  // Separate Track Mute & Volume states (VO, SFX, BGM)
  const [voMuted, setVoMuted] = useState(false);
  const [voVolume, setVoVolume] = useState(100);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(85);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(() => Math.round(initialBgmVolume * 100));

  const totalMs = Math.max(
    durationMs,
    scenes.reduce((m, s) => Math.max(m, s.endMs), 1000)
  );

  // SFX Clips state (derived initially from scene transitions, editable/resizable by user)
  const [sfxClips, setSfxClips] = useState<TimelineSfxClip[]>([]);
  const lastSceneSignatureRef = useRef<string>("");

  useEffect(() => {
    const sig = scenes.map((s) => `${s.id}:${s.transition}`).join("|");
    if (sig === lastSceneSignatureRef.current) return;
    lastSceneSignatureRef.current = sig;

    if (scenes.length === 0) {
      setSfxClips([]);
      return;
    }

    const generated: TimelineSfxClip[] = [];
    scenes.forEach((sc, idx) => {
      if (idx === 0) {
        generated.push({
          id: `sfx-hook-${sc.id}`,
          label: "Hook Ding",
          preset: "ding",
          startMs: Math.min(100, Math.max(0, sc.startMs)),
          durationMs: Math.min(1100, Math.max(500, sc.endMs - sc.startMs)),
        });
      } else {
        const trans = sc.transition || "cut";
        const preset: TimelineSfxClip["preset"] =
          trans === "slide"
            ? "swoosh"
            : trans === "fade"
              ? "whoosh"
              : trans === "flip"
                ? "pop"
                : trans === "wipe"
                  ? "whoosh"
                  : "impact";
        const label =
          trans === "slide"
            ? "Slide Swoosh"
            : trans === "fade"
              ? "Fade Whoosh"
              : trans === "flip"
                ? "Flip Pop"
                : trans === "wipe"
                  ? "Wipe Whoosh"
                  : "Cut Impact";
        const startMs = Math.max(0, sc.startMs - 250);
        const durationMs = Math.min(1200, Math.max(600, totalMs - startMs));
        generated.push({
          id: `sfx-trans-${sc.id}`,
          label,
          preset,
          startMs,
          durationMs,
        });
      }
    });
    setSfxClips(generated);
  }, [scenes, totalMs]);

  // BGM Trim Range state (startMs -> endMs)
  const [bgmRange, setBgmRange] = useState<{
    startMs: number;
    endMs: number;
    customized: boolean;
  }>({
    startMs: 0,
    endMs: totalMs,
    customized: false,
  });

  useEffect(() => {
    setBgmRange((prev) => ({
      startMs: prev.customized ? Math.min(prev.startMs, totalMs - 1000) : 0,
      endMs: prev.customized ? Math.min(Math.max(prev.endMs, 1000), totalMs) : totalMs,
      customized: prev.customized,
    }));
  }, [totalMs]);

  // Live floating badge while resizing any clip boundary
  const [resizeIndicator, setResizeIndicator] = useState<{
    pct: number;
    text: string;
  } | null>(null);

  // Scene boundary trim ref (used by V1, T1, and VO tracks)
  const trimmingRef = useRef<{
    leftSceneId: string;
    rightSceneId: string;
    leftSceneIndex: number;
    rightSceneIndex: number;
    leftStartMs: number;
    rightEndMs: number;
    minMs: number;
    maxMs: number;
    currentBoundaryMs: number;
  } | null>(null);

  // SFX drag / resize ref
  const sfxDragRef = useRef<{
    clipId: string;
    mode: "move" | "resize-left" | "resize-right";
    initialStartMs: number;
    initialDurationMs: number;
    pointerStartMs: number;
  } | null>(null);

  // BGM drag / resize ref
  const bgmDragRef = useRef<{
    mode: "move" | "resize-left" | "resize-right";
    initialStartMs: number;
    initialEndMs: number;
    pointerStartMs: number;
  } | null>(null);

  // Vertical track height resize ref
  const trackResizeRef = useRef<{
    track: keyof TrackHeights;
    startY: number;
    startHeight: number;
    minHeight: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    function handleGlobalPointerMove(e: PointerEvent) {
      if (trackResizeRef.current) {
        const { track, startY, startHeight, minHeight, maxHeight } =
          trackResizeRef.current;
        const deltaY = e.clientY - startY;
        const nextHeight = Math.max(
          minHeight,
          Math.min(maxHeight, Math.round(startHeight + deltaY))
        );
        setTrackHeights((prev) => ({
          ...prev,
          [track]: nextHeight,
        }));
      }
    }

    function handleGlobalPointerUp() {
      draggingPlayheadRef.current = false;
      sfxDragRef.current = null;
      bgmDragRef.current = null;
      trackResizeRef.current = null;
      setResizeIndicator(null);
      setSnapLineMs(null);

      if (trimmingRef.current) {
        const { leftSceneId, rightSceneId, currentBoundaryMs } =
          trimmingRef.current;
        trimmingRef.current = null;
        onResizeSceneBoundaryEnd?.(leftSceneId, rightSceneId, currentBoundaryMs);
      }
    }

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, [onResizeSceneBoundaryEnd]);

  const playheadPct = Math.max(0, Math.min(100, (nowMs / totalMs) * 100));

  // ---------- Viewport size, zoom (anchored), wheel zoom, follow playhead ----------
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const contentWidth = Math.max(1, viewportWidth * timelineZoom);
  const pxPerMs = contentWidth / totalMs;

  /** Zoom while keeping the time under `anchorClientX` (or the playhead / centre) fixed on screen. */
  function applyZoom(next: number, anchorClientX?: number) {
    const z = clampZoom(next);
    const sc = scrollerRef.current;
    if (sc) {
      const rect = sc.getBoundingClientRect();
      const width = sc.clientWidth * timelineZoom;
      let offsetX: number;
      if (anchorClientX !== undefined) {
        offsetX = anchorClientX - rect.left;
      } else {
        const playX = (nowMs / totalMs) * width - sc.scrollLeft;
        offsetX = playX >= 0 && playX <= sc.clientWidth ? playX : sc.clientWidth / 2;
      }
      zoomAnchorRef.current = { ms: ((sc.scrollLeft + offsetX) / width) * totalMs, offsetX };
    }
    setTimelineZoom(z);
  }
  const applyZoomRef = useRef(applyZoom);
  applyZoomRef.current = applyZoom;
  const zoomRef = useRef(timelineZoom);
  zoomRef.current = timelineZoom;

  useLayoutEffect(() => {
    const a = zoomAnchorRef.current;
    const sc = scrollerRef.current;
    if (!a || !sc) return;
    zoomAnchorRef.current = null;
    sc.scrollLeft = Math.max(0, (a.ms / totalMs) * sc.clientWidth * timelineZoom - a.offsetX);
  }, [timelineZoom, totalMs]);

  // ⌘/Ctrl + wheel (and trackpad pinch) zooms around the cursor; plain wheel scrolls tracks.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      applyZoomRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.0025), e.clientX);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Page-turn the view when the playhead leaves it (playback / keyboard stepping).
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || draggingPlayheadRef.current || zoomRef.current <= 1) return;
    const x = (nowMs / totalMs) * sc.clientWidth * zoomRef.current;
    if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 16) {
      sc.scrollLeft = Math.max(0, x - sc.clientWidth * 0.15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs]);

  // ---------- Snapping (magnet) ----------
  const snapTargets = useMemo(() => {
    const t: { key: string; ms: number }[] = [
      { key: "start", ms: 0 },
      { key: "end", ms: totalMs },
      { key: "playhead", ms: nowMs },
      { key: "bgm:s", ms: bgmRange.startMs },
      { key: "bgm:e", ms: bgmRange.endMs },
    ];
    for (const sc of scenes) {
      t.push({ key: `scene:${sc.id}:s`, ms: sc.startMs }, { key: `scene:${sc.id}:e`, ms: sc.endMs });
    }
    for (const c of sfxClips) {
      t.push({ key: `sfx:${c.id}:s`, ms: c.startMs }, { key: `sfx:${c.id}:e`, ms: c.startMs + c.durationMs });
    }
    return t;
  }, [scenes, sfxClips, bgmRange, nowMs, totalMs]);

  /** Nearest snap target within SNAP_PX of `ms`, or null. */
  function findSnap(ms: number, exclude: string[] = []): number | null {
    if (!snapEnabled) return null;
    const width = trackContainerRef.current?.clientWidth || contentWidth;
    const threshold = SNAP_PX / (width / totalMs);
    let best: number | null = null;
    let bestD = threshold;
    for (const t of snapTargets) {
      if (exclude.includes(t.key)) continue;
      const d = Math.abs(t.ms - ms);
      if (d < bestD) {
        bestD = d;
        best = t.ms;
      }
    }
    return best;
  }

  /** Snap a moving [start, start+dur) range by whichever edge is closer to a target. */
  function snapRange(start: number, dur: number, exclude: string[]): number {
    const a = findSnap(start, exclude);
    const b = findSnap(start + dur, exclude);
    if (a !== null && (b === null || Math.abs(a - start) <= Math.abs(b - start - dur))) {
      setSnapLineMs(a);
      return a;
    }
    if (b !== null) {
      setSnapLineMs(b);
      return b - dur;
    }
    setSnapLineMs(null);
    return start;
  }

  function snapPoint(ms: number, exclude: string[]): number {
    const hit = findSnap(ms, exclude);
    setSnapLineMs(hit);
    return hit ?? ms;
  }

  // ---------- Track lock ----------
  const isLocked = (t: TrackKey) => lockedTracks.has(t);
  function toggleLock(t: TrackKey) {
    setLockedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  // ---------- Mixer → player ----------
  useEffect(() => {
    onAudioMixChange?.({
      voice: voMuted ? 0 : voVolume / 100,
      sfx: sfxMuted ? 0 : sfxVolume / 100,
      bgm: bgmMuted ? 0 : bgmVolume / 100,
    });
  }, [voMuted, voVolume, sfxMuted, sfxVolume, bgmMuted, bgmVolume, onAudioMixChange]);

  // ---------- Keyboard (NLE-style; ignored while typing or inside menus/dialogs) ----------
  const editPoints = useMemo(
    () => Array.from(new Set([0, ...scenes.map((s) => s.startMs), totalMs])).sort((a, b) => a - b),
    [scenes, totalMs]
  );
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.closest('[role="listbox"],[role="menu"],[role="dialog"],[role="slider"],[role="tablist"]'))
    ) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case "=":
      case "+":
        applyZoom(timelineZoom * 1.5);
        break;
      case "-":
      case "_":
        applyZoom(timelineZoom / 1.5);
        break;
      case "\\":
        applyZoom(1);
        break;
      case "n":
      case "N":
        setSnapEnabled((v) => !v);
        break;
      case "Home":
        onSeek(0);
        break;
      case "End":
        onSeek(totalMs);
        break;
      case "ArrowUp": {
        const prev = [...editPoints].reverse().find((p) => p < nowMs - FRAME_MS / 2);
        onSeek(prev ?? 0);
        break;
      }
      case "ArrowDown": {
        const next = editPoints.find((p) => p > nowMs + FRAME_MS / 2);
        onSeek(next ?? totalMs);
        break;
      }
      case "Delete":
      case "Backspace":
        if (selectedSfxId && !isLocked("sfx")) {
          handleDeleteSfxClip(selectedSfxId);
          setSelectedSfxId(null);
        } else if (selectedSceneId && onDeleteScene && !isLocked("v1")) {
          onDeleteScene(selectedSceneId);
        } else {
          return;
        }
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function showHover(clientX: number) {
    const el = trackContainerRef.current;
    const line = hoverLineRef.current;
    if (!el || !line) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    line.style.transform = `translateX(${x}px)`;
    line.style.opacity = "1";
    if (hoverLabelRef.current) hoverLabelRef.current.textContent = fmtTimecode((x / rect.width) * totalMs);
  }
  function hideHover() {
    if (hoverLineRef.current) hoverLineRef.current.style.opacity = "0";
  }

  // Initialize WaveSurfer real audio waveform on Track VO (Voiceover)
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (!container || !audioUrl) {
      setWaveformReady(false);
      return;
    }

    setWaveformReady(false);
    const regions = RegionsPlugin.create();
    regionsPluginRef.current = regions;

    const ws = WaveSurfer.create({
      container,
      height: Math.max(20, trackHeights.vo - 8),
      waveColor: "#2f7d61",
      progressColor: "#3f9b78",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      interact: false,
      url: audioUrl,
      plugins: [regions],
    });

    ws.on("ready", () => {
      setWaveformReady(true);
    });
    ws.on("error", () => {
      setWaveformReady(false);
    });

    wavesurferRef.current = ws;
    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
    };
  }, [audioUrl]);

  // Initialize WaveSurfer waveform on Track BGM (Background Music)
  useEffect(() => {
    const container = bgmWaveformContainerRef.current;
    if (!container || !bgmUrl) {
      setBgmWaveformReady(false);
      return;
    }

    setBgmWaveformReady(false);
    const ws = WaveSurfer.create({
      container,
      height: Math.max(18, trackHeights.bgm - 8),
      waveColor: "#2b6f7a",
      progressColor: "#3b8f9c",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      interact: false,
      url: bgmUrl,
    });

    ws.on("ready", () => {
      setBgmWaveformReady(true);
    });
    ws.on("error", () => {
      setBgmWaveformReady(false);
    });

    bgmWavesurferRef.current = ws;
    return () => {
      ws.destroy();
      bgmWavesurferRef.current = null;
    };
  }, [bgmUrl]);

  // Sync Scene boundaries onto WaveSurfer RegionsPlugin when VO waveform is ready
  useEffect(() => {
    const regions = regionsPluginRef.current;
    if (!regions || !waveformReady) return;
    regions.clearRegions();
    scenes.forEach((sc) => {
      const isSel = sc.id === selectedSceneId;
      regions.addRegion({
        id: sc.id,
        start: sc.startMs / 1000,
        end: sc.endMs / 1000,
        color: isSel ? "rgba(245, 158, 11, 0.22)" : "rgba(16, 185, 129, 0.08)",
        drag: false,
        resize: false,
      });
    });
  }, [scenes, selectedSceneId, waveformReady]);

  function clientXToMs(clientX: number): number {
    const el = trackContainerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * totalMs);
  }

  function seekFromClientX(clientX: number) {
    onSeek(clientXToMs(clientX));
  }

  function startSceneBoundaryTrim(
    e: React.PointerEvent<HTMLDivElement>,
    sc: Scene,
    nextScene: Scene
  ) {
    if (!onResizeSceneBoundary) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    trimmingRef.current = {
      leftSceneId: sc.id,
      rightSceneId: nextScene.id,
      leftSceneIndex: sc.sceneIndex,
      rightSceneIndex: nextScene.sceneIndex,
      leftStartMs: sc.startMs,
      rightEndMs: nextScene.endMs,
      minMs: sc.startMs + 600,
      maxMs: nextScene.endMs - 600,
      currentBoundaryMs: sc.endMs,
    };
    const leftDur = ((sc.endMs - sc.startMs) / 1000).toFixed(1);
    const rightDur = ((nextScene.endMs - sc.endMs) / 1000).toFixed(1);
    setResizeIndicator({
      pct: (sc.endMs / totalMs) * 100,
      text: `Cảnh #${sc.sceneIndex}: ${leftDur}s  ⇄  Cảnh #${nextScene.sceneIndex}: ${rightDur}s`,
    });
  }

  function startVerticalTrackResize(
    e: React.PointerEvent<HTMLDivElement>,
    track: keyof TrackHeights,
    minHeight: number,
    maxHeight: number
  ) {
    e.stopPropagation();
    e.preventDefault();
    trackResizeRef.current = {
      track,
      startY: e.clientY,
      startHeight: trackHeights[track],
      minHeight,
      maxHeight,
    };
  }

  function handleAddSfxAtPlayhead() {
    const startMs = Math.max(0, Math.min(totalMs - 600, nowMs));
    const durationMs = Math.min(1200, Math.max(500, totalMs - startMs));
    const newClip: TimelineSfxClip = {
      id: `sfx-custom-${Date.now()}`,
      label: "Whoosh",
      preset: "whoosh",
      startMs,
      durationMs,
    };
    setSfxClips((prev) => [...prev, newClip]);
  }

  function handleCycleSfxPreset(clipId: string) {
    setSfxClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        const idx = SFX_PRESETS.findIndex((p) => p.preset === c.preset);
        const next = SFX_PRESETS[(idx + 1) % SFX_PRESETS.length];
        return {
          ...c,
          preset: next.preset,
          label: next.label,
        };
      })
    );
  }

  function handleDeleteSfxClip(clipId: string) {
    setSfxClips((prev) => prev.filter((c) => c.id !== clipId));
  }

  // Adaptive ruler: major interval keeps labels >= 72px apart at any zoom;
  // minor ticks are drawn with a repeating gradient (no DOM per tick).
  const majorStepMs = pickTickStep(pxPerMs);
  const minorDiv = majorStepMs <= 2 * FRAME_MS ? 1 : majorStepMs * pxPerMs >= 140 ? 10 : 5;
  const minorPx = (majorStepMs / minorDiv) * pxPerMs;
  const ticks =
    viewportWidth === 0
      ? []
      : Array.from({ length: Math.floor(totalMs / majorStepMs) + 1 }, (_, i) => {
          const ms = i * majorStepMs;
          return { ms, pct: (ms / totalMs) * 100 };
        });

  const selectedIdx = scenes.findIndex((s) => s.id === selectedSceneId);

  function stepScene(delta: number) {
    if (scenes.length === 0) return;
    const nextIdx = Math.max(
      0,
      Math.min(scenes.length - 1, (selectedIdx >= 0 ? selectedIdx : 0) + delta)
    );
    const target = scenes[nextIdx];
    onSelectScene(target);
    onSeek(target.startMs);
  }

  const isCustomHeight =
    trackHeights.v1 !== DEFAULT_TRACK_HEIGHTS.v1 ||
    trackHeights.t1 !== DEFAULT_TRACK_HEIGHTS.t1 ||
    trackHeights.vo !== DEFAULT_TRACK_HEIGHTS.vo ||
    trackHeights.sfx !== DEFAULT_TRACK_HEIGHTS.sfx ||
    trackHeights.bgm !== DEFAULT_TRACK_HEIGHTS.bgm;

  return (
    <div className="flex h-full w-full flex-col bg-surface-2 select-none overflow-hidden">
      {/* Timeline Top Transport, Tools & Shortcut Hints */}
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-zinc-800/90 bg-surface-3 px-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">
            Timeline <span className="font-mono text-muted-foreground">· {scenes.length} cảnh</span>
          </span>

          <div className="h-3 w-px bg-zinc-800" />

          {/* Prev / Next Scene */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Cảnh trước"
                  type="button"
                  onClick={() => stepScene(-1)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <SkipBack className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Cảnh trước</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Cảnh tiếp theo"
                  type="button"
                  onClick={() => stepScene(1)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <SkipForward className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Cảnh tiếp theo</TooltipContent>
            </Tooltip>
          </div>

          {/* Split at Playhead Tool */}
          {onSplitAtPlayhead && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Tách cảnh tại Playhead (Phím tắt: S)"
                  type="button"
                  onClick={onSplitAtPlayhead}
                  className="flex h-5 w-6 items-center justify-center rounded border border-zinc-700/80 bg-zinc-800/90 text-zinc-200 hover:border-primary/60 hover:text-primary-text"
                >
                  <Scissors className="h-3 w-3 text-primary-text" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Tách cảnh tại Playhead (Phím tắt: S)
              </TooltipContent>
            </Tooltip>
          )}

          {/* Merge with Next */}
          {onMergeSelectedWithNext && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Gộp với cảnh kế tiếp (Phím tắt: M)"
                  type="button"
                  onClick={onMergeSelectedWithNext}
                  className="flex h-5 w-6 items-center justify-center rounded border border-zinc-700/80 bg-zinc-800/90 text-zinc-200 hover:border-primary/60 hover:text-primary-text"
                >
                  <Combine className="h-3 w-3 text-primary-text" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Gộp với cảnh kế tiếp (Phím tắt: M)
              </TooltipContent>
            </Tooltip>
          )}

          {/* Add Scene */}
          {onAddScene && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Thêm cảnh mới vào timeline"
                  type="button"
                  onClick={onAddScene}
                  className="flex h-5 w-6 items-center justify-center rounded border border-zinc-700/80 bg-zinc-800/90 text-zinc-200 hover:border-primary/60 hover:text-primary-text"
                >
                  <Plus className="h-3 w-3 text-primary-text" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Thêm cảnh mới vào timeline
              </TooltipContent>
            </Tooltip>
          )}

          {/* Add SFX at Playhead */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleAddSfxAtPlayhead}
                className="flex h-5 items-center gap-1 rounded border border-primary/40 bg-primary/25 px-1.5 text-xs font-medium text-primary-text hover:border-primary/60 hover:bg-primary/25"
              >
                <Zap className="h-2.5 w-2.5 text-primary-text" />
                <span className="hidden md:inline">+SFX</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Chèn hiệu ứng âm thanh (SFX) tại vị trí Playhead hiện tại
            </TooltipContent>
          </Tooltip>

          {/* Undo / Redo */}
          {(onUndo || onRedo) && (
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Hoàn tác (⌘Z / Ctrl+Z)"
                    type="button"
                    disabled={!canUndo}
                    onClick={onUndo}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
                  >
                    <Undo2 className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Hoàn tác (⌘Z / Ctrl+Z)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Làm lại (⌘⇧Z / Ctrl+Shift+Z)"
                    type="button"
                    disabled={!canRedo}
                    onClick={onRedo}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
                  >
                    <Redo2 className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Làm lại (⌘⇧Z / Ctrl+Shift+Z)
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Reset Track Heights button when customized */}
          {isCustomHeight && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setTrackHeights(DEFAULT_TRACK_HEIGHTS)}
                  className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-xs text-primary-text hover:border-primary/60"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                  <span>Reset cao độ</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Đặt lại chiều cao mặc định cho tất cả các Track
              </TooltipContent>
            </Tooltip>
          )}

          {/* Sleek Tooltip-driven Keyboard Shortcuts popover */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              >
                <Keyboard className="h-3 w-3 text-zinc-400" />
                <span className="hidden xl:inline">Phím tắt & Mẹo</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="w-72 space-y-1.5 p-2.5 text-xs bg-zinc-900 border-zinc-800 shadow-xl"
            >
              <div className="font-bold text-primary-text border-b border-zinc-800 pb-1">
                Phím tắt & Thao tác Resize Timeline
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Phát / Tạm dừng:</span>
                <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-primary-text">
                  Space
                </kbd>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Kéo ranh giới 2 cảnh (V1/T1/VO):</span>
                <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-primary-text">
                  Kéo vạch ‖
                </kbd>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Chỉnh độ cao từng Track:</span>
                <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-primary-text">
                  Kéo mép dưới Track
                </kbd>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Resize SFX / BGM:</span>
                <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-primary-text">
                  Kéo 2 đầu mút
                </kbd>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Tách / Gộp cảnh:</span>
                <kbd className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-primary-text">
                  S / M
                </kbd>
              </div>
              {[
                ["Lùi / tiến 1 khung hình", "← / →"],
                ["Về điểm cắt trước / sau", "↑ / ↓"],
                ["Đầu / cuối timeline", "Home / End"],
                ["Phóng to / thu nhỏ / vừa khung", "= / - / \\"],
                ["Zoom quanh con trỏ", "⌘/Ctrl + lăn"],
                ["Bật/tắt hút dính", "N"],
                ["Xoá clip SFX / cảnh đang chọn", "Delete"],
              ].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between text-zinc-300">
                  <span>{label}:</span>
                  <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-primary-text">
                    {key}
                  </kbd>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3">
          {/* Snapping (magnet) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Bật/tắt hút dính (N)"
                aria-pressed={snapEnabled}
                onClick={() => setSnapEnabled((v) => !v)}
                className={cn(
                  "flex h-5 items-center gap-1 rounded border px-1.5 text-xs font-medium transition-colors",
                  snapEnabled
                    ? "border-primary/60 bg-primary/15 text-primary-text"
                    : "border-zinc-800 bg-zinc-900/80 text-muted-foreground hover:text-zinc-300"
                )}
              >
                <Magnet className="h-3 w-3" />
                <span className="hidden lg:inline">Hút dính</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Hút dính vào đầu phát, ranh giới cảnh và clip khác (N)
            </TooltipContent>
          </Tooltip>

          {/* Horizontal zoom: log slider, ⌘/Ctrl + wheel, = / - / \\ */}
          <div className="hidden sm:flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5">
            <button
              aria-label="Thu nhỏ Timeline (-)"
              type="button"
              onClick={() => applyZoom(timelineZoom / 1.5)}
              disabled={timelineZoom <= MIN_ZOOM}
              className="text-zinc-400 hover:text-white disabled:opacity-30"
              title="Thu nhỏ Timeline (-)"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((Math.log(timelineZoom / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM)) * 100)}
              onChange={(e) =>
                applyZoom(MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, Number(e.target.value) / 100))
              }
              aria-label="Mức thu phóng Timeline"
              className="h-1 w-20 cursor-pointer accent-primary"
              title={`Thu phóng ${timelineZoom}x · ⌘/Ctrl + lăn chuột để zoom quanh con trỏ`}
            />
            <button
              aria-label="Phóng to Timeline (=)"
              type="button"
              onClick={() => applyZoom(timelineZoom * 1.5)}
              disabled={timelineZoom >= MAX_ZOOM}
              className="text-zinc-400 hover:text-white disabled:opacity-30"
              title="Phóng to Timeline (=)"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(1)}
              aria-label="Vừa khung (\)"
              className="ml-0.5 flex items-center gap-0.5 rounded bg-zinc-800 px-1 font-mono text-xs text-primary-text hover:bg-zinc-700"
              title="Vừa khung toàn bộ timeline (\)"
            >
              <MoveHorizontal className="h-2.5 w-2.5" />
              {timelineZoom < 10 ? timelineZoom.toFixed(1) : Math.round(timelineZoom)}x
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
            <span className="text-muted-foreground">Tổng</span>
            <span className="text-zinc-300">{fmtTimecode(totalMs)}</span>
          </div>
        </div>
      </div>

      {/* Main Multi-Track Area (Synchronized Vertical Scroll + Resizable Track Rows) */}
      <div className="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Left Track Headers Column (96px) */}
        <div className="flex w-32 shrink-0 flex-col border-r border-zinc-800 bg-surface-3 text-xs font-mono text-zinc-400">
          {/* Current timecode (Premiere-style, above the track headers) */}
          <div
            style={{ height: RULER_H }}
            className="sticky top-0 z-30 flex shrink-0 items-center border-b border-zinc-800/90 bg-surface-3 px-2"
            aria-live="off"
          >
            <span className="font-mono text-[13px] font-semibold tabular-nums tracking-tight text-red-400">
              {fmtTimecode(nowMs)}
            </span>
          </div>

          {/* 1. V1 Header (Video) */}
          <div
            style={{ height: trackHeights.v1 }}
            className="group/th relative flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-2"
          >
            <span className="flex items-center gap-1 font-semibold text-sky-400">
              <Film className="h-3 w-3 shrink-0" />
              <span>V1</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="rounded bg-sky-500/15 px-1 text-xs text-sky-300">
                {scenes.length}
              </span>
              <button
                type="button"
                onClick={() => toggleLock("v1")}
                aria-pressed={isLocked("v1")}
                aria-label={isLocked("v1") ? `Mở khoá ${TRACK_LABELS.v1}` : `Khoá ${TRACK_LABELS.v1}`}
                title={isLocked("v1") ? "Mở khoá track" : "Khoá track (chặn chỉnh sửa)"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  isLocked("v1") ? "bg-zinc-200/15 text-zinc-100" : "text-muted-foreground hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                {isLocked("v1") ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
              </button>
            </div>
            {/* Bottom vertical resize handle */}
            <div
              title="Kéo lên/xuống để chỉnh độ cao Track V1 (Video)"
              onPointerDown={(e) => startVerticalTrackResize(e, "v1", 46, 180)}
              className="absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize bg-transparent hover:bg-sky-400/60 active:bg-sky-400 transition-colors"
            />
          </div>

          {/* 2. T1 Header (Subtitles) */}
          <div
            style={{ height: trackHeights.t1 }}
            className="group/th relative flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-2 text-amber-300"
          >
            <span className="flex items-center gap-1 font-semibold truncate">
              <Subtitles className="h-3 w-3 shrink-0" />
              <span>T1 · SUB</span>
            </span>
            <button
                type="button"
                onClick={() => toggleLock("t1")}
                aria-pressed={isLocked("t1")}
                aria-label={isLocked("t1") ? `Mở khoá ${TRACK_LABELS.t1}` : `Khoá ${TRACK_LABELS.t1}`}
                title={isLocked("t1") ? "Mở khoá track" : "Khoá track (chặn chỉnh sửa)"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  isLocked("t1") ? "bg-zinc-200/15 text-zinc-100" : "text-muted-foreground hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                {isLocked("t1") ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
              </button>
            <div
              title="Kéo lên/xuống để chỉnh độ cao Track T1 (Phụ đề)"
              onPointerDown={(e) => startVerticalTrackResize(e, "t1", 22, 84)}
              className="absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize bg-transparent hover:bg-amber-400/60 active:bg-amber-400 transition-colors"
            />
          </div>

          {/* 3. VO Header (Voiceover) */}
          <div
            style={{ height: trackHeights.vo }}
            className="group/th relative flex shrink-0 items-center justify-between border-b border-zinc-800/80 bg-emerald-950/15 px-2 text-emerald-400"
          >
            <span className="flex items-center gap-1 font-semibold truncate">
              <Mic className="h-3 w-3 shrink-0" />
              <span>VO</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleLock("vo")}
                aria-pressed={isLocked("vo")}
                aria-label={isLocked("vo") ? `Mở khoá ${TRACK_LABELS.vo}` : `Khoá ${TRACK_LABELS.vo}`}
                title={isLocked("vo") ? "Mở khoá track" : "Khoá track (chặn chỉnh sửa)"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  isLocked("vo") ? "bg-zinc-200/15 text-zinc-100" : "text-muted-foreground hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                {isLocked("vo") ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
              </button>
              <button
                type="button"
                onClick={() => setVoVolume((v) => nextPreset([50, 75, 100, 120], v))}
                title="Đổi âm lượng Voiceover (50% / 75% / 100% / 120%)"
                className="rounded bg-emerald-950/80 border border-emerald-700/40 px-1 text-xs text-emerald-300 hover:border-emerald-400"
              >
                {voMuted ? "0%" : `${voVolume}%`}
              </button>
              <button
                type="button"
                onClick={() => setVoMuted((m) => !m)}
                title={voMuted ? "Bật tiếng Voiceover" : "Tắt tiếng Voiceover"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  voMuted
                    ? "bg-red-500/20 text-red-400"
                    : "text-emerald-400 hover:bg-emerald-900/40"
                )}
              >
                {voMuted ? (
                  <VolumeX className="h-2.5 w-2.5" />
                ) : (
                  <Volume2 className="h-2.5 w-2.5" />
                )}
              </button>
            </div>
            <div
              title="Kéo lên/xuống để chỉnh độ cao Track VO (Voiceover)"
              onPointerDown={(e) => startVerticalTrackResize(e, "vo", 26, 110)}
              className="absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize bg-transparent hover:bg-emerald-400/60 active:bg-emerald-400 transition-colors"
            />
          </div>

          {/* 4. SFX Header (Sound Effects) */}
          <div
            style={{ height: trackHeights.sfx }}
            className="group/th relative flex shrink-0 items-center justify-between border-b border-zinc-800/80 bg-purple-950/15 px-2 text-purple-300"
          >
            <span className="flex items-center gap-1 font-semibold truncate">
              <Zap className="h-3 w-3 shrink-0 text-purple-400" />
              <span>SFX</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleLock("sfx")}
                aria-pressed={isLocked("sfx")}
                aria-label={isLocked("sfx") ? `Mở khoá ${TRACK_LABELS.sfx}` : `Khoá ${TRACK_LABELS.sfx}`}
                title={isLocked("sfx") ? "Mở khoá track" : "Khoá track (chặn chỉnh sửa)"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  isLocked("sfx") ? "bg-zinc-200/15 text-zinc-100" : "text-muted-foreground hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                {isLocked("sfx") ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
              </button>
              <button
                type="button"
                onClick={handleAddSfxAtPlayhead}
                title="Thêm SFX tại Playhead"
                className="rounded bg-purple-950/80 border border-purple-700/50 px-1 text-xs text-purple-200 hover:border-purple-400"
              >
                +SFX
              </button>
              <button
                type="button"
                onClick={() => setSfxMuted((m) => !m)}
                title={sfxMuted ? "Bật tiếng SFX" : "Tắt tiếng SFX"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  sfxMuted
                    ? "bg-red-500/20 text-red-400"
                    : "text-purple-300 hover:bg-purple-900/40"
                )}
              >
                {sfxMuted ? (
                  <VolumeX className="h-2.5 w-2.5" />
                ) : (
                  <Volume2 className="h-2.5 w-2.5" />
                )}
              </button>
            </div>
            <div
              title="Kéo lên/xuống để chỉnh độ cao Track SFX"
              onPointerDown={(e) => startVerticalTrackResize(e, "sfx", 24, 96)}
              className="absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize bg-transparent hover:bg-purple-400/60 active:bg-purple-400 transition-colors"
            />
          </div>

          {/* 5. BGM Header (Background Music) */}
          <div
            style={{ height: trackHeights.bgm }}
            className="group/th relative flex shrink-0 items-center justify-between bg-cyan-950/15 px-2 text-cyan-300"
          >
            <span className="flex items-center gap-1 font-semibold truncate">
              <Music className="h-3 w-3 shrink-0 text-cyan-400" />
              <span>BGM</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleLock("bgm")}
                aria-pressed={isLocked("bgm")}
                aria-label={isLocked("bgm") ? `Mở khoá ${TRACK_LABELS.bgm}` : `Khoá ${TRACK_LABELS.bgm}`}
                title={isLocked("bgm") ? "Mở khoá track" : "Khoá track (chặn chỉnh sửa)"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  isLocked("bgm") ? "bg-zinc-200/15 text-zinc-100" : "text-muted-foreground hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                {isLocked("bgm") ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
              </button>
              <button
                type="button"
                onClick={() => setBgmVolume((v) => nextPreset([8, 12, 15, 30, 50], v))}
                title="Đổi âm lượng nhạc nền BGM (8% / 12% / 15% / 30% / 50%)"
                className="rounded bg-cyan-950/80 border border-cyan-700/50 px-1 text-xs text-cyan-200 hover:border-cyan-400"
              >
                {bgmMuted ? "0%" : `${bgmVolume}%`}
              </button>
              <button
                type="button"
                onClick={() => setBgmMuted((m) => !m)}
                title={bgmMuted ? "Bật nhạc nền BGM" : "Tắt nhạc nền BGM"}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  bgmMuted
                    ? "bg-red-500/20 text-red-400"
                    : "text-cyan-300 hover:bg-cyan-900/40"
                )}
              >
                {bgmMuted ? (
                  <VolumeX className="h-2.5 w-2.5" />
                ) : (
                  <Volume2 className="h-2.5 w-2.5" />
                )}
              </button>
            </div>
            <div
              title="Kéo lên/xuống để chỉnh độ cao Track BGM"
              onPointerDown={(e) => startVerticalTrackResize(e, "bgm", 24, 96)}
              className="absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize bg-transparent hover:bg-cyan-400/60 active:bg-cyan-400 transition-colors"
            />
          </div>
        </div>

        {/* Right Interactive Scrollable Zoom Viewport */}
        <div
          ref={scrollerRef}
          className="relative flex flex-1 min-h-0 overflow-x-auto overflow-y-visible bg-surface-1"
        >
          <div
            ref={trackContainerRef}
            style={{ width: `${timelineZoom * 100}%`, minWidth: "100%" }}
            className="relative flex min-h-0 shrink-0 flex-col"
            onPointerMove={(e) => {
              showHover(e.clientX);
              if (draggingPlayheadRef.current) {
                onSeek(snapPoint(clientXToMs(e.clientX), ["playhead"]));
              } else if (trimmingRef.current && onResizeSceneBoundary) {
                const rawMs = snapPoint(clientXToMs(e.clientX), [
                  `scene:${trimmingRef.current.leftSceneId}:e`,
                  `scene:${trimmingRef.current.rightSceneId}:s`,
                ]);
                const clampedMs = Math.max(
                  trimmingRef.current.minMs,
                  Math.min(trimmingRef.current.maxMs, rawMs)
                );
                trimmingRef.current.currentBoundaryMs = clampedMs;
                const leftDur = (
                  (clampedMs - trimmingRef.current.leftStartMs) /
                  1000
                ).toFixed(1);
                const rightDur = (
                  (trimmingRef.current.rightEndMs - clampedMs) /
                  1000
                ).toFixed(1);
                setResizeIndicator({
                  pct: (clampedMs / totalMs) * 100,
                  text: `Cảnh #${trimmingRef.current.leftSceneIndex}: ${leftDur}s  ⇄  Cảnh #${trimmingRef.current.rightSceneIndex}: ${rightDur}s`,
                });
                onResizeSceneBoundary(
                  trimmingRef.current.leftSceneId,
                  trimmingRef.current.rightSceneId,
                  clampedMs
                );
              } else if (sfxDragRef.current) {
                const {
                  clipId,
                  mode,
                  initialStartMs,
                  initialDurationMs,
                  pointerStartMs,
                } = sfxDragRef.current;
                const currentMs = clientXToMs(e.clientX);
                const deltaMs = currentMs - pointerStartMs;

                setSfxClips((prev) =>
                  prev.map((c) => {
                    if (c.id !== clipId) return c;
                    if (mode === "move") {
                      const nextStart = Math.max(
                        0,
                        Math.min(
                          totalMs - c.durationMs,
                          snapRange(Math.round(initialStartMs + deltaMs), c.durationMs, [
                            `sfx:${c.id}:s`,
                            `sfx:${c.id}:e`,
                          ])
                        )
                      );
                      setResizeIndicator({
                        pct: (nextStart / totalMs) * 100,
                        text: `${c.label} · Bắt đầu: ${fmtMs(nextStart)} (${(c.durationMs / 1000).toFixed(1)}s)`,
                      });
                      return { ...c, startMs: nextStart };
                    }
                    if (mode === "resize-left") {
                      const endMs = initialStartMs + initialDurationMs;
                      const nextStart = Math.max(
                        0,
                        Math.min(
                          endMs - 300,
                          snapPoint(Math.round(initialStartMs + deltaMs), [`sfx:${c.id}:s`])
                        )
                      );
                      const nextDur = Math.max(300, endMs - nextStart);
                      setResizeIndicator({
                        pct: (nextStart / totalMs) * 100,
                        text: `${c.label} · ${(nextDur / 1000).toFixed(1)}s`,
                      });
                      return { ...c, startMs: nextStart, durationMs: nextDur };
                    }
                    // resize-right
                    const nextDur = Math.max(
                      300,
                      Math.min(
                        totalMs - initialStartMs,
                        snapPoint(
                          Math.round(initialStartMs + initialDurationMs + deltaMs),
                          [`sfx:${c.id}:e`]
                        ) - initialStartMs
                      )
                    );
                    setResizeIndicator({
                      pct: ((initialStartMs + nextDur) / totalMs) * 100,
                      text: `${c.label} · Độ dài: ${(nextDur / 1000).toFixed(1)}s`,
                    });
                    return { ...c, durationMs: nextDur };
                  })
                );
              } else if (bgmDragRef.current) {
                const {
                  mode,
                  initialStartMs,
                  initialEndMs,
                  pointerStartMs,
                } = bgmDragRef.current;
                const currentMs = clientXToMs(e.clientX);
                const deltaMs = currentMs - pointerStartMs;

                if (mode === "resize-left") {
                  const nextStart = Math.max(
                    0,
                    Math.min(
                      initialEndMs - 1000,
                      snapPoint(Math.round(initialStartMs + deltaMs), ["bgm:s"])
                    )
                  );
                  setBgmRange({
                    startMs: nextStart,
                    endMs: initialEndMs,
                    customized: true,
                  });
                  setResizeIndicator({
                    pct: (nextStart / totalMs) * 100,
                    text: `BGM In: ${fmtMs(nextStart)} · Độ dài: ${((initialEndMs - nextStart) / 1000).toFixed(1)}s`,
                  });
                } else if (mode === "resize-right") {
                  const nextEnd = Math.max(
                    initialStartMs + 1000,
                    Math.min(totalMs, snapPoint(Math.round(initialEndMs + deltaMs), ["bgm:e"]))
                  );
                  setBgmRange({
                    startMs: initialStartMs,
                    endMs: nextEnd,
                    customized: true,
                  });
                  setResizeIndicator({
                    pct: (nextEnd / totalMs) * 100,
                    text: `BGM Out: ${fmtMs(nextEnd)} · Độ dài: ${((nextEnd - initialStartMs) / 1000).toFixed(1)}s`,
                  });
                } else if (mode === "move") {
                  const dur = initialEndMs - initialStartMs;
                  const nextStart = Math.max(
                    0,
                    Math.min(
                      totalMs - dur,
                      snapRange(Math.round(initialStartMs + deltaMs), dur, ["bgm:s", "bgm:e"])
                    )
                  );
                  setBgmRange({
                    startMs: nextStart,
                    endMs: nextStart + dur,
                    customized: true,
                  });
                  setResizeIndicator({
                    pct: ((nextStart + dur / 2) / totalMs) * 100,
                    text: `BGM: ${fmtMs(nextStart)} → ${fmtMs(nextStart + dur)}`,
                  });
                }
              }
            }}
            onPointerLeave={hideHover}
            onPointerDown={() => setSelectedSfxId(null)}
            onPointerUp={() => {
              draggingPlayheadRef.current = false;
              sfxDragRef.current = null;
              bgmDragRef.current = null;
              setResizeIndicator(null);
              setSnapLineMs(null);
              if (trimmingRef.current) {
                const { leftSceneId, rightSceneId, currentBoundaryMs } =
                  trimmingRef.current;
                trimmingRef.current = null;
                onResizeSceneBoundaryEnd?.(
                  leftSceneId,
                  rightSceneId,
                  currentBoundaryMs
                );
              }
            }}
          >
            {/* Hover scrub guide (moved via DOM, no re-render) */}
            <div
              ref={hoverLineRef}
              aria-hidden
              style={{ opacity: 0 }}
              className="pointer-events-none absolute inset-y-0 left-0 z-[38] w-px bg-white/35 transition-opacity duration-75"
            >
              <span
                ref={hoverLabelRef}
                className="absolute left-1 top-0 whitespace-nowrap rounded-sm bg-zinc-100 px-1 font-mono text-xs font-semibold leading-4 text-zinc-900"
              />
            </div>

            {/* Snap guide */}
            {snapLineMs !== null && (
              <div
                aria-hidden
                style={{ left: `${(snapLineMs / totalMs) * 100}%` }}
                className="pointer-events-none absolute inset-y-0 z-[45] w-px bg-primary"
              />
            )}

            {/* Playhead: line across all tracks + draggable head in the ruler */}
            <div
              style={{ left: `${playheadPct}%` }}
              className="pointer-events-none absolute inset-y-0 z-40 w-px -translate-x-1/2 bg-red-500"
            >
              <div
                role="slider"
                aria-label="Đầu phát (Playhead)"
                aria-valuemin={0}
                aria-valuemax={Math.round(totalMs)}
                aria-valuenow={Math.round(nowMs)}
                aria-valuetext={fmtTimecode(nowMs)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  draggingPlayheadRef.current = true;
                }}
                className="pointer-events-auto absolute left-1/2 top-0 h-[18px] w-[13px] -translate-x-1/2 cursor-ew-resize bg-red-500"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%)" }}
              />
            </div>

            {/* Floating Live Resize HUD Tooltip */}
            {resizeIndicator && (
              <div
                style={{
                  left: `${Math.max(8, Math.min(92, resizeIndicator.pct))}%`,
                }}
                className="pointer-events-none absolute top-0.5 z-50 -translate-x-1/2 rounded border border-primary/60 bg-zinc-950/95 px-2 py-0.5 font-mono text-xs font-bold text-primary-text shadow-lg"
              >
                {resizeIndicator.text}
              </div>
            )}

            {/* 0. Timecode Ruler (Sticky Top, Click/Drag to Scrub) */}
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                draggingPlayheadRef.current = true;
                onSeek(snapPoint(clientXToMs(e.clientX), ["playhead"]));
              }}
              style={{
                height: RULER_H,
                backgroundImage:
                  minorDiv > 1
                    ? "linear-gradient(to right, rgba(161,161,170,0.35) 1px, transparent 1px)"
                    : undefined,
                backgroundSize: minorDiv > 1 ? `${minorPx}px 6px` : undefined,
                backgroundRepeat: "repeat-x",
                backgroundPosition: "left bottom",
              }}
              className="sticky top-0 z-30 shrink-0 cursor-ew-resize border-b border-zinc-800 bg-surface-3"
            >
              {ticks.map((t) => (
                <div
                  key={t.ms}
                  style={{ left: `${t.pct}%` }}
                  className="pointer-events-none absolute inset-y-0 flex items-end"
                >
                  <div className="h-3 w-px bg-zinc-500" />
                  <span className="absolute left-1 top-1 whitespace-nowrap font-mono text-xs text-zinc-400">
                    {rulerLabel(t.ms, majorStepMs)}
                  </span>
                </div>
              ))}
            </div>

            {/* 1. Track V1: Video / B-Roll Clips + Visible Tactile Resize Handles */}
            <div
              style={{ height: trackHeights.v1 }}
              className="relative shrink-0 w-full border-b border-zinc-800/80 bg-zinc-950/60"
            >
              {isLocked("v1") && <LockedOverlay />}
              {scenes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground font-medium select-none">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary-text" />
                    Timeline trống · Nhập kịch bản ở Media Pool bên trái hoặc nhấn
                    nút [+] trên thanh công cụ để thêm cảnh.
                  </span>
                </div>
              )}
              {scenes.map((sc, idx) => {
                const leftPct = (sc.startMs / totalMs) * 100;
                const widthPct = Math.max(
                  1.5,
                  ((sc.endMs - sc.startMs) / totalMs) * 100
                );
                const isSelected = sc.id === selectedSceneId;
                const isCurrent = nowMs >= sc.startMs && nowMs < sc.endMs;
                const isDragOver = dragOverSceneId === sc.id;
                const media = parseMediaCrop(sc.imageUrl);
                const durSec = ((sc.endMs - sc.startMs) / 1000).toFixed(1);
                const nextScene = scenes[idx + 1];

                return (
                  <React.Fragment key={sc.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectScene(sc);
                        onSeek(sc.startMs);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverSceneId !== sc.id) setDragOverSceneId(sc.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverSceneId === sc.id) setDragOverSceneId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverSceneId(null);
                        const raw = e.dataTransfer.getData(
                          "application/x-nle-media"
                        );
                        if (raw && onDropMediaOnScene) {
                          try {
                            const parsed = JSON.parse(raw) as {
                              url: string;
                              isLocalClip: boolean;
                            };
                            onDropMediaOnScene(
                              sc.id,
                              parsed.url,
                              parsed.isLocalClip
                            );
                          } catch {
                            // ignore malformed drop
                          }
                        }
                      }}
                      style={{
                        left: `${leftPct}%`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      className={cn(
                        "group absolute top-1 bottom-1 overflow-hidden rounded-md border text-left transition-all",
                        isDragOver
                          ? "z-30 border-primary/60 ring-2 ring-primary-text/60 bg-primary/25 scale-[1.01]"
                          : isSelected
                            ? "z-20 border-primary/60 ring-2 ring-primary-text/70 bg-primary/25"
                            : isCurrent
                              ? "z-10 border-primary/60 bg-primary/25"
                              : "border-primary/60 bg-primary/25 hover:border-primary/60"
                      )}
                    >
                      {/* Clip Background Thumbnail */}
                      {media.cleanUrl && (
                        <div className="absolute inset-0 opacity-60 transition-opacity group-hover:opacity-80">
                          {media.isVideo ? (
                            <video
                              src={media.cleanUrl}
                              muted
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            // Filmstrip: repeat the still across the clip like NLE thumbnails
                            <div
                              className="h-full w-full"
                              style={{
                                backgroundImage: `url("${media.cleanUrl}")`,
                                backgroundSize: "auto 100%",
                                backgroundRepeat: "repeat-x",
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Clip Overlay Metadata */}
                      <div className="relative z-10 flex h-full flex-col justify-between bg-gradient-to-t from-black/85 via-black/30 to-black/60 p-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs font-bold",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-black/75 text-white"
                            )}
                          >
                            #{sc.sceneIndex}
                            {media.cleanUrl &&
                              (media.isVideo ? (
                                <Film className="h-2.5 w-2.5 text-primary-text" />
                              ) : (
                                <ImageIcon className="h-2.5 w-2.5 text-primary-text" />
                              ))}
                          </span>
                          <span className="rounded bg-black/75 px-1 font-mono text-xs text-zinc-200 border border-zinc-700/60">
                            {durSec}s
                          </span>
                        </div>

                        <div className="truncate text-xs font-medium text-zinc-100 drop-shadow">
                          {sc.setting
                            ? sc.setting.replace(/^\[(.*?)\].*$/, "$1")
                            : sc.transcriptText}
                        </div>
                      </div>
                    </button>

                    {/* Visible Interactive Boundary Resize Handle between sc and nextScene on V1 */}
                    {nextScene && onResizeSceneBoundary && (
                      <div
                        style={{
                          left: `calc(${(sc.endMs / totalMs) * 100}% - 6px)`,
                        }}
                        title={`Kéo trái/phải để resize Cảnh #${sc.sceneIndex} và Cảnh #${nextScene.sceneIndex}`}
                        onPointerDown={(e) =>
                          startSceneBoundaryTrim(e, sc, nextScene)
                        }
                        className="group/handle absolute top-0.5 bottom-0.5 z-30 flex w-3 cursor-col-resize items-center justify-center"
                      >
                        <div className="flex h-6 w-1.5 items-center justify-center rounded-full border border-zinc-600/80 bg-zinc-900/90 shadow transition-all group-hover/handle:h-full group-hover/handle:w-2 group-hover/handle:border-primary/60 group-hover/handle:bg-primary">
                          <GripVertical className="h-3 w-3 text-zinc-400 group-hover/handle:text-black" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 2. Track T1: Captions / Subtitle Blocks + Resize Handles */}
            <div
              style={{ height: trackHeights.t1 }}
              className="relative shrink-0 w-full border-b border-zinc-800/80 bg-surface-2"
            >
              {isLocked("t1") && <LockedOverlay />}
              {scenes.map((sc, idx) => {
                const leftPct = (sc.startMs / totalMs) * 100;
                const widthPct = Math.max(
                  1.5,
                  ((sc.endMs - sc.startMs) / totalMs) * 100
                );
                const isSelected = sc.id === selectedSceneId;
                const nextScene = scenes[idx + 1];

                return (
                  <React.Fragment key={`sub-${sc.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectScene(sc);
                        onSeek(sc.startMs);
                      }}
                      style={{
                        left: `${leftPct}%`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      className={cn(
                        "absolute top-1 bottom-1 flex items-center truncate rounded border px-1.5 text-left text-xs transition-colors",
                        isSelected
                          ? "border-amber-400/90 bg-amber-500/20 text-amber-200 font-medium"
                          : "border-amber-900/50 bg-amber-950/30 text-amber-200/75 hover:bg-amber-900/30"
                      )}
                    >
                      <span className="truncate">{sc.transcriptText}</span>
                    </button>

                    {/* Boundary Resize Handle on T1 */}
                    {nextScene && onResizeSceneBoundary && (
                      <div
                        style={{
                          left: `calc(${(sc.endMs / totalMs) * 100}% - 5px)`,
                        }}
                        title={`Kéo để chỉnh thời lượng phụ đề Cảnh #${sc.sceneIndex} / #${nextScene.sceneIndex}`}
                        onPointerDown={(e) =>
                          startSceneBoundaryTrim(e, sc, nextScene)
                        }
                        className="group/subhandle absolute top-0.5 bottom-0.5 z-30 flex w-2.5 cursor-col-resize items-center justify-center"
                      >
                        <div className="h-3.5 w-1 rounded-full bg-amber-500/40 transition-all group-hover/subhandle:h-full group-hover/subhandle:w-1.5 group-hover/subhandle:bg-amber-400" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 3. Track VO: Dedicated Voiceover (Giọng đọc AI + WaveSurfer + Resizable Scene Voice Segments) */}
            <div
              style={{ height: trackHeights.vo }}
              onClick={(e) => seekFromClientX(e.clientX)}
              className={cn(
                "relative shrink-0 w-full border-b border-zinc-800/80 bg-[#0b1613] overflow-hidden transition-opacity",
                voMuted && "opacity-40"
              )}
            >
              {isLocked("vo") && <LockedOverlay />}
              {/* WaveSurfer Canvas Mount for Voiceover */}
              <div
                ref={waveformContainerRef}
                className={cn(
                  "absolute inset-x-1 inset-y-1 z-10 pointer-events-none transition-opacity",
                  waveformReady ? "opacity-85" : "opacity-0"
                )}
              />

              {/* Per-Scene Voiceover Region Clips + Boundary Resize Handles */}
              {scenes.map((sc, idx) => {
                const leftPct = (sc.startMs / totalMs) * 100;
                const widthPct = Math.max(
                  1.5,
                  ((sc.endMs - sc.startMs) / totalMs) * 100
                );
                const isSelected = sc.id === selectedSceneId;
                const durSec = ((sc.endMs - sc.startMs) / 1000).toFixed(1);
                const nextScene = scenes[idx + 1];

                return (
                  <React.Fragment key={`vo-${sc.id}`}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScene(sc);
                        onSeek(sc.startMs);
                      }}
                      style={{
                        left: `${leftPct}%`,
                        width: `calc(${widthPct}% - 2px)`,
                      }}
                      title={`Giọng đọc cảnh #${sc.sceneIndex} · ${durSec}s`}
                      aria-label={`Giọng đọc cảnh #${sc.sceneIndex}, ${durSec} giây`}
                      className={cn(
                        "absolute top-1 bottom-1 z-20 cursor-pointer overflow-hidden rounded border transition-colors",
                        isSelected
                          ? "border-emerald-400 bg-emerald-900/35 text-emerald-100"
                          : "border-emerald-800/60 bg-emerald-950/35 text-emerald-300/90 hover:border-emerald-500/70"
                      )}
                    >
                      {/* Chỉ hiển thị sóng âm — không chồng chữ lên clip giọng đọc */}
                    </div>

                    {/* Boundary Resize Handle on VO Track */}
                    {nextScene && onResizeSceneBoundary && (
                      <div
                        style={{
                          left: `calc(${(sc.endMs / totalMs) * 100}% - 5px)`,
                        }}
                        title={`Kéo để resize đoạn Voiceover #${sc.sceneIndex} / #${nextScene.sceneIndex}`}
                        onPointerDown={(e) =>
                          startSceneBoundaryTrim(e, sc, nextScene)
                        }
                        className="group/vohandle absolute top-0.5 bottom-0.5 z-30 flex w-2.5 cursor-col-resize items-center justify-center"
                      >
                        <div className="h-4 w-1 rounded-full bg-emerald-400/45 transition-all group-hover/vohandle:h-full group-hover/vohandle:w-1.5 group-hover/vohandle:bg-emerald-400" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 4. Track SFX: Dedicated Sound Effects Track (Draggable & Resizable Left/Right Handles) */}
            <div
              style={{ height: trackHeights.sfx }}
              className={cn(
                "relative shrink-0 w-full border-b border-zinc-800/80 bg-[#130e1c] overflow-hidden transition-opacity",
                sfxMuted && "opacity-40"
              )}
            >
              {isLocked("sfx") && <LockedOverlay />}
              {sfxClips.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center px-3 text-xs font-mono text-purple-300/50">
                  Nhấn [+SFX] ở cột trái hoặc thanh công cụ để chèn hiệu ứng âm thanh
                  (Whoosh, Pop, Ding, Impact)...
                </div>
              )}

              {sfxClips.map((sfx) => {
                const leftPct = (sfx.startMs / totalMs) * 100;
                const widthPct = Math.max(
                  2.2,
                  (sfx.durationMs / totalMs) * 100
                );
                const presetStyle =
                  SFX_PRESETS.find((p) => p.preset === sfx.preset)
                    ?.badgeColor ??
                  "border-purple-400/70 bg-purple-950/75 text-purple-200";

                return (
                  <div
                    key={sfx.id}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setSelectedSfxId(sfx.id);
                      sfxDragRef.current = {
                        clipId: sfx.id,
                        mode: "move",
                        initialStartMs: sfx.startMs,
                        initialDurationMs: sfx.durationMs,
                        pointerStartMs: clientXToMs(e.clientX),
                      };
                    }}
                    title="Kéo để di chuyển vị trí SFX · Kéo 2 mép trái/phải để resize độ dài · Nhấn vào chữ để đổi hiệu ứng"
                    className={cn(
                      "group/sfx absolute top-1 bottom-1 z-20 flex cursor-grab active:cursor-grabbing items-center justify-between rounded border px-2 text-xs font-mono shadow-sm transition-colors",
                      presetStyle,
                      selectedSfxId === sfx.id && "z-[25] ring-2 ring-amber-400"
                    )}
                    aria-selected={selectedSfxId === sfx.id}
                  >
                    {/* Left Resize Handle for SFX Clip */}
                    <div
                      title="Kéo sang trái/phải để chỉnh điểm bắt đầu SFX"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        sfxDragRef.current = {
                          clipId: sfx.id,
                          mode: "resize-left",
                          initialStartMs: sfx.startMs,
                          initialDurationMs: sfx.durationMs,
                          pointerStartMs: clientXToMs(e.clientX),
                        };
                      }}
                      className="absolute left-0 top-0 bottom-0 z-30 w-2 cursor-col-resize rounded-l bg-purple-300/30 hover:bg-amber-400 active:bg-amber-300"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCycleSfxPreset(sfx.id);
                      }}
                      className="truncate font-semibold hover:underline"
                    >
                      {sfx.label}{" "}
                      <span className="opacity-75">
                        ({(sfx.durationMs / 1000).toFixed(1)}s)
                      </span>
                    </button>

                    <button aria-label="Xóa hiệu ứng SFX này"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSfxClip(sfx.id);
                      }}
                      title="Xóa hiệu ứng SFX này"
                      className="ml-1 hidden rounded p-0.5 text-purple-200/70 hover:bg-black/40 hover:text-red-300 group-hover/sfx:inline-flex"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>

                    {/* Right Resize Handle for SFX Clip */}
                    <div
                      title="Kéo sang trái/phải để chỉnh độ dài SFX"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        sfxDragRef.current = {
                          clipId: sfx.id,
                          mode: "resize-right",
                          initialStartMs: sfx.startMs,
                          initialDurationMs: sfx.durationMs,
                          pointerStartMs: clientXToMs(e.clientX),
                        };
                      }}
                      className="absolute right-0 top-0 bottom-0 z-30 w-2 cursor-col-resize rounded-r bg-purple-300/30 hover:bg-amber-400 active:bg-amber-300"
                    />
                  </div>
                );
              })}
            </div>

            {/* 5. Track BGM: Dedicated Background Music Track (Resizable In/Out Trim Handles + Waveform) */}
            <div
              style={{ height: trackHeights.bgm }}
              className={cn(
                "relative shrink-0 w-full bg-[#09151b] overflow-hidden transition-opacity",
                bgmMuted && "opacity-40"
              )}
            >
              {isLocked("bgm") && <LockedOverlay />}
              {/* Resizable BGM Clip Container */}
              <div
                style={{
                  left: `${(bgmRange.startMs / totalMs) * 100}%`,
                  width: `${Math.max(5, ((bgmRange.endMs - bgmRange.startMs) / totalMs) * 100)}%`,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  bgmDragRef.current = {
                    mode: "move",
                    initialStartMs: bgmRange.startMs,
                    initialEndMs: bgmRange.endMs,
                    pointerStartMs: clientXToMs(e.clientX),
                  };
                }}
                title="Kéo 2 đầu trái/phải để cắt (Resize) điểm vào/ra của Nhạc nền (BGM)"
                className="group/bgm absolute top-1 bottom-1 z-20 flex cursor-grab active:cursor-grabbing items-center justify-between overflow-hidden rounded border border-cyan-600/60 bg-cyan-950/50 px-3 text-xs text-cyan-200 shadow-inner"
              >
                {/* BGM WaveSurfer Canvas or Decorative Rhythm Bars */}
                <div
                  ref={bgmWaveformContainerRef}
                  className={cn(
                    "absolute inset-x-2 inset-y-0.5 z-0 pointer-events-none transition-opacity",
                    bgmWaveformReady ? "opacity-65" : "opacity-0"
                  )}
                />
                {!bgmWaveformReady && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 opacity-25"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, rgba(34,211,238,0.55) 0px, rgba(34,211,238,0.55) 2px, transparent 2px, transparent 6px)",
                    }}
                  />
                )}

                {/* Left Resize Handle (BGM In Point) */}
                <div
                  title="Kéo để chỉnh điểm bắt đầu Nhạc nền (BGM In)"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    bgmDragRef.current = {
                      mode: "resize-left",
                      initialStartMs: bgmRange.startMs,
                      initialEndMs: bgmRange.endMs,
                      pointerStartMs: clientXToMs(e.clientX),
                    };
                  }}
                  className="absolute left-0 top-0 bottom-0 z-30 flex w-2.5 cursor-col-resize items-center justify-center rounded-l bg-cyan-400/40 hover:bg-amber-400 active:bg-amber-300"
                >
                  <div className="h-3 w-0.5 rounded bg-black/70" />
                </div>

                {/* BGM Metadata Overlay */}
                <div className="relative z-10 flex items-center gap-1.5 font-mono truncate pointer-events-none">
                  <Music className="h-3 w-3 shrink-0 text-cyan-400" />
                  <span className="font-semibold text-cyan-100">
                    Nhạc nền (BGM)
                  </span>
                  <span className="text-xs text-cyan-300/80">
                    · {((bgmRange.endMs - bgmRange.startMs) / 1000).toFixed(1)}s
                    ({fmtMs(bgmRange.startMs)} → {fmtMs(bgmRange.endMs)})
                  </span>
                </div>

                <div className="relative z-10 flex items-center gap-1.5 font-mono text-xs text-cyan-300 pointer-events-none">
                  <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs">
                    VOL {bgmMuted ? "TẮT" : `${bgmVolume}%`}
                  </span>
                </div>

                {/* Right Resize Handle (BGM Out Point) */}
                <div
                  title="Kéo để chỉnh điểm kết thúc Nhạc nền (BGM Out)"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    bgmDragRef.current = {
                      mode: "resize-right",
                      initialStartMs: bgmRange.startMs,
                      initialEndMs: bgmRange.endMs,
                      pointerStartMs: clientXToMs(e.clientX),
                    };
                  }}
                  className="absolute right-0 top-0 bottom-0 z-30 flex w-2.5 cursor-col-resize items-center justify-center rounded-r bg-cyan-400/40 hover:bg-amber-400 active:bg-amber-300"
                >
                  <div className="h-3 w-0.5 rounded bg-black/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
