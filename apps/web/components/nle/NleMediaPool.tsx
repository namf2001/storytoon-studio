"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { toast } from "sonner";
import {
  Eye,
  FileText,
  Film,
  FolderOpen,
  GripHorizontal,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Mic,
  PanelLeftClose,
  Plus,
  Search,
  Sparkles,
  Square,
  Upload,
  Volume2,
} from "lucide-react";
import { buildMediaUrlWithCrop, type Scene } from "@storytoon/shared-types";
import { api, DEFAULT_VOICE_CATALOG, type TtsVoice } from "@/lib/api";
import { cn, stripEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MediaPoolClip {
  label: string;
  url: string;
  badge?: string;
}

interface Props {
  selectedScene: Scene | null;
  videoClips: MediaPoolClip[];
  attachingMedia?: string | null;
  onAttachMedia: (mediaUrl: string, isLocalClip: boolean) => void;
  missingCount: number;
  batchGenerating: boolean;
  batchProgress: string;
  onGenerateAllMissing: () => void;
  // Script & Voice generator props
  title: string;
  setTitle: (v: string) => void;
  script: string;
  setScript: (v: string) => void;
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  creatingVideo: boolean;
  onCreateAndProcess: () => void;
  onClose?: () => void;
  initialTab?: "media" | "script";
  titlePlaceholder?: string;
  scriptPlaceholder?: string;
}

/** DaVinci Resolve style left-hand Media Pool and Script Generator dock. */
export function NleMediaPool({
  selectedScene,
  videoClips,
  attachingMedia,
  onAttachMedia,
  missingCount,
  batchGenerating,
  batchProgress,
  onGenerateAllMissing,
  title,
  setTitle,
  script,
  setScript,
  selectedVoice,
  setSelectedVoice,
  creatingVideo,
  onCreateAndProcess,
  onClose,
  initialTab,
  titlePlaceholder,
  scriptPlaceholder,
}: Props) {
  const [tab, setTab] = useState<"media" | "script">(initialTab ?? "media");

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);
  const [uploading, setUploading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "video" | "image">("all");
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [voices, setVoices] = useState<TtsVoice[]>(DEFAULT_VOICE_CATALOG);
  const [genderFilter, setGenderFilter] = useState<"all" | "Nam" | "Nữ">("all");
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sceneIdx = selectedScene?.sceneIndex ?? 1;
  const activeSceneCleanUrl = selectedScene?.imageUrl?.split("#")[0] ?? "";

  const { videoCount, imageCount } = useMemo(() => {
    let v = 0;
    let img = 0;
    for (const c of videoClips) {
      const clean = c.url.split("#")[0];
      if (/\.(jpe?g|png|webp|gif|svg)$/i.test(clean)) img++;
      else v++;
    }
    return { videoCount: v, imageCount: img };
  }, [videoClips]);

  const filteredClips = useMemo(() => {
    const q = mediaSearch.trim().toLowerCase();
    return videoClips.filter((c) => {
      const clean = c.url.split("#")[0];
      const isImg = /\.(jpe?g|png|webp|gif|svg)$/i.test(clean);
      if (mediaTypeFilter === "video" && isImg) return false;
      if (mediaTypeFilter === "image" && !isImg) return false;
      if (!q) return true;
      return (
        c.label.toLowerCase().includes(q) ||
        (c.badge && c.badge.toLowerCase().includes(q))
      );
    });
  }, [videoClips, mediaSearch, mediaTypeFilter]);

  const imageSlides = useMemo(
    () =>
      filteredClips
        .map((c) => ({
          cleanUrl: c.url.split("#")[0],
          label: c.label,
        }))
        .filter((item) => /\.(jpe?g|png|webp|gif|svg)$/i.test(item.cleanUrl))
        .map((item) => ({ src: item.cleanUrl, alt: item.label })),
    [filteredClips]
  );

  useEffect(() => {
    api
      .listVoices()
      .then((res) => {
        if (res.voices?.length) setVoices(res.voices);
      })
      .catch(() => {
        // fallback to DEFAULT_VOICE_CATALOG
      });
  }, []);

  const filteredVoices = voices.filter((v) =>
    genderFilter === "all" ? true : v.gender === genderFilter
  );

  const activeVoiceObj =
    voices.find((v) => v.id === selectedVoice) ?? voices[0];

  async function handlePreviewVoice(voiceIdToTest = selectedVoice) {
    if (isPlayingPreview && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingPreview(false);
      return;
    }

    setPreviewingVoice(true);
    const toastId = toast.loading(`Đang tạo bản nghe thử giọng "${voiceIdToTest}"...`);
    try {
      const res = await api.previewVoice(voiceIdToTest, script);
      setPreviewAudioUrl(res.audioUrl);
      toast.success(`Đang phát giọng mẫu: ${voiceIdToTest}`, {
        id: toastId,
        description: `“${res.text}”`,
      });
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(res.audioUrl);
      audioRef.current = audio;
      setIsPlayingPreview(true);
      audio.onended = () => setIsPlayingPreview(false);
      audio.onerror = () => setIsPlayingPreview(false);
      await audio.play();
    } catch (e) {
      toast.error("Không thể nghe thử giọng đọc", {
        id: toastId,
        description: (e as Error).message,
      });
      setIsPlayingPreview(false);
    } finally {
      setPreviewingVoice(false);
    }
  }

  const handleFileSelect = useCallback(
    async (file?: File) => {
      if (!file) return;
      setUploading(true);
      const toastId = toast.loading(`Đang tải ${file.name} lên Media Pool...`);
      try {
        const uploaded = await api.uploadMediaFile(file);
        const isVid =
          file.type.startsWith("video/") ||
          /\.(mp4|mov|webm)$/i.test(file.name);
        const urlWithCrop = buildMediaUrlWithCrop(
          uploaded.url,
          { cropX: 50, cropY: 50, cropZoom: 1, trimStartSec: 0 },
          isVid
        );
        onAttachMedia(urlWithCrop, true);
        toast.success(`Đã gắn ${file.name} vào Cảnh #${sceneIdx}`, { id: toastId });
      } catch (e) {
        toast.error("Không thể tải tệp lên", {
          id: toastId,
          description: (e as Error).message,
        });
      } finally {
        setUploading(false);
      }
    },
    [onAttachMedia, sceneIdx]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled: uploading,
    multiple: false,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "video/*": [".mp4", ".webm", ".mov"],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        handleFileSelect(acceptedFiles[0]);
      }
    },
  });

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-800 bg-surface-2 select-none overflow-hidden">
      {/* Media Pool Header Tabs */}
      <div className="flex h-9 shrink-0 items-center border-b border-zinc-800 bg-surface-3 px-2 gap-1">
        <button
          type="button"
          onClick={() => setTab("media")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-xs font-semibold transition-colors",
            tab === "media"
              ? "bg-zinc-800 text-primary-text shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Media Pool
        </button>

        <button
          type="button"
          onClick={() => setTab("script")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-xs font-semibold transition-colors",
            tab === "script"
              ? "bg-zinc-800 text-primary-text shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Kịch bản
        </button>

        {onClose && (
          <button aria-label="Thu gọn Media Pool (Bên trái)"
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Thu gọn Media Pool (Bên trái)"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {tab === "media" ? (
          <div className="space-y-2.5 p-2.5 text-xs">
            {/* Compact Single-Row Dropzone to Upload Local Video/Image */}
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed px-2.5 py-2 transition-all",
                isDragActive
                  ? "border-primary/60 bg-primary/15"
                  : "border-zinc-700/80 bg-zinc-900/40 hover:border-primary/50 hover:bg-zinc-900"
              )}
              title="Kéo thả hoặc nhấn để chọn MP4, MOV, JPG, PNG từ máy tính"
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-2 min-w-0">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary-text" />
                ) : (
                  <Upload className="h-3.5 w-3.5 shrink-0 text-primary-text" />
                )}
                <span className="truncate text-xs font-medium text-zinc-200">
                  {isDragActive
                    ? `Thả tệp vào Cảnh #${sceneIdx}`
                    : `Tải Video/Ảnh vào Cảnh #${sceneIdx}`}
                </span>
              </div>
              <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                MP4/PNG
              </span>
            </div>

            {/* Batch AI FLUX Generator */}
            {missingCount > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={batchGenerating}
                onClick={onGenerateAllMissing}
                className="h-7 w-full gap-1.5 text-xs"
              >
                {batchGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang vẽ FLUX ({batchProgress})...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Vẽ AI cho {missingCount} cảnh trống
                  </>
                )}
              </Button>
            )}

            {/* Video B-Roll & Image Library (Draggable + Lightbox Preview) */}
            <div className="space-y-2">
              {/* Filter Pills: All / Video / Image */}
              {videoClips.length > 0 && (
                <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMediaTypeFilter("all")}
                    className={cn(
                      "flex-1 rounded py-1 font-medium transition-colors",
                      mediaTypeFilter === "all"
                        ? "bg-zinc-800 text-primary-text font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Tất cả ({videoClips.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaTypeFilter("video")}
                    className={cn(
                      "flex-1 rounded py-1 font-medium transition-colors",
                      mediaTypeFilter === "video"
                        ? "bg-zinc-800 text-primary-text font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Film className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Video ({videoCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaTypeFilter("image")}
                    className={cn(
                      "flex-1 rounded py-1 font-medium transition-colors",
                      mediaTypeFilter === "image"
                        ? "bg-zinc-800 text-primary-text font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <ImageIcon className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Ảnh ({imageCount})
                  </button>
                </div>
              )}

              {videoClips.length > 4 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Lọc nhanh clip / ảnh góc chụp..."
                    className="h-7 border-zinc-800 bg-zinc-950 pl-8 text-xs"
                  />
                </div>
              )}

              {filteredClips.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 py-6 text-center text-xs text-muted-foreground">
                  Không có media nào trong mục này.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredClips.map((clip, idx) => {
                    const cleanPreview = clip.url.split("#")[0];
                    const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(cleanPreview);
                    const isBusy = attachingMedia === clip.url;
                    const isActiveInSelectedScene =
                      Boolean(activeSceneCleanUrl) && cleanPreview === activeSceneCleanUrl;
                    const slideIdx = isImage
                      ? imageSlides.findIndex((s) => s.src === cleanPreview)
                      : -1;

                    return (
                      <div
                        key={`${clip.url}-${clip.label}-${idx}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/x-nle-media",
                            JSON.stringify({ url: clip.url, isLocalClip: true })
                          );
                        }}
                        onClick={() => {
                          onAttachMedia(clip.url, true);
                          toast.success(`Đã gắn "${stripEmoji(clip.label)}" vào Cảnh #${sceneIdx}`);
                        }}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-lg border bg-black text-left transition-all cursor-grab active:cursor-grabbing",
                          isActiveInSelectedScene
                            ? "border-primary/60 ring-1 ring-primary-text/70"
                            : "border-zinc-800/80 hover:border-primary/50"
                        )}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                          {isImage ? (
                            <img
                              src={cleanPreview}
                              alt={stripEmoji(clip.label)}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <video
                              src={cleanPreview}
                              muted
                              preload="metadata"
                              onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                              onMouseLeave={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                              className="h-full w-full object-cover"
                            />
                          )}
                          <span className="absolute left-1 top-1 rounded bg-black/70 p-0.5 text-zinc-400">
                            <GripHorizontal className="h-2.5 w-2.5" />
                          </span>
                          {isActiveInSelectedScene ? (
                            <span className="absolute right-1 top-1 rounded bg-primary px-1 font-mono text-xs font-bold text-primary-foreground shadow">
                              Đang dùng
                            </span>
                          ) : (
                            clip.badge && (
                              <span className="absolute right-1 top-1 rounded bg-black/80 px-1 font-mono text-xs text-primary-text">
                                {clip.badge}
                              </span>
                            )
                          )}
                          {isImage && slideIdx >= 0 && (
                            <button aria-label="Phóng to xem chi tiết ảnh (Lightbox)"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex(slideIdx);
                              }}
                              className="absolute bottom-1 right-1 z-10 rounded bg-black/80 p-1 text-zinc-300 opacity-0 transition-opacity hover:bg-primary hover:text-black group-hover:opacity-100"
                              title="Phóng to xem chi tiết ảnh (Lightbox)"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>
                          )}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                              {isBusy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-3 w-3" /> Cảnh #{sceneIdx}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="truncate px-1.5 py-1 text-xs font-medium text-zinc-200">
                          {isImage ? (
                            <ImageIcon className="mr-1 inline h-2.5 w-2.5 text-primary-text" />
                          ) : (
                            <Film className="mr-1 inline h-2.5 w-2.5 text-primary-text" />
                          )}
                          {stripEmoji(clip.label)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Lightbox
              open={lightboxIndex >= 0}
              index={lightboxIndex}
              close={() => setLightboxIndex(-1)}
              slides={imageSlides}
            />
          </div>
        ) : (
          /* TAB 2: SCRIPT & VOICEOVER GENERATOR */
          <div className="space-y-3 p-3 text-xs">
            <div className="space-y-1">
              <span className="text-xs text-zinc-400">Tiêu đề dự án</span>
              <Input
                placeholder={titlePlaceholder || "VD: Barca 1-2 Real Madrid"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* VOICE SELECTOR & PREVIEW PANEL */}
            <div className="space-y-2 rounded-lg bg-zinc-900/70 p-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-text">
                  <Mic className="h-3.5 w-3.5" />
                  Chọn Giọng Đọc (Voice AI)
                </span>
                <div className="flex items-center rounded bg-zinc-950 p-0.5 text-xs">
                  {(["all", "Nam", "Nữ"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenderFilter(g)}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium transition-colors",
                        genderFilter === g
                          ? "bg-primary/15 text-primary-text font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {g === "all" ? `Tất cả (${voices.length})` : g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="h-8 flex-1 border-zinc-700 bg-zinc-950 text-xs text-zinc-100">
                    <SelectValue placeholder="Chọn giọng đọc..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {filteredVoices.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  size="sm"
                  variant={isPlayingPreview ? "destructive" : "secondary"}
                  disabled={previewingVoice}
                  onClick={() => handlePreviewVoice(selectedVoice)}
                  className="h-8 shrink-0 gap-1 px-2.5 text-xs font-semibold"
                  title="Nghe thử giọng đọc đã chọn"
                >
                  {previewingVoice ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-text" />
                  ) : isPlayingPreview ? (
                    <>
                      <Square className="h-3 w-3 fill-current" />
                      Dừng
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-primary-text" />
                      Nghe thử
                    </>
                  )}
                </Button>
              </div>

              {previewAudioUrl && (
                <audio
                  src={previewAudioUrl}
                  controls
                  className="h-7 w-full rounded opacity-90"
                />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Lời bình (Voiceover)</span>
                <span>
                  {script.trim() ? `${script.trim().split(/\s+/).length} từ` : "110-150 từ"}
                </span>
              </div>
              <Textarea
                rows={7}
                placeholder={
                  scriptPlaceholder ||
                  "Nhập kịch bản bóng đá (Hook 3s -> Bàn thắng -> Câu hỏi kết)..."
                }
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            <Button
              type="button"
              size="sm"
              disabled={creatingVideo || !script.trim()}
              onClick={onCreateAndProcess}
              className="h-8 w-full gap-1.5 text-xs"
            >
              {creatingVideo ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang tạo Voice ({selectedVoice}) + Chia cảnh...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Tạo Voice ({selectedVoice}) & Chia Cảnh Mới
                </>
              )}
            </Button>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
