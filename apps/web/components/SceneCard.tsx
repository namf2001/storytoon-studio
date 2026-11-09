"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crop,
  Film,
  ImagePlus,
  Loader2,
  MoveVertical,
  Play,
  RotateCcw,
  Sparkles,
  Subtitles,
  Upload,
  Wand2,
} from "lucide-react";
import {
  CAMERA_EFFECTS,
  TRANSITIONS,
  buildMediaUrlWithCrop,
  parseMediaCrop,
  type MediaAspectRatio,
  type Scene,
} from "@storytoon/shared-types";
import { api, fmtMs } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  scene: Scene;
  active: boolean;
  frameAspectRatio?: MediaAspectRatio | "9:16";
  onChange: (s: Scene) => void;
  onSeek: (ms: number) => void;
}

const CAMERA_LABELS: Record<Scene["cameraEffect"], string> = {
  static: "Tĩnh",
  zoom_in: "Zoom In",
  zoom_out: "Zoom Out",
  pan_left: "Pan Trái",
  pan_right: "Pan Phải",
  shake: "Rung",
};

const TRANSITION_LABELS: Record<Scene["transition"], string> = {
  cut: "Cut",
  fade: "Fade",
  slide: "Slide",
  wipe: "Wipe",
  flip: "Flip",
};

const Y_PRESETS = [
  { label: "Trên", y: 15 },
  { label: "Cao", y: 35 },
  { label: "Giữa", y: 50 },
  { label: "Thấp", y: 72 },
  { label: "Dưới", y: 90 },
];

