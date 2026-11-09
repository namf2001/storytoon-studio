"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";
import { toast } from "sonner";
import {
  Crop,
  EyeOff,
  Film,
  Grid,
  Image as ImageIcon,
  Maximize2,
  Move,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import {
  buildMediaUrlWithCrop,
  parseMediaCrop,
  type ImageLayer,
  type MediaAspectRatio,
  type MediaLayer,
  type Scene,
  type SceneLayer,
  type SceneLayoutType,
  type TextLayer,
} from "@storytoon/shared-types";
import { api, fmtMs } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  scene: Scene | null;
  frameAspectRatio: MediaAspectRatio;
  onSceneChange: (updated: Scene) => void;
  onSeekToScene?: (ms: number) => void;
  /** Whether to show the 3:4 / 4:3 crop overlay frame by default (false for 9:16 Product Videos). */
  defaultShowCropFrame?: boolean;
}

const Y_PRESETS = [
  { label: "Đỉnh", y: 10 },
  { label: "Cao", y: 30 },
  { label: "Giữa", y: 50 },
  { label: "Thấp", y: 72 },
  { label: "Đáy", y: 92 },
];

/**
 * DaVinci Resolve style Source / Scene Monitor (Left Viewer in the Center Dual Monitor).
 * Previews the currently selected scene and lets the user interactively drag & zoom the crop region.
 */
