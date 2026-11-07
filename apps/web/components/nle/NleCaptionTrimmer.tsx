"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
  Combine,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import type { CaptionWord, Scene } from "@storytoon/shared-types";
import { fmtMs } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  scene: Scene | null;
  allScenes: Scene[];
  words?: CaptionWord[];
  totalDurationMs: number;
  onUpdateBounds: (
    sceneId: string,
    newStartMs: number,
    newEndMs: number,
    newTranscriptText?: string
  ) => void;
  onSplitSceneAtMs?: (sceneId: string, splitMs: number) => void;
  onMergeScene?: (sceneId: string, direction: "prev" | "next") => void;
  onAddSceneAfter?: (sceneId: string) => void;
  onDeleteScene?: (sceneId: string) => void;
  onSeek?: (ms: number) => void;
  audioUrl?: string | null;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Jog Wheel Caption Scrubber & Scene In/Out Trimmer.
 * Inspired by tactile non-linear editing dials (DaVinci Resolve / CapCut),
 * with the needle pointing to the exact caption word.
 */
export function NleCaptionTrimmer({
  scene,
  allScenes,
  words = [],
  totalDurationMs,
  onUpdateBounds,
  onSplitSceneAtMs,
  onMergeScene,
  onAddSceneAfter,
  onDeleteScene,
  onSeek,
  audioUrl,
  className,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isPlayingRange, setIsPlayingRange] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Fallback word generation if Whisper word timestamps are empty
  const effectiveWords = useMemo<CaptionWord[]>(() => {
    if (words && words.length > 0) return words;
    const list: CaptionWord[] = [];
    allScenes.forEach((sc) => {
      const rawWords = sc.transcriptText.trim().split(/\s+/).filter(Boolean);
      if (rawWords.length === 0) return;
      const dur = Math.max(100, sc.endMs - sc.startMs);
      const perWord = dur / rawWords.length;
      rawWords.forEach((w, i) => {
        list.push({
          text: w,
          startMs: Math.round(sc.startMs + i * perWord),
          endMs: Math.round(sc.startMs + (i + 1) * perWord),
        });
      });
    });
    return list;
  }, [words, allScenes]);

  const sceneIdx = scene?.sceneIndex ?? 1;
  const prevScene = allScenes.find((s) => s.sceneIndex === sceneIdx - 1) ?? null;
  const nextScene = allScenes.find((s) => s.sceneIndex === sceneIdx + 1) ?? null;

  // Active Jog Wheel position (milliseconds)
  const [currentMs, setCurrentMs] = useState<number>(() => scene?.startMs ?? 0);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartMsRef = useRef(0);
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  // Sync with selected scene changes
  useEffect(() => {
    if (scene) {
      setCurrentMs(scene.startMs);
    }
  }, [scene?.id]);

  // Find word currently under the needle
  const activeWord = useMemo<CaptionWord | null>(() => {
    if (effectiveWords.length === 0) return null;
    const match = effectiveWords.find(
      (w) => currentMs >= w.startMs && currentMs <= w.endMs
    );
    if (match) return match;
    // Closest word
    let closest = effectiveWords[0];
    let minDiff = Math.abs(currentMs - closest.startMs);
    for (const w of effectiveWords) {
      const diff = Math.abs(currentMs - w.startMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = w;
      }
    }
    return closest;
  }, [effectiveWords, currentMs]);

  // Re-compute transcript text from In to Out
  const getTranscriptForRange = useCallback(
    (sMs: number, eMs: number) => {
      const matched = effectiveWords.filter(
        (w) => w.endMs >= sMs && w.startMs <= eMs
      );
      if (matched.length > 0) {
        return matched.map((w) => w.text).join(" ");
      }
      return scene?.transcriptText ?? "";
    },
    [effectiveWords, scene?.transcriptText]
  );

  // Update In (startMs)
  const handleSetIn = useCallback(
    (targetMs = currentMs) => {
      if (!scene) return;
      const newStart = Math.max(0, Math.min(scene.endMs - 300, Math.round(targetMs)));
      const newText = getTranscriptForRange(newStart, scene.endMs);
      onUpdateBounds(scene.id, newStart, scene.endMs, newText);
      onSeek?.(newStart);
      toast.success(`Đã đặt điểm Vào [IN] tại ${fmtMs(newStart)}`);
    },
    [scene, currentMs, getTranscriptForRange, onUpdateBounds, onSeek]
  );

  // Update Out (endMs)
  const handleSetOut = useCallback(
    (targetMs = currentMs) => {
      if (!scene) return;
      const newEnd = Math.max(scene.startMs + 300, Math.min(totalDurationMs, Math.round(targetMs)));
      const newText = getTranscriptForRange(scene.startMs, newEnd);
      onUpdateBounds(scene.id, scene.startMs, newEnd, newText);
      onSeek?.(newEnd);
      toast.success(`Đã đặt điểm Ra [OUT] tại ${fmtMs(newEnd)}`);
    },
    [scene, currentMs, totalDurationMs, getTranscriptForRange, onUpdateBounds, onSeek]
  );

  // Split Scene at current needle
  const handleSplitAtNeedle = useCallback(() => {
    if (!scene || !onSplitSceneAtMs) return;
    if (currentMs <= scene.startMs + 500 || currentMs >= scene.endMs - 500) {
      toast.warning(
        "Vui lòng cuộn kim trỏ vào giữa cảnh (cách 2 mép ít nhất 0.5s) để tách đôi!"
      );
      return;
    }
    onSplitSceneAtMs(scene.id, Math.round(currentMs));
    toast.success(`Đã tách Cảnh #${scene.sceneIndex} tại ${fmtMs(currentMs)}`);
  }, [scene, onSplitSceneAtMs, currentMs]);

  // Audio preview for this scene range
  const handleTogglePlayRange = useCallback(() => {
    if (!audioUrl || !scene) return;
    if (isPlayingRange && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingRange(false);
      return;
    }

    const audio = audioPreviewRef.current || new Audio(audioUrl);
    audioPreviewRef.current = audio;
    audio.currentTime = scene.startMs / 1000;
    setIsPlayingRange(true);

    const checkEnd = () => {
      if (audio.currentTime >= scene.endMs / 1000) {
        audio.pause();
        audio.removeEventListener("timeupdate", checkEnd);
        setIsPlayingRange(false);
      }
    };
    audio.addEventListener("timeupdate", checkEnd);
    audio.onended = () => setIsPlayingRange(false);
    audio.onerror = () => setIsPlayingRange(false);
    audio.play().catch(() => setIsPlayingRange(false));
  }, [audioUrl, scene, isPlayingRange]);

  // Wheel interaction (drag & scroll)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingWheel(true);
    dragStartXRef.current = e.clientX;
    dragStartMsRef.current = currentMs;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingWheel) return;
      const deltaX = e.clientX - dragStartXRef.current;
      // 1 pixel = ~30ms of movement
      const deltaMs = -deltaX * 35;
      const nextMs = Math.max(0, Math.min(totalDurationMs, dragStartMsRef.current + deltaMs));
      setCurrentMs(nextMs);
      onSeek?.(nextMs);
    },
    [isDraggingWheel, totalDurationMs, onSeek]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingWheel(false);
  }, []);

  useEffect(() => {
    if (isDraggingWheel) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingWheel, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    const deltaMs = delta * 15;
    const nextMs = Math.max(0, Math.min(totalDurationMs, currentMs + deltaMs));
    setCurrentMs(nextMs);
    onSeek?.(nextMs);
  };

  if (!scene) {
    return (
      <div className="rounded-lg bg-surface-3 p-3 text-center text-xs text-zinc-500">
        Chọn một cảnh trên Timeline để chỉnh sửa In/Out theo Caption.
      </div>
    );
  }

  // Ticks rendering calculation
  // Visible window: currentMs - 4000ms to currentMs + 4000ms (8s span)
  const spanMs = 7000;
  const viewStartMs = Math.max(0, currentMs - spanMs / 2);
  const viewEndMs = viewStartMs + spanMs;

  const ticks: { ms: number; isMajor: boolean; isHalf: boolean }[] = [];
  const startTick = Math.floor(viewStartMs / 100) * 100;
  for (let t = startTick; t <= viewEndMs; t += 100) {
    ticks.push({
      ms: t,
      isMajor: t % 1000 === 0,
      isHalf: t % 500 === 0 && t % 1000 !== 0,
    });
  }

  // Range highlight coordinates within the dial
  const inPct = Math.max(
    0,
    Math.min(100, ((scene.startMs - viewStartMs) / spanMs) * 100)
  );
  const outPct = Math.max(
    0,
    Math.min(100, ((scene.endMs - viewStartMs) / spanMs) * 100)
  );
  const hasRangeInView = scene.endMs >= viewStartMs && scene.startMs <= viewEndMs;

  return (
    <div
      className={cn(
        "rounded-xl bg-surface-1 p-3 text-zinc-100 shadow-xl transition-all select-none overflow-hidden",
        className
      )}
    >
      {/* 1. Header Toolbar */}
      <div className="mb-2 flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-400 font-mono text-[10px] font-bold text-black">
            CẢNH #{scene.sceneIndex}
          </Badge>
          <span className="font-mono text-xs text-zinc-300">
            {fmtMs(scene.startMs)} – {fmtMs(scene.endMs)}
          </span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 font-semibold">
            {((scene.endMs - scene.startMs) / 1000).toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleTogglePlayRange}
                className="h-6 w-6 p-0 text-zinc-300 hover:text-white"
              >
                {isPlayingRange ? (
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isPlayingRange ? "Tạm dừng nghe thử" : "Nghe thử âm thanh đoạn cảnh này"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  "h-6 px-1.5 text-[10px] gap-1",
                  expanded
                    ? "bg-amber-500/20 text-amber-300"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {expanded ? (
                  <>
                    <Minimize2 className="h-3 w-3" />
                    <span>Thu gọn</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    <span>Thước cuộn</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {expanded ? "Thu gọn thước cuộn Jog Wheel" : "Mở thước cuộn Jog Wheel cắt IN/OUT chi tiết"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. THE HERO JOG WHEEL & CAPTION DISPLAY (Collapsible on demand) */}
      {expanded && (
        <div className="relative flex flex-col items-center rounded-lg bg-gradient-to-b from-zinc-950 via-surface-2 to-black p-3">
          {/* Caption Display */}
          <div className="mb-1.5 flex flex-col items-center text-center">
            <span className="text-[10px] uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Từ Caption đang trỏ vào
            </span>
            <div className="min-h-[34px] flex items-center justify-center">
              {activeWord ? (
                <span className="text-lg font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
                  “{activeWord.text}”
                </span>
              ) : (
                <span className="text-xs font-semibold text-zinc-500 italic">
                  (Khoảng lặng / Không có lời thoại)
                </span>
              )}
            </div>
            <span className="font-mono text-[11px] text-amber-400/90 font-bold">
              {fmtMs(currentMs)}
            </span>
          </div>

          {/* Orange Center Needle Indicator */}
          <div className="relative z-20 flex flex-col items-center">
            <div className="h-0 w-0 border-x-4 border-x-transparent border-t-[7px] border-t-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            <div className="h-5 w-[2px] bg-gradient-to-b from-amber-500 to-transparent" />
          </div>

          {/* Tactile Curved Ruler Dial / Scrubber */}
          <div
            ref={wheelContainerRef}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            className={cn(
              "relative h-14 w-full overflow-hidden rounded-md cursor-grab active:cursor-grabbing border-y border-zinc-800/80 bg-[#090a0d]",
              isDraggingWheel && "cursor-grabbing select-none"
            )}
          >
            {/* Subtle curved rim shadow */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/80" />

            {/* Active Range Glowing Track (between startMs and endMs) */}
            {hasRangeInView && (
              <div
                className="absolute top-0 h-1 bg-amber-400 shadow-[0_0_10px_#f59e0b]"
                style={{
                  left: `${inPct}%`,
                  width: `${Math.max(2, outPct - inPct)}%`,
                }}
              />
            )}

            {/* Scrubber Ticks Track */}
            <div className="relative h-full w-full">
              {ticks.map((t) => {
                const leftPct = ((t.ms - viewStartMs) / spanMs) * 100;
                const isCurrentWordStart = activeWord?.startMs === t.ms;
                return (
                  <div
                    key={t.ms}
                    className="absolute bottom-0 flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${leftPct}%` }}
                  >
                    <div
                      className={cn(
                        "w-[1px] transition-colors",
                        t.isMajor
                          ? "h-6 bg-zinc-300"
                          : t.isHalf
                            ? "h-4 bg-zinc-500"
                            : "h-2.5 bg-zinc-700/80",
                        isCurrentWordStart && "bg-amber-400 shadow-[0_0_4px_#f59e0b]"
                      )}
                    />
                    {t.isMajor && (
                      <span className="font-mono text-[10px] text-zinc-400 select-none pb-0.5">
                        {(t.ms / 1000).toFixed(0)}s
                      </span>
                    )}
                  </div>
                );
              })}

              {/* In Marker Flag */}
              {inPct >= 0 && inPct <= 100 && (
                <div
                  className="absolute top-1 z-15 -translate-x-1/2 flex flex-col items-center cursor-pointer pointer-events-auto"
                  style={{ left: `${inPct}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMs(scene.startMs);
                    onSeek?.(scene.startMs);
                  }}
                  title={`Điểm Vào [IN]: ${fmtMs(scene.startMs)}`}
                >
                  <span className="rounded bg-emerald-500 px-1 py-0.2 font-mono text-[10px] font-bold text-black shadow">
                    IN
                  </span>
                  <div className="h-6 w-[1.5px] bg-emerald-400" />
                </div>
              )}

              {/* Out Marker Flag */}
              {outPct >= 0 && outPct <= 100 && (
                <div
                  className="absolute top-1 z-15 -translate-x-1/2 flex flex-col items-center cursor-pointer pointer-events-auto"
                  style={{ left: `${outPct}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMs(scene.endMs);
                    onSeek?.(scene.endMs);
                  }}
                  title={`Điểm Ra [OUT]: ${fmtMs(scene.endMs)}`}
                >
                  <span className="rounded bg-rose-500 px-1 py-0.2 font-mono text-[10px] font-bold text-white shadow">
                    OUT
                  </span>
                  <div className="h-6 w-[1.5px] bg-rose-400" />
                </div>
              )}
            </div>

            {/* Dot Matrix Texture Underneath */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2 bg-[radial-gradient(#404048_1px,transparent_1px)] [background-size:6px_6px] opacity-70" />
          </div>

          {/* 3. In / Out Action Buttons Row */}
          <div className="mt-2.5 flex w-full items-center justify-between gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSetIn()}
                  className="flex-1 h-7.5 gap-1.5 bg-zinc-800 text-xs text-emerald-400 hover:bg-zinc-700 hover:text-emerald-300 font-semibold"
                >
                  <ArrowLeftToLine className="h-3.5 w-3.5" />
                  <span>[ Đặt IN</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Đặt điểm Bắt đầu của cảnh tại kim trỏ {fmtMs(currentMs)} (Phím tắt: I)</TooltipContent>
            </Tooltip>

            {onSplitSceneAtMs && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSplitAtNeedle}
                    className="h-7.5 px-3 text-xs text-amber-400 border-zinc-700 hover:border-amber-400 gap-1"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Tách</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Tách cảnh hiện tại làm đôi tại từ đang trỏ (Phím tắt: S)</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSetOut()}
                  className="flex-1 h-7.5 gap-1.5 bg-zinc-800 text-xs text-rose-400 hover:bg-zinc-700 hover:text-rose-300 font-semibold"
                >
                  <span>Đặt OUT ]</span>
                  <ArrowRightToLine className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Đặt điểm Kết thúc của cảnh tại kim trỏ {fmtMs(currentMs)} (Phím tắt: O)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* 4. Interactive Word Cloud & Caption Sequence */}
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-300">
            Lời thoại cảnh #{scene.sceneIndex}:
          </span>
          <span className="font-mono text-[10px]">
            {effectiveWords.filter((w) => w.endMs >= scene.startMs && w.startMs <= scene.endMs).length}{" "}
            từ
          </span>
        </div>

        {/* Words wrap box (In compact mode, show only words near/in this scene; in expanded mode, show all) */}
        <div className="max-h-20 overflow-y-auto rounded-lg bg-zinc-950 p-2 text-xs leading-relaxed flex flex-wrap gap-1">
          {(expanded
            ? effectiveWords
            : effectiveWords.filter(
                (w) => w.endMs >= scene.startMs && w.startMs <= scene.endMs
              )
          ).map((w, idx) => {
            const isInside = w.endMs >= scene.startMs && w.startMs <= scene.endMs;
            const isTargeted = activeWord === w;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentMs(w.startMs);
                  onSeek?.(w.startMs);
                }}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] transition-all font-medium",
                  isTargeted
                    ? "bg-amber-500 text-black font-bold ring-1 ring-amber-400 shadow-sm"
                    : isInside
                      ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                      : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"
                )}
                title={`${w.text} (${fmtMs(w.startMs)} – ${fmtMs(w.endMs)})`}
              >
                {w.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Scene Management Actions (Merge, Add, Delete) */}
      <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {onMergeScene && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!prevScene}
                    onClick={() => onMergeScene(scene.id, "prev")}
                    className="h-7 gap-1 text-[11px] border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  >
                    <Combine className="h-3 w-3 text-cyan-400" />
                    <span>Gộp #{prevScene?.sceneIndex ?? ""}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {prevScene ? `Gộp với Cảnh #${prevScene.sceneIndex}` : "Đây là cảnh đầu tiên"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!nextScene}
                    onClick={() => onMergeScene(scene.id, "next")}
                    className="h-7 gap-1 text-[11px] border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  >
                    <Combine className="h-3 w-3 text-cyan-400" />
                    <span>Gộp #{nextScene?.sceneIndex ?? ""}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {nextScene ? `Gộp với Cảnh #${nextScene.sceneIndex}` : "Đây là cảnh cuối cùng"}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onAddSceneAfter && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddSceneAfter(scene.id)}
                  className="h-7 gap-1 text-[11px] text-amber-300 font-semibold"
                >
                  <Plus className="h-3 w-3" />
                  <span>Thêm cảnh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Chèn cảnh mới sau cảnh hiện tại</TooltipContent>
            </Tooltip>
          )}

          {onDeleteScene && allScenes.length > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="Xóa cảnh này (Delete)"
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteScene(scene.id)}
                  className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Xóa cảnh này (Delete)</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