/** Compact storyboard card supporting image/video upload and interactive aspect-ratio region cropping. */
export function SceneCard({
  scene,
  active,
  frameAspectRatio = "3:4",
  onChange,
  onSeek,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const media = parseMediaCrop(scene.imageUrl);
  const [cropX, setCropX] = useState(media.cropX);
  const [cropY, setCropY] = useState(media.cropY);
  const [cropZoom, setCropZoom] = useState(media.cropZoom);
  const [trimStartSec, setTrimStartSec] = useState(media.trimStartSec);

  const [showCropper, setShowCropper] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState(scene.imagePrompt);
  const [busy, setBusy] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [genError, setGenError] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync local crop state when scene.imageUrl changes externally
  useEffect(() => {
    const parsed = parseMediaCrop(scene.imageUrl);
    setCropX(parsed.cropX);
    setCropY(parsed.cropY);
    setCropZoom(parsed.cropZoom);
    setTrimStartSec(parsed.trimStartSec);
  }, [scene.imageUrl]);

  useEffect(() => {
    if (videoRef.current && media.isVideo) {
      videoRef.current.currentTime = trimStartSec;
    }
  }, [trimStartSec, media.cleanUrl, media.isVideo]);

  async function patch(p: Partial<Scene> & { imageUrl?: string | null }) {
    if (scene.id.startsWith("demo-")) {
      onChange({ ...scene, ...p });
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateScene(scene.id, p);
      onChange({ ...scene, ...updated });
    } finally {
      setBusy(false);
    }
  }

  function applyCrop(
    next: Partial<{
      cropX: number;
      cropY: number;
      cropZoom: number;
      trimStartSec: number;
    }>,
    persist = true
  ) {
    if (!scene.imageUrl) return;
    const nx = next.cropX ?? cropX;
    const ny = next.cropY ?? cropY;
    const nz = next.cropZoom ?? cropZoom;
    const nt = next.trimStartSec ?? trimStartSec;
    setCropX(nx);
    setCropY(ny);
    setCropZoom(nz);
    setTrimStartSec(nt);

    const newUrl = buildMediaUrlWithCrop(
      scene.imageUrl,
      { cropX: nx, cropY: ny, cropZoom: nz, trimStartSec: nt },
      media.isVideo
    );
    onChange({ ...scene, imageUrl: newUrl });
    if (persist && !scene.id.startsWith("demo-")) {
      api.updateScene(scene.id, { imageUrl: newUrl }).catch(() => {});
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setGenError("");
    setBusy(true);
    try {
      if (scene.id.startsWith("demo-")) {
        const uploaded = await api.uploadMediaFile(file);
        onChange({ ...scene, imageUrl: uploaded.url });
        return;
      }
      const updated = await api.uploadSceneImage(scene.id, file);
      onChange({ ...scene, ...updated });
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generateAIImage() {
    setGeneratingImg(true);
    setGenError("");
    try {
      const updated = await api.generateSceneImage(scene.id, prompt);
      onChange({ ...scene, ...updated });
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGeneratingImg(false);
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!media.cleanUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: cropX,
      startY: cropY,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const nx = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startX - dx * 0.45)));
    const ny = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startY - dy * 0.45)));
    applyCrop({ cropX: nx, cropY: ny }, false);
  }

  function handlePointerUp() {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    applyCrop({ cropX, cropY }, true);
  }

  const durationSec = ((scene.endMs - scene.startMs) / 1000).toFixed(1);
  const aspectClass =
    frameAspectRatio === "3:4"
      ? "aspect-[3/4]"
      : frameAspectRatio === "1:1"
        ? "aspect-square"
        : frameAspectRatio === "4:3"
          ? "aspect-[4/3]"
          : "aspect-video";

  // Visual 9:16 source indicator window height %
  const cropWindowHeightPct =
    frameAspectRatio === "3:4"
      ? 68
      : frameAspectRatio === "1:1"
        ? 55
        : frameAspectRatio === "4:3"
          ? 44
          : 34;
  const maxTopPct = 100 - cropWindowHeightPct;
  const windowTopPct = (cropY / 100) * maxTopPct;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-150 border-0",
        active
          ? "ring-1 ring-primary/40 bg-primary/[0.03]"
          : "hover:bg-muted/30"
      )}
    >
      <CardContent className="p-3">
        <div className="grid gap-3 md:grid-cols-12">
          {/* Left Column: Media Preview + Drag-to-Crop (4 cols) */}
          <div className="flex flex-col gap-1.5 md:col-span-4">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files[0]);
              }}
              className={cn(
                "group relative w-full overflow-hidden rounded-lg bg-black select-none",
                aspectClass,
                media.cleanUrl
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-pointer bg-muted/20"
              )}
              onClick={() => !media.cleanUrl && fileRef.current?.click()}
            >
              {media.cleanUrl ? (
                <>
                  {media.isVideo ? (
                    <video
                      ref={videoRef}
                      src={media.cleanUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `${cropX}% ${cropY}%`,
                        transformOrigin: `${cropX}% ${cropY}%`,
                        transform: `scale(${cropZoom})`,
                      }}
                    />
                  ) : (
                    <img
                      src={media.cleanUrl}
                      alt={`Scene ${scene.sceneIndex}`}
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `${cropX}% ${cropY}%`,
                        transformOrigin: `${cropX}% ${cropY}%`,
                        transform: `scale(${cropZoom})`,
                      }}
                    />
                  )}

                  {/* Top badges on media */}
                  <div className="pointer-events-none absolute inset-x-1.5 top-1.5 flex items-center justify-between">
                    <Badge className="bg-black/75 px-1.5 py-0 text-[10px] font-mono text-white backdrop-blur-sm">
                      {media.isVideo ? "VIDEO" : "ẢNH"} · {frameAspectRatio}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-white/25 bg-black/75 px-1.5 py-0 text-[10px] font-mono text-amber-300 backdrop-blur-sm"
                    >
                      <MoveVertical className="mr-0.5 h-2.5 w-2.5" />
                      Y:{cropY}% · {cropZoom}x
                    </Badge>
                  </div>

                  {/* Drag hint */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 py-1 text-center text-[10px] text-white/85 opacity-0 transition-opacity group-hover:opacity-100">
                    Kéo lên/xuống để chọn vùng khung hình
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-3 text-center">
                  {busy ? (
                    <Loader2 className="mb-1 h-5 w-5 animate-spin text-primary-text" />
                  ) : (
                    <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] font-medium text-foreground">
                    Thêm Video / Ảnh
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    MP4, MOV, JPG, PNG
                  </span>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
              hidden
              onChange={(e) => upload(e.target.files?.[0])}
            />

            {/* Compact Media Action Bar */}
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || generatingImg}
                onClick={() => fileRef.current?.click()}
                className="h-7 flex-1 gap-1 px-2 text-[11px]"
                title="Tải Video MP4 hoặc Ảnh từ máy"
              >
                <Film className="h-3 w-3 text-primary-text" />
                Tải Video/Ảnh
              </Button>

              <Button
                type="button"
                variant={ media.cleanUrl ? "outline" : "default" }
                size="sm"
                disabled={generatingImg || busy}
                onClick={generateAIImage}
                className="h-7 flex-1 gap-1 px-2 text-[11px]"
              >
                {generatingImg ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI FLUX
              </Button>

              {media.cleanUrl && (
                <Button aria-label="Chỉnh vùng lấy hình từ video gốc"
                  type="button"
                  variant={showCropper ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCropper((v) => !v)}
                  className="h-7 px-2 text-[11px]"
                  title="Chỉnh vùng lấy hình từ video gốc"
                >
                  <Crop className="h-3 w-3" />
                </Button>
              )}
            </div>

            {genError && (
              <p className="text-[10px] text-red-400 leading-tight">{genError}</p>
            )}
          </div>

          {/* Right Column: Compact Info & Controls (8 cols) */}
          <div className="flex flex-col justify-between gap-2 md:col-span-8">
            {/* Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={active ? "default" : "secondary"}
                  className="h-5 px-2 font-mono text-[11px]"
                >
                  #{scene.sceneIndex}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSeek(scene.startMs)}
                  className="h-6 gap-1 px-1.5 font-mono text-xs text-muted-foreground hover:text-primary-text"
                >
                  <Play className="h-3 w-3 fill-current" />
                  {fmtMs(scene.startMs)}–{fmtMs(scene.endMs)} ({durationSec}s)
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrompt((v) => !v)}
                  className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                >
                  Prompt AI
                  {showPrompt ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Setting / Footage Hint */}
            {scene.setting && (
              <div className="truncate text-[11px] text-amber-400/90 font-medium">
                {scene.setting}
              </div>
            )}

            {/* Spoken Transcript */}
            <div className="rounded-md bg-muted/20 px-3 py-2 text-xs leading-relaxed text-foreground">
              “{scene.transcriptText}”
            </div>

            {/* Interactive Crop Panel (when toggled or for adjusting 9:16 -> 3:4 / 4:3) */}
            {showCropper && media.cleanUrl && (
              <div className="rounded-lg bg-primary/[0.04] p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-text">
                    <Crop className="h-3.5 w-3.5" />
                    Chọn vùng lấy hình ({frameAspectRatio} từ gốc 9:16)
                  </span>
                  <div className="flex items-center gap-1">
                    {Y_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyCrop({ cropY: p.y })}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                          Math.abs(cropY - p.y) <= 6
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button aria-label="Đặt lại mặc định"
                      type="button"
                      onClick={() =>
                        applyCrop({ cropX: 50, cropY: 50, cropZoom: 1, trimStartSec: 0 })
                      }
                      title="Đặt lại mặc định"
                      className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Mini 9:16 Visual Frame Map */}
                  <div
                    className="relative h-20 w-11 shrink-0 overflow-hidden rounded border border-white/20 bg-black/80"
                    title="Khung gốc 9:16 vs vùng lấy hình"
                  >
                    <div
                      style={{
                        top: `${windowTopPct}%`,
                        height: `${cropWindowHeightPct}%`,
                      }}
                      className="absolute inset-x-0.5 rounded-sm border-2 border-amber-400 bg-amber-400/20 transition-all"
                    />
                  </div>

                  {/* Sliders */}
                  <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    <label className="space-y-0.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Vị trí Dọc (Y)</span>
                        <span className="font-mono text-foreground">{cropY}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={cropY}
                        onChange={(e) => applyCrop({ cropY: Number(e.target.value) })}
                        className="h-1.5 w-full accent-amber-400 cursor-pointer"
                      />
                    </label>

                    <label className="space-y-0.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Vị trí Ngang (X)</span>
                        <span className="font-mono text-foreground">{cropX}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={cropX}
                        onChange={(e) => applyCrop({ cropX: Number(e.target.value) })}
                        className="h-1.5 w-full accent-amber-400 cursor-pointer"
                      />
                    </label>

                    <label className="space-y-0.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Phóng to (Zoom)</span>
                        <span className="font-mono text-foreground">{cropZoom}x</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={2.2}
                        step={0.05}
                        value={cropZoom}
                        onChange={(e) => applyCrop({ cropZoom: Number(e.target.value) })}
                        className="h-1.5 w-full accent-amber-400 cursor-pointer"
                      />
                    </label>

                    {media.isVideo && (
                      <label className="space-y-0.5">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Bắt đầu từ giây</span>
                          <span className="font-mono text-foreground">{trimStartSec}s</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={0.5}
                          value={trimStartSec}
                          onChange={(e) =>
                            applyCrop({ trimStartSec: Number(e.target.value) })
                          }
                          className="h-1.5 w-full accent-amber-400 cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible AI Image Prompt */}
            {showPrompt && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Prompt tiếng Anh (FLUX / Midjourney)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 text-[10px] text-primary-text hover:underline"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Đã copy" : "Copy"}
                  </button>
                </div>
                <Textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onBlur={() => prompt !== scene.imagePrompt && patch({ imagePrompt: prompt })}
                  className="font-mono text-[11px] leading-snug"
                />
              </div>
            )}

            {/* Bottom Compact Controls Row */}
            <div className="grid grid-cols-3 gap-2 pt-0.5 items-center">
              <Select
                value={scene.cameraEffect}
                disabled={busy}
                onValueChange={(val) =>
                  patch({ cameraEffect: val as Scene["cameraEffect"] })
                }
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <Camera className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_EFFECTS.map((effect) => (
                    <SelectItem key={effect} value={effect} className="text-xs">
                      {CAMERA_LABELS[effect] ?? effect}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={scene.transition}
                disabled={busy}
                onValueChange={(val) =>
                  patch({ transition: val as Scene["transition"] })
                }
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <Wand2 className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSITIONS.map((tr) => (
                    <SelectItem key={tr} value={tr} className="text-xs">
                      {TRANSITION_LABELS[tr] ?? tr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex h-7 items-center justify-between rounded-md bg-muted/20 px-2.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Subtitles className="h-3 w-3" />
                  Phụ đề
                </span>
                <Switch
                  checked={scene.showCaption}
                  disabled={busy}
                  onCheckedChange={(checked) => patch({ showCaption: checked })}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