export function NleSceneViewer({
  scene,
  frameAspectRatio,
  onSceneChange,
  onSeekToScene,
  defaultShowCropFrame = true,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(false);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [showCropFrame, setShowCropFrame] = useState(defaultShowCropFrame);
  const [showGrid, setShowGrid] = useState(defaultShowCropFrame);
  const [busy, setBusy] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Chế độ gọn khi panel hẹp: ẩn nhãn chữ, chỉ giữ icon (tránh bẻ dòng / tràn thanh công cụ)
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!rootEl || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 520));
    ro.observe(rootEl);
    return () => ro.disconnect();
  }, [rootEl]);

  const layers: SceneLayer[] = scene?.layers ?? [];
  const layoutType: SceneLayoutType = scene?.layoutType || "standard";
  const mediaLayers = layers.filter(
    (l): l is MediaLayer => l.type === "media" && l.visible !== false
  );
  const textLayers = layers.filter(
    (l): l is TextLayer => l.type === "text" && l.visible !== false
  );
  const imageLayers = layers.filter(
    (l): l is ImageLayer => l.type === "image" && l.visible !== false
  );
  const isSplitCompare = layoutType === "split_compare" && mediaLayers.length >= 2;

  const primaryMediaLayer = mediaLayers[0];
  const effectiveImageUrl = primaryMediaLayer?.mediaUrl || scene?.imageUrl;
  const media = parseMediaCrop(effectiveImageUrl);
  const bgBlur = primaryMediaLayer?.blur ?? 0;
  const bgOpacity = primaryMediaLayer?.opacity ?? 1;

  const leftMedia = isSplitCompare ? mediaLayers[0] : null;
  const rightMedia = isSplitCompare ? mediaLayers[1] : null;
  const leftParsed = parseMediaCrop(leftMedia?.mediaUrl || scene?.imageUrl);
  const rightParsed = parseMediaCrop(rightMedia?.mediaUrl || scene?.imageUrl);

  const [cropX, setCropX] = useState(media.cropX);
  const [cropY, setCropY] = useState(media.cropY);
  const [cropZoom, setCropZoom] = useState(media.cropZoom);
  const [trimStartSec, setTrimStartSec] = useState(media.trimStartSec);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [autoFitSpeed, setAutoFitSpeed] = useState<boolean>(
    media.autoFitSpeed ?? scene?.autoFitSpeed ?? true
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(
    media.playbackRate ?? scene?.playbackRate ?? 1.0
  );

  useEffect(() => {
    const parsed = parseMediaCrop(effectiveImageUrl);
    setCropX(parsed.cropX);
    setCropY(parsed.cropY);
    setCropZoom(parsed.cropZoom);
    setTrimStartSec(parsed.trimStartSec);
    setAutoFitSpeed(parsed.autoFitSpeed ?? scene?.autoFitSpeed ?? true);
    setSpeedMultiplier(parsed.playbackRate ?? scene?.playbackRate ?? 1.0);
    setSelectedLayerId(null);
  }, [scene?.id, effectiveImageUrl]);

  const sceneDurSec = scene ? Math.max(0.1, (scene.endMs - scene.startMs) / 1000) : 6.0;
  const sourceDurSec =
    detectedDuration ??
    scene?.sourceDurationSec ??
    media.sourceDurationSec ??
    (media.cleanUrl.includes("raw_") ? 7.98 : null);

  const effectivePlaybackRate = useMemo(() => {
    if (autoFitSpeed && sourceDurSec && sourceDurSec > 0 && sceneDurSec > 0) {
      const usable = Math.max(0.1, sourceDurSec - trimStartSec);
      return Math.min(5.0, Math.max(0.2, Number((usable / sceneDurSec).toFixed(3))));
    }
    return speedMultiplier || 1.0;
  }, [autoFitSpeed, sourceDurSec, trimStartSec, sceneDurSec, speedMultiplier]);

  useEffect(() => {
    if (videoRef.current && Number.isFinite(effectivePlaybackRate) && effectivePlaybackRate > 0) {
      videoRef.current.playbackRate = effectivePlaybackRate;
    }
  }, [effectivePlaybackRate]);

  // Keep video preview seeked near trimStartSec when trimStartSec changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !media.isVideo) return;
    if (Math.abs(v.currentTime - trimStartSec) > 1.5) {
      v.currentTime = trimStartSec;
    }
  }, [trimStartSec, media.isVideo, media.cleanUrl]);

  if (!scene) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background text-xs text-muted-foreground">
        Chọn một phân cảnh trên Timeline để xem trong Scene Monitor.
      </div>
    );
  }

  const activeScene = scene;
  const durSec = ((activeScene.endMs - activeScene.startMs) / 1000).toFixed(1);

  function applyCrop(
    next: Partial<{
      cropX: number;
      cropY: number;
      cropZoom: number;
      trimStartSec: number;
      autoFitSpeed: boolean;
      playbackRate: number;
      sourceDurationSec: number;
    }>,
    persist = true
  ) {
    if (!effectiveImageUrl) return;
    const nx = Math.max(0, Math.min(100, Math.round(next.cropX ?? cropX)));
    const ny = Math.max(0, Math.min(100, Math.round(next.cropY ?? cropY)));
    const nz = Math.max(
      1,
      Math.min(4.0, Number((next.cropZoom ?? cropZoom).toFixed(2)))
    );
    const nt = Math.max(0, Number((next.trimStartSec ?? trimStartSec).toFixed(1)));
    const nextAutoFit = next.autoFitSpeed ?? autoFitSpeed;
    const nextSpeed = next.playbackRate ?? speedMultiplier;
    const nextSrcDur = next.sourceDurationSec ?? sourceDurSec ?? undefined;

    setCropX(nx);
    setCropY(ny);
    setCropZoom(nz);
    setTrimStartSec(nt);
    setAutoFitSpeed(nextAutoFit);
    setSpeedMultiplier(nextSpeed);

    const newUrl = buildMediaUrlWithCrop(
      effectiveImageUrl,
      {
        cropX: nx,
        cropY: ny,
        cropZoom: nz,
        trimStartSec: nt,
        autoFitSpeed: nextAutoFit,
        playbackRate: nextSpeed,
        sourceDurationSec: nextSrcDur,
      },
      media.isVideo
    );
    const nextLayers = activeScene.layers?.map((l, idx) =>
      idx === 0 && l.type === "media"
        ? {
            ...l,
            mediaUrl: newUrl,
            cropX: nx,
            cropY: ny,
            cropZoom: nz,
            trimStartSec: nt,
            autoFitSpeed: nextAutoFit,
            playbackRate: nextSpeed,
            sourceDurationSec: nextSrcDur,
          }
        : l
    );
    onSceneChange({
      ...activeScene,
      imageUrl: newUrl,
      autoFitSpeed: nextAutoFit,
      playbackRate: nextSpeed,
      sourceDurationSec: nextSrcDur,
      layers: nextLayers || activeScene.layers,
    });
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeScene.id);
    if (persist && !activeScene.id.startsWith("demo-") && !activeScene.projectId?.startsWith("demo-") && isUuid) {
      api.updateScene(activeScene.id, {
        imageUrl: newUrl,
        layers: (nextLayers || activeScene.layers) as any,
      }).catch(() => {});
    }
  }

  function updateOverlayLayer(
    layerId: string,
    updater: (layer: SceneLayer) => SceneLayer,
    persist = false
  ) {
    const nextLayers = (activeScene.layers ?? []).map((l) =>
      l.id === layerId ? updater(l) : l
    );
    onSceneChange({
      ...activeScene,
      layers: nextLayers,
    });
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activeScene.id
    );
    if (
      persist &&
      !activeScene.id.startsWith("demo-") &&
      !activeScene.projectId?.startsWith("demo-") &&
      isUuid
    ) {
      api
        .updateScene(activeScene.id, {
          layers: nextLayers as any,
        })
        .catch(() => {});
    }
  }

  // Height % of the target frame window relative to a 9:16 vertical source canvas
  const windowHeightPct =
    frameAspectRatio === "3:4"
      ? 72
      : frameAspectRatio === "1:1"
        ? 56
        : frameAspectRatio === "4:3"
          ? 44
          : 33;
  const maxTopPct = 100 - windowHeightPct;
  const windowTopPct = (cropY / 100) * maxTopPct;

  function updateFromPointer(clientX: number, clientY: number, persist: boolean) {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const halfWin = windowHeightPct / 200;
    const normY = Math.max(
      0,
      Math.min(1, (relY - halfWin) / Math.max(0.01, 1 - windowHeightPct / 100))
    );
    applyCrop(
      {
        cropX: Math.round(relX * 100),
        cropY: Math.round(normY * 100),
      },
      persist
    );
  }

  async function handleQuickUpload(file?: File) {
    if (!file) return;
    setBusy(true);
    const toastId = toast.loading(
      `Đang tải ${file.name} vào Cảnh #${activeScene.sceneIndex}...`
    );
    try {
      const uploaded = await api.uploadMediaFile(file);
      const isVid =
        file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
      const urlWithCrop = buildMediaUrlWithCrop(
        uploaded.url,
        { cropX: 50, cropY: 50, cropZoom: 1, trimStartSec: 0 },
        isVid
      );
      if (!activeScene.id.startsWith("demo-")) {
        await api.updateScene(activeScene.id, { imageUrl: urlWithCrop });
      }
      onSceneChange({ ...activeScene, imageUrl: urlWithCrop });
      toast.success(`Đã gắn ${file.name} vào Cảnh #${activeScene.sceneIndex}`, {
        id: toastId,
      });
    } catch (e) {
      toast.error("Tải file thất bại", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={setRootEl}
      className="flex h-full w-full flex-col min-w-0 bg-background overflow-hidden select-none"
    >
      {/* 1. Scene Monitor Compact Toolbar (No redundant title/scene badge) */}
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 whitespace-nowrap border-b border-zinc-800/80 bg-surface-2 px-2.5 text-xs">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {/* Toggle Crop Frame Overlay ON / OFF */}
          <button
            type="button"
            onClick={() => setShowCropFrame((v) => !v)}
            aria-label={showCropFrame ? "Ẩn khung cắt" : "Bật khung cắt"}
            aria-pressed={showCropFrame}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium transition-colors",
              showCropFrame
                ? "border-primary/60 bg-primary/20 text-primary-text"
                : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            )}
            title={
              showCropFrame
                ? "Đang bật Khung lấy hình · Bấm để ẩn khung (Xem Full 9:16)"
                : "Bật Khung lấy hình 3:4 / Cắt vùng hiển thị"
            }
          >
            <Crop className="h-3 w-3" />
            {!compact && <span>{showCropFrame ? "Ẩn khung cắt" : "Khung cắt"}</span>}
          </button>

          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            aria-label="Bật/tắt lưới 1/3"
            aria-pressed={showGrid}
            className={cn(
              "shrink-0 rounded p-1 transition-colors",
              showGrid
                ? "bg-primary/20 text-primary-text"
                : "text-muted-foreground hover:text-zinc-300"
            )}
            title="Bật/tắt lưới bố cục 1/3 (Rule of Thirds)"
          >
            <Grid className="h-3 w-3" />
          </button>

          {/* Universal Quick Zoom Presets & Reset */}
          {media.cleanUrl && (
            <div className="flex shrink-0 items-center gap-1 border-l border-zinc-800 pl-1.5 ml-0.5">
              {[1, 1.25, 1.5].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => applyCrop({ cropZoom: z })}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-xs transition-colors",
                    Math.abs(cropZoom - z) < 0.05
                      ? "bg-primary/15 text-primary-text font-semibold"
                      : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700"
                  )}
                  title={`Thu phóng khung cắt ${z}x`}
                >
                  {z}x
                </button>
              ))}
              {(cropZoom !== 1 || cropX !== 50 || cropY !== 50 || trimStartSec !== 0) && (
                <button
                  type="button"
                  onClick={() => {
                    applyCrop({ cropX: 50, cropY: 50, cropZoom: 1, trimStartSec: 0 });
                    toast.info("Đã đặt lại khung cắt mặc định");
                  }}
                  className="flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  title="Đặt lại khung cắt (Reset Crop)"
                  aria-label="Đặt lại khung cắt"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {media.isVideo && (
            <button
              type="button"
              onClick={() => applyCrop({ autoFitSpeed: !autoFitSpeed })}
              title={
                autoFitSpeed
                  ? `Đang bật Auto-fit: Gốc ${sourceDurSec ? sourceDurSec.toFixed(1) : "8.0"}s tự động điều chỉnh tốc độ ${effectivePlaybackRate.toFixed(2)}x để vừa khít cảnh ${durSec}s`
                  : "Bấm để tự động co giãn tốc độ video vừa khít thời lượng cảnh"
              }
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono font-bold transition-all",
                autoFitSpeed
                  ? "bg-primary/15 text-primary-text"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Zap className="h-2.5 w-2.5" />
              {effectivePlaybackRate.toFixed(2)}×
            </button>
          )}

          {onSeekToScene && (
            <button
              type="button"
              onClick={() => onSeekToScene(activeScene.startMs)}
              className="flex items-center gap-1 rounded bg-primary/15 border border-primary/40 px-1.5 py-0.5 text-xs font-semibold text-primary-text hover:bg-primary/25"
              title="Đưa kim Playhead của Full Video tới đầu cảnh này"
              aria-label="Đồng bộ playhead tới đầu cảnh"
            >
              <Play className="h-2.5 w-2.5" />
              {!compact && "Đồng bộ TC"}
            </button>
          )}
        </div>
      </div>

      {/* 2. Scene Interactive Source Canvas (9:16 with bright 3:4 / 4:3 Crop Window) */}
      <div className="relative flex flex-1 min-h-0 items-center justify-center p-3 overflow-hidden">
        {media.cleanUrl ? (
          <div
            ref={canvasRef}
            onPointerDown={(e) => {
              if (e.target === canvasRef.current || !(e.target as HTMLElement).closest("[data-layer-interactive='true']")) {
                setSelectedLayerId(null);
              }
              if (!showCropFrame) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              draggingRef.current = true;
              updateFromPointer(e.clientX, e.clientY, false);
            }}
            onPointerMove={(e) => {
              if (showCropFrame && draggingRef.current) {
                updateFromPointer(e.clientX, e.clientY, false);
              }
            }}
            onPointerUp={(e) => {
              if (showCropFrame && draggingRef.current) {
                draggingRef.current = false;
                updateFromPointer(e.clientX, e.clientY, true);
              }
            }}
            onWheel={(e) => {
              if (!showCropFrame) return;
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.06 : -0.06;
              applyCrop({ cropZoom: cropZoom + delta }, true);
            }}
            style={{
              height: "100%",
              maxHeight: "100%",
              aspectRatio: "9/16",
              width: "auto",
              maxWidth: "100%",
            }}
            className={cn(
              "relative overflow-hidden rounded-[10px] border border-zinc-700/80 bg-black shadow-[0_16px_48px_rgba(0,0,0,0.8)]",
              showCropFrame ? "cursor-move" : "cursor-default"
            )}
          >
            {/* 1. Background Media Layer (Split Side-by-Side or Full Canvas) */}
            {isSplitCompare ? (
              <div className="absolute inset-0 flex h-full w-full pointer-events-none">
                {/* Left Media (50%) */}
                <div className="relative h-full w-1/2 overflow-hidden border-r-2 border-primary/60">
                  {leftParsed.isVideo ? (
                    <video
                      src={leftParsed.cleanUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      style={{
                        transform: `scale(${leftParsed.cropZoom || 1})`,
                        transformOrigin: `${leftParsed.cropX || 50}% ${leftParsed.cropY || 50}%`,
                      }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={leftParsed.cleanUrl}
                      alt="Left Side"
                      draggable={false}
                      style={{
                        transform: `scale(${leftParsed.cropZoom || 1})`,
                        transformOrigin: `${leftParsed.cropX || 50}% ${leftParsed.cropY || 50}%`,
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 left-2 rounded bg-black/70 px-1 py-0.5 text-xs font-mono font-bold text-primary-text">
                    TRÁI
                  </div>
                </div>

                {/* Right Media (50%) */}
                <div className="relative h-full w-1/2 overflow-hidden">
                  {rightParsed.isVideo ? (
                    <video
                      src={rightParsed.cleanUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      style={{
                        transform: `scale(${rightParsed.cropZoom || 1})`,
                        transformOrigin: `${rightParsed.cropX || 50}% ${rightParsed.cropY || 50}%`,
                      }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={rightParsed.cleanUrl}
                      alt="Right Side"
                      draggable={false}
                      style={{
                        transform: `scale(${rightParsed.cropZoom || 1})`,
                        transformOrigin: `${rightParsed.cropX || 50}% ${rightParsed.cropY || 50}%`,
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 rounded bg-black/70 px-1 py-0.5 text-xs font-mono font-bold text-primary-text">
                    PHẢI
                  </div>
                </div>

                {/* Center Golden VS Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary font-black text-black text-xs border-2 border-black">
                    VS
                  </div>
                </div>
              </div>
            ) : (
              /* Full 9:16 Single Media (Image or Video) with Blur & Opacity */
              <div
                className="absolute inset-0 h-full w-full overflow-hidden"
                style={{
                  filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined,
                  opacity: bgOpacity,
                }}
              >
                {media.isVideo ? (
                  <video
                    ref={videoRef}
                    src={media.cleanUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    onLoadedMetadata={(e) => {
                      const dur = e.currentTarget.duration;
                      if (Number.isFinite(dur) && dur > 0) {
                        setDetectedDuration(dur);
                      }
                      e.currentTarget.playbackRate = effectivePlaybackRate;
                    }}
                    onPlay={(e) => {
                      e.currentTarget.playbackRate = effectivePlaybackRate;
                    }}
                    style={{
                      transform: `scale(${cropZoom})`,
                      transformOrigin: `${cropX}% ${cropY}%`,
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={media.cleanUrl}
                    alt={`Scene ${activeScene.sceneIndex}`}
                    draggable={false}
                    style={{
                      transform: `scale(${cropZoom})`,
                      transformOrigin: `${cropX}% ${cropY}%`,
                    }}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}

            {/* 2. Overlay Image Layers (Interactive via react-moveable) */}
            {imageLayers.map((l) => (
              <div
                key={l.id}
                ref={(el) => {
                  layerRefs.current[l.id] = el;
                }}
                data-layer-interactive="true"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedLayerId(l.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLayerId(l.id);
                }}
                style={{
                  position: "absolute",
                  left: `${l.position?.x ?? 50}%`,
                  top: `${l.position?.y ?? 50}%`,
                  width: `${l.size?.width ?? 40}%`,
                  height: l.size?.height ? `${l.size.height}%` : "auto",
                  transform: `translate(-50%, -50%) rotate(${l.rotation ?? 0}deg)`,
                  opacity: l.opacity ?? 1,
                  zIndex: selectedLayerId === l.id ? 35 : 20,
                  cursor: "grab",
                  filter: l.shadow !== false ? "drop-shadow(0 10px 20px rgba(0,0,0,0.65))" : undefined,
                }}
                className={cn(
                  "transition-shadow",
                  selectedLayerId === l.id && "ring-1 ring-primary-text/80 rounded"
                )}
              >
                <img
                  src={l.imageUrl}
                  alt={l.name || "Overlay Image"}
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              </div>
            ))}

            {/* 3. Overlay Text Layers (Interactive via react-moveable) */}
            {textLayers.map((l) => {
              const preset = l.stylePreset || "headline_box";
              const posX = l.position?.x ?? 50;
              const posY = l.position?.y ?? 75;
              const color = l.color || "#FFD600";
              const baseFontSize = (l.fontSize || 34) * 0.42;

              let cardInline: React.CSSProperties = {
                color,
                textAlign: l.textAlign || "center",
              };

              if (preset === "headline_box") {
                cardInline = {
                  ...cardInline,
                  backgroundColor: l.backgroundColor || "rgba(10, 20, 40, 0.92)",
                  border: "1.5px solid rgba(255, 255, 255, 0.28)",
                  borderRadius: 10,
                  padding: "5px 14px",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.65)",
                };
              } else if (preset === "neon_tag") {
                cardInline = {
                  ...cardInline,
                  backgroundColor: "rgba(0, 0, 0, 0.88)",
                  border: `1.5px solid ${color}`,
                  borderRadius: 20,
                  padding: "4px 14px",
                  boxShadow: `0 0 14px ${color}66`,
                };
              } else if (preset === "quote_card") {
                cardInline = {
                  ...cardInline,
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  borderLeft: `4px solid ${color}`,
                  borderRadius: "0 10px 10px 0",
                  padding: "6px 14px",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.6)",
                  fontStyle: "italic",
                };
              } else if (preset === "stat_badge") {
                cardInline = {
                  ...cardInline,
                  backgroundColor: "rgba(186, 12, 47, 0.92)",
                  borderRadius: 8,
                  padding: "4px 12px",
                  border: "1px solid rgba(255, 214, 0, 0.7)",
                  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                };
              } else {
                cardInline = {
                  ...cardInline,
                  textShadow: "0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.95)",
                };
              }

              return (
                <div
                  key={l.id}
                  ref={(el) => {
                    layerRefs.current[l.id] = el;
                  }}
                  data-layer-interactive="true"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedLayerId(l.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLayerId(l.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: selectedLayerId === l.id ? 35 : 25,
                    cursor: "grab",
                    maxWidth: "92%",
                  }}
                  className={cn(
                    "transition-shadow",
                    selectedLayerId === l.id && "ring-1 ring-primary-text/60 rounded"
                  )}
                >
                  <div style={cardInline}>
                    <div style={{ fontSize: `${baseFontSize}px`, fontWeight: 800, lineHeight: 1.25 }}>
                      {l.text}
                    </div>
                    {l.subtitle && (
                      <div
                        style={{
                          fontSize: `${Math.max(9, Math.round(baseFontSize * 0.68))}px`,
                          fontWeight: 600,
                          color: preset === "quote_card" ? "#FFD600" : "rgba(255,255,255,0.85)",
                          marginTop: 1,
                        }}
                      >
                        {l.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Moveable Controller for Selected Overlay Layer */}
            {selectedLayerId && layerRefs.current[selectedLayerId] && (
              <Moveable
                target={layerRefs.current[selectedLayerId]}
                draggable={true}
                rotatable={true}
                snappable={true}
                snapCenter={true}
                origin={false}
                throttleDrag={0}
                onDrag={({ left, top }) => {
                  const canvasEl = canvasRef.current;
                  if (!canvasEl) return;
                  const rect = canvasEl.getBoundingClientRect();
                  const nextX = Math.max(0, Math.min(100, Math.round((left / rect.width) * 100)));
                  const nextY = Math.max(0, Math.min(100, Math.round((top / rect.height) * 100)));
                  updateOverlayLayer(
                    selectedLayerId,
                    (layer) =>
                      layer.type === "text" || layer.type === "image"
                        ? { ...layer, position: { x: nextX, y: nextY } }
                        : layer,
                    false
                  );
                }}
                onDragEnd={({ lastEvent }) => {
                  const canvasEl = canvasRef.current;
                  if (!canvasEl || !lastEvent) return;
                  const rect = canvasEl.getBoundingClientRect();
                  const nextX = Math.max(
                    0,
                    Math.min(100, Math.round((lastEvent.left / rect.width) * 100))
                  );
                  const nextY = Math.max(
                    0,
                    Math.min(100, Math.round((lastEvent.top / rect.height) * 100))
                  );
                  updateOverlayLayer(
                    selectedLayerId,
                    (layer) =>
                      layer.type === "text" || layer.type === "image"
                        ? { ...layer, position: { x: nextX, y: nextY } }
                        : layer,
                    true
                  );
                }}
                onRotate={({ beforeRotate }) => {
                  updateOverlayLayer(
                    selectedLayerId,
                    (layer) =>
                      layer.type === "image"
                        ? { ...layer, rotation: Math.round(beforeRotate) }
                        : layer,
                    false
                  );
                }}
                onRotateEnd={({ lastEvent }) => {
                  if (!lastEvent) return;
                  updateOverlayLayer(
                    selectedLayerId,
                    (layer) =>
                      layer.type === "image"
                        ? { ...layer, rotation: Math.round(lastEvent.beforeRotate) }
                        : layer,
                    true
                  );
                }}
              />
            )}

            {/* Optional Full-Frame 3x3 Grid when Crop Frame is OFF */}
            {!showCropFrame && showGrid && (
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 z-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-primary/25" />
                ))}
              </div>
            )}

            {/* Crop Frame Overlay (Only shown when showCropFrame is enabled) */}
            {showCropFrame && (
              <>
                {/* Top Dimmed Mask (outside crop box) */}
                <div
                  style={{ height: `${windowTopPct}%` }}
                  className="pointer-events-none absolute inset-x-0 top-0 bg-black/60 backdrop-blur-[1px] z-30"
                />

                {/* Bottom Dimmed Mask (outside crop box) */}
                <div
                  style={{
                    top: `${windowTopPct + windowHeightPct}%`,
                    bottom: 0,
                  }}
                  className="pointer-events-none absolute inset-x-0 bg-black/60 backdrop-blur-[1px] z-30"
                />

                {/* Active Target Crop Window (3:4 / 4:3 / 16:9 / 1:1) */}
                <div
                  style={{
                    top: `${windowTopPct}%`,
                    height: `${windowHeightPct}%`,
                  }}
                  className="pointer-events-none absolute inset-x-0 border-2 border-primary/60 z-30"
                >
                  {/* Rule of Thirds 3x3 Grid */}
                  {showGrid && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className="border-[0.5px] border-primary/30"
                        />
                      ))}
                    </div>
                  )}

                  {/* Top HUD inside Crop Box */}
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 font-mono text-xs font-bold text-primary-foreground shadow">
                        <Crop className="h-2.5 w-2.5" />
                        {compact ? frameAspectRatio : `KHUNG ${frameAspectRatio}`}
                      </span>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCropFrame(false);
                        }}
                        title="Ẩn khung lấy hình này"
                        aria-label="Ẩn khung lấy hình"
                        className="pointer-events-auto inline-flex items-center gap-1 rounded bg-black/85 border border-zinc-700 px-1.5 py-0.5 text-xs font-medium text-zinc-200 hover:border-primary/60 hover:text-primary-text"
                      >
                        <EyeOff className="h-2.5 w-2.5" />
                        {!compact && "Ẩn"}
                      </button>
                    </div>
                    <span
                      className={cn(
                        "rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-primary-text",
                        compact && "hidden"
                      )}
                    >
                      {media.isVideo ? (
                        <span className="inline-flex items-center gap-1">
                          <Film className="h-2.5 w-2.5" /> VIDEO · {cropZoom}x
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-2.5 w-2.5" /> ẢNH · {cropZoom}x
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Bottom HUD inside Crop Box */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2">
                    {!compact && (
                      <span className="truncate text-xs text-zinc-300">
                        Kéo để chọn vùng · Lăn chuột để zoom
                      </span>
                    )}
                    <span className="ml-auto shrink-0 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-primary-text">
                      X:{cropX}% · Y:{cropY}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Empty Scene State inside Scene Monitor */
          <div className="flex h-full max-h-[440px] w-full max-w-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-5 text-center">
            <Film className="h-8 w-8 text-primary-text/80" />
            <div>
              <p className="text-xs font-bold text-zinc-200">
                Cảnh #{activeScene.sceneIndex} chưa có Media
              </p>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-3">
                “{activeScene.transcriptText}”
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              hidden
              onChange={(e) => handleQuickUpload(e.target.files?.[0])}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="h-7 gap-1.5 bg-primary text-primary-foreground hover:bg-primary text-xs font-semibold"
            >
              <Upload className="h-3.5 w-3.5" />
              Chọn Video / Ảnh từ máy
            </Button>
          </div>
        )}
      </div>

      {/* 3. Scene Monitor Quick Crop & Trim Footer Bar (Only rendered when Crop Frame is ON) */}
      {showCropFrame && (
        <div className="flex h-8 shrink-0 items-center justify-between gap-2 overflow-hidden whitespace-nowrap border-t border-zinc-800/80 bg-surface-2 px-2.5 text-xs">
          <div className="flex min-w-0 items-center gap-1">
            {!compact && <span className="mr-1 text-xs text-zinc-400">Vùng cắt:</span>}
            {Y_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={!media.cleanUrl}
                onClick={() => applyCrop({ cropY: p.y })}
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-30",
                  Math.abs(cropY - p.y) <= 6
                    ? "bg-primary/15 text-primary-text font-semibold"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {media.isVideo && (
            <div className="flex shrink-0 items-center gap-1.5">
              {!compact && <span className="text-xs text-zinc-400">Bắt đầu:</span>}
              <input
                type="range"
                min={0}
                max={Math.max(10, Math.floor((sourceDurSec || 8) - 1))}
                step={0.5}
                value={trimStartSec}
                onChange={(e) => applyCrop({ trimStartSec: Number(e.target.value) })}
                aria-label="Giây bắt đầu của clip"
                className="h-1 w-14 accent-primary cursor-pointer"
              />
              <span className="font-mono text-xs text-primary-text w-6">
                {trimStartSec}s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
