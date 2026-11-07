"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  Copy,
  Crop,
  Eye,
  EyeOff,
  Film,
  Grid,
  Hash,
  Info,
  Layers,
  Loader2,
  Move,
  Palette,
  PanelRightClose,
  Plus,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Tv,
  Type,
  Upload,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import {
  CAMERA_EFFECTS,
  TRANSITIONS,
  buildMediaUrlWithCrop,
  parseMediaCrop,
  type CaptionWord,
  type FootballBroadcastConfig,
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
import { NleCaptionTrimmer } from "./NleCaptionTrimmer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ColorPickerPopover } from "@/components/ui/color-picker";

interface Props {
  scene: Scene | null;
  totalScenes?: number;
  frameAspectRatio: MediaAspectRatio;
  onSceneChange: (updated: Scene) => void;
  onSeek?: (ms: number) => void;
  broadcastConfig?: FootballBroadcastConfig;
  onBroadcastChange?: React.Dispatch<React.SetStateAction<FootballBroadcastConfig>>;
  onThemeChange?: (theme: "navy" | "crimson") => void;
  onClose?: () => void;
  allScenes?: Scene[];
  words?: CaptionWord[];
  totalDurationMs?: number;
  onUpdateBounds?: (
    sceneId: string,
    newStartMs: number,
    newEndMs: number,
    newTranscriptText?: string
  ) => void;
  onSplitSceneAtMs?: (sceneId: string, splitMs: number) => void;
  onMergeScene?: (sceneId: string, direction: "prev" | "next") => void;
  onAddSceneAfter?: (sceneId: string) => void;
  onDeleteScene?: (sceneId: string) => void;
  audioUrl?: string | null;
}

const CAMERA_LABELS: Record<Scene["cameraEffect"], string> = {
  static: "Đứng yên (Static)",
  zoom_in: "Phóng to (Zoom In)",
  zoom_out: "Thu nhỏ (Zoom Out)",
  pan_left: "Lia trái (Pan Left)",
  pan_right: "Lia phải (Pan Right)",
  shake: "Rung chấn (Shake)",
};

const TRANSITION_LABELS: Record<Scene["transition"], string> = {
  cut: "Cắt thẳng (Cut)",
  fade: "Mờ dần (Fade)",
  slide: "Trượt ngang (Slide)",
  wipe: "Quẹt ngang (Broadcast Wipe)",
  flip: "Lật 3D (Broadcast Flip)",
};

const Y_PRESETS = [
  { label: "Đỉnh", y: 10 },
  { label: "Cao", y: 30 },
  { label: "Giữa", y: 50 },
  { label: "Thấp", y: 72 },
  { label: "Đáy", y: 92 },
];

const ASPECT_OPTIONS: { value: MediaAspectRatio; label: string }[] = [
  { value: "3:4", label: "3:4 Dọc" },
  { value: "4:3", label: "4:3 Chuẩn" },
  { value: "16:9", label: "16:9 Ngang" },
  { value: "1:1", label: "1:1 Vuông" },
];

const BG_VIDEO_PRESETS = [
  {
    id: "stadium",
    title: "Sân cỏ thể thao",
    desc: "Ánh sáng SVĐ xoay vòng",
    icon: "🏟️",
    url: "/media/football-assets/bg_loop.mp4",
  },
  {
    id: "bokeh",
    title: "Bokeh điện ảnh",
    desc: "Hạt mờ Pinterest êm dịu",
    icon: "✨",
    url: "/media/football-assets/pinterest_bg.mp4",
  },
  {
    id: "gold",
    title: "Hạt vàng hoàng kim",
    desc: "Tia sáng lấp lánh cao cấp",
    icon: "🌟",
    url: "/media/football-assets/bokeh_particles_bg.mp4",
  },
  {
    id: "gradient",
    title: "Dải màu Gradient",
    desc: "Thuần màu không dùng video",
    icon: "🎨",
    url: "none",
  },
];

/** DaVinci Resolve style right-hand Inspector for the selected timeline clip and broadcast graphics. */
export function NleInspector({
  scene,
  frameAspectRatio,
  onSceneChange,
  onSeek,
  broadcastConfig,
  onBroadcastChange,
  onThemeChange,
  onClose,
  allScenes = [],
  words = [],
  totalDurationMs = 60000,
  onUpdateBounds,
  onSplitSceneAtMs,
  onMergeScene,
  onAddSceneAfter,
  onDeleteScene,
  audioUrl,
}: Props) {
  const [tab, setTab] = useState<"clip" | "broadcast_stripes" | "vtv_news_template">("clip");

  // Đồng bộ tab nếu đang xem cấu hình template và templateId thay đổi
  useEffect(() => {
    if (tab !== "clip" && broadcastConfig?.templateId) {
      const target = broadcastConfig.templateId === "vtv_news_template" ? "vtv_news_template" : "broadcast_stripes";
      if (tab !== target) {
        setTab(target);
      }
    }
  }, [broadcastConfig?.templateId, tab]);

  const fileRef = useRef<HTMLInputElement>(null);

  const media = parseMediaCrop(scene?.imageUrl);
  const [cropX, setCropX] = useState(media.cropX);
  const [cropY, setCropY] = useState(media.cropY);
  const [cropZoom, setCropZoom] = useState(media.cropZoom);
  const [trimStartSec, setTrimStartSec] = useState(media.trimStartSec);
  const [autoFitSpeed, setAutoFitSpeed] = useState<boolean>(
    media.autoFitSpeed ?? scene?.autoFitSpeed ?? true
  );
  const [manualSpeed, setManualSpeed] = useState<number>(
    media.playbackRate ?? scene?.playbackRate ?? 1.0
  );
  const [prompt, setPrompt] = useState(scene?.imagePrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const bgVideoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBgVideo, setUploadingBgVideo] = useState(false);

  const handleBgVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBgVideo(true);
    const toastId = toast.loading(`Đang tải video nền "${file.name}"...`);
    try {
      const res = await api.uploadMediaFile(file);
      const cleanUrl = res.url.split("#")[0];
      onBroadcastChange?.((c) => ({
        ...c,
        backgroundVideoUrl: cleanUrl,
      }));
      toast.success("Đã đổi video nền thành công!", { id: toastId });
    } catch (err) {
      toast.error("Lỗi tải video nền", {
        id: toastId,
        description: (err as Error).message,
      });
    } finally {
      setUploadingBgVideo(false);
      if (bgVideoInputRef.current) bgVideoInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const parsed = parseMediaCrop(scene?.imageUrl);
    setCropX(parsed.cropX);
    setCropY(parsed.cropY);
    setCropZoom(parsed.cropZoom);
    setTrimStartSec(parsed.trimStartSec);
    setAutoFitSpeed(parsed.autoFitSpeed ?? scene?.autoFitSpeed ?? true);
    setManualSpeed(parsed.playbackRate ?? scene?.playbackRate ?? 1.0);
    setPrompt(scene?.imagePrompt ?? "");
  }, [scene?.id, scene?.imageUrl, scene?.imagePrompt]);

  const sceneDurSec = scene ? Math.max(0.1, (scene.endMs - scene.startMs) / 1000) : 6.0;
  const sourceDurSec =
    scene?.sourceDurationSec ??
    media.sourceDurationSec ??
    (media.cleanUrl.includes("raw_") ? 7.98 : 8.0);

  const effectivePlaybackRate = useMemo(() => {
    if (autoFitSpeed && sourceDurSec > 0 && sceneDurSec > 0) {
      const usable = Math.max(0.1, sourceDurSec - trimStartSec);
      return Math.min(5.0, Math.max(0.2, Number((usable / sceneDurSec).toFixed(3))));
    }
    return manualSpeed || 1.0;
  }, [autoFitSpeed, sourceDurSec, trimStartSec, sceneDurSec, manualSpeed]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const layerImgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLayerTargetId, setUploadingLayerTargetId] = useState<string | null>(null);

  const activeLayers: SceneLayer[] = React.useMemo(() => {
    if (!scene) return [];
    if (scene.layers && scene.layers.length > 0) {
      return scene.layers;
    }
    return [
      {
        id: "media-default",
        type: "media",
        name: "Media Nền Toàn Khung",
        mediaUrl: scene.imageUrl || "",
        motion: scene.cameraEffect || "zoom_in",
        visible: true,
      } as MediaLayer,
    ];
  }, [scene?.id, scene?.layers, scene?.imageUrl, scene?.cameraEffect]);

  const effectiveSelectedLayerId =
    selectedLayerId && activeLayers.some((l) => l.id === selectedLayerId)
      ? selectedLayerId
      : activeLayers[0]?.id ?? "media-default";

  const selectedLayer =
    activeLayers.find((l) => l.id === effectiveSelectedLayerId) ?? activeLayers[0] ?? null;

  if (!scene) {
    return (
      <aside className="flex h-full w-full flex-col border-l border-zinc-800 bg-surface-2 p-4 text-xs text-zinc-500">
        Chọn một phân cảnh trên Timeline để chỉnh sửa.
      </aside>
    );
  }

  const activeScene = scene;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeScene.id);

  async function patchScene(p: Partial<Scene> & { imageUrl?: string | null }) {
    // Optimistic update right away so Scene Monitor, Program Monitor & Timeline react instantly!
    const optimistic: Scene = { ...activeScene, ...p };
    onSceneChange(optimistic);

    if (activeScene.id.startsWith("demo-") || activeScene.projectId?.startsWith("demo-") || !isUuid) {
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateScene(activeScene.id, p);
      // ONLY merge server fields for properties that were explicitly patched.
      // Never overwrite un-patched fields (such as startMs/endMs from timeline resizing)
      const safeMerge: Partial<Scene> = {};
      if (p.imageUrl !== undefined && updated.imageUrl) {
        safeMerge.imageUrl = updated.imageUrl;
      }
      for (const key of Object.keys(p) as (keyof Scene)[]) {
        if (key in updated && (updated as any)[key] !== undefined) {
          (safeMerge as any)[key] = (updated as any)[key];
        }
      }
      onSceneChange({ ...optimistic, ...safeMerge });
    } catch (e) {
      toast.error(`Lỗi cập nhật Cảnh #${activeScene.sceneIndex}`, {
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  function updateLayer(layerId: string, patch: Partial<SceneLayer>) {
    const nextLayers = activeLayers.map((l) =>
      l.id === layerId ? ({ ...l, ...patch } as SceneLayer) : l
    );
    const primaryBg = nextLayers.find((l) => l.type === "media") as MediaLayer | undefined;
    patchScene({
      layers: nextLayers,
      imageUrl: primaryBg?.mediaUrl ? primaryBg.mediaUrl : activeScene.imageUrl,
    });
  }

  function addLayer(newLayer: SceneLayer) {
    const nextLayers = [...activeLayers, newLayer];
    setSelectedLayerId(newLayer.id);
    patchScene({ layers: nextLayers });
    toast.success(`Đã thêm layer: ${newLayer.name || newLayer.type}`);
  }

  function deleteLayer(layerId: string) {
    if (activeLayers.length <= 1) {
      toast.error("Cảnh cần giữ lại ít nhất 1 layer!");
      return;
    }
    const nextLayers = activeLayers.filter((l) => l.id !== layerId);
    patchScene({ layers: nextLayers });
    if (selectedLayerId === layerId) {
      setSelectedLayerId(nextLayers[0]?.id ?? null);
    }
    toast.info("Đã xóa layer");
  }

  function toggleLayerVisible(layerId: string) {
    const nextLayers = activeLayers.map((l) =>
      l.id === layerId ? { ...l, visible: l.visible === false ? true : false } : l
    );
    patchScene({ layers: nextLayers });
  }

  const applyLayoutPreset = (preset: SceneLayoutType) => {
    let newLayers: SceneLayer[] = [];
    const baseMedia = activeScene.imageUrl || "/media/football-assets/nguoi_da_bong_logo.png";
    const baseMotion = activeScene.cameraEffect || "zoom_in";

    if (preset === "standard") {
      newLayers = [
        {
          id: `media-${Date.now()}`,
          type: "media",
          name: "Media Nền Toàn Khung",
          mediaUrl: baseMedia,
          motion: baseMotion,
          visible: true,
        },
      ];
    } else if (preset === "split_compare") {
      newLayers = [
        {
          id: `left-${Date.now()}`,
          type: "media",
          name: "Ảnh / Video Trái",
          mediaUrl: baseMedia,
          motion: "zoom_in",
          visible: true,
        },
        {
          id: `right-${Date.now() + 1}`,
          type: "media",
          name: "Ảnh / Video Phải",
          mediaUrl: baseMedia,
          motion: "zoom_in",
          visible: true,
        },
        {
          id: `text-vs-${Date.now() + 2}`,
          type: "text",
          name: "Nhãn VS Đối Đầu",
          text: "SIÊU KINH ĐIỂN",
          subtitle: "ĐẠI CHIẾN ĐỈNH CAO",
          stylePreset: "headline_box",
          color: "#FFD600",
          position: { x: 50, y: 85 },
          animation: "slide_up",
          visible: true,
        },
      ];
    } else if (preset === "quote_card") {
      newLayers = [
        {
          id: `bg-${Date.now()}`,
          type: "media",
          name: "Nền Mờ Hậu Cảnh",
          mediaUrl: baseMedia,
          blur: 8,
          motion: baseMotion,
          visible: true,
        },
        {
          id: `quote-${Date.now() + 1}`,
          type: "text",
          name: "Khung Trích Dẫn Phát Biểu",
          text: `“${activeScene.transcriptText || "Chiến thắng này là của toàn đội!"}”`,
          subtitle: activeScene.characters?.[0] ? `— ${activeScene.characters[0]}` : "— PHÁT BIỂU SAU TRẬN",
          stylePreset: "quote_card",
          color: "#FFFFFF",
          position: { x: 50, y: 55 },
          animation: "pop_in",
          visible: true,
        },
      ];
    } else if (preset === "player_card") {
      newLayers = [
        {
          id: `bg-${Date.now()}`,
          type: "media",
          name: "Nền Sân Bóng",
          mediaUrl: baseMedia,
          motion: baseMotion,
          visible: true,
        },
        {
          id: `badge-${Date.now() + 1}`,
          type: "text",
          name: "Thẻ Điểm Nhấn Cầu Thủ",
          text: "⚽ BÀN THẮNG QUYẾT ĐỊNH",
          subtitle: activeScene.characters?.[0]
            ? `${activeScene.characters[0].toUpperCase()} • PHÚT 87'`
            : "KYLIAN MBAPPÉ • PHÚT 87'",
          stylePreset: "stat_badge",
          color: "#FFD600",
          position: { x: 50, y: 80 },
          animation: "slide_up",
          visible: true,
        },
      ];
    } else if (preset === "breaking_badge") {
      newLayers = [
        {
          id: `bg-${Date.now()}`,
          type: "media",
          name: "Video / Ảnh Nền Hành Động",
          mediaUrl: baseMedia,
          motion: baseMotion,
          visible: true,
        },
        {
          id: `badge-${Date.now() + 1}`,
          type: "text",
          name: "Băng Rôn Điểm Nhấn Nổi Bật",
          text: "🚨 ĐỊA CHẤN BÓNG ĐÁ",
          subtitle: "KẾT QUẢ NGOÀI MỌI DỰ ĐOÁN",
          stylePreset: "neon_tag",
          color: "#00E5FF",
          position: { x: 50, y: 78 },
          animation: "pop_in",
          visible: true,
        },
      ];
    }

    patchScene({
      layoutType: preset,
      layers: newLayers,
    });
    setSelectedLayerId(newLayers[0]?.id ?? null);
    toast.success(`Đã áp dụng bố cục: ${preset}`);
  };

  const handleLayerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingLayerTargetId) return;
    const toastId = toast.loading(`Đang tải ảnh ${file.name}...`);
    try {
      const res = await api.uploadMediaFile(file);
      const cleanUrl = res.url.split("#")[0];
      updateLayer(uploadingLayerTargetId, { imageUrl: cleanUrl });
      toast.success("Đã tải ảnh layer thành công!", { id: toastId });
    } catch (err) {
      toast.error("Lỗi tải ảnh layer", {
        id: toastId,
        description: (err as Error).message,
      });
    } finally {
      if (layerImgInputRef.current) layerImgInputRef.current.value = "";
      setUploadingLayerTargetId(null);
    }
  };

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
    if (!activeScene.imageUrl) return;
    const nx = Math.max(0, Math.min(100, Math.round(next.cropX ?? cropX)));
    const ny = Math.max(0, Math.min(100, Math.round(next.cropY ?? cropY)));
    const nz = Math.max(
      1,
      Math.min(4.0, Number((next.cropZoom ?? cropZoom).toFixed(2)))
    );
    const nt = Math.max(0, Number((next.trimStartSec ?? trimStartSec).toFixed(1)));
    const nextAutoFit = next.autoFitSpeed ?? autoFitSpeed;
    const nextSpeed = next.playbackRate ?? manualSpeed;
    const nextSrcDur =
      next.sourceDurationSec ??
      activeScene.sourceDurationSec ??
      media.sourceDurationSec ??
      (media.cleanUrl.includes("raw_") ? 7.98 : undefined);

    setCropX(nx);
    setCropY(ny);
    setCropZoom(nz);
    setTrimStartSec(nt);
    setAutoFitSpeed(nextAutoFit);
    setManualSpeed(nextSpeed);

    const newUrl = buildMediaUrlWithCrop(
      activeScene.imageUrl,
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
    const updatedScene: Scene = {
      ...activeScene,
      imageUrl: newUrl,
      autoFitSpeed: nextAutoFit,
      playbackRate: nextSpeed,
      sourceDurationSec: nextSrcDur,
    };
    onSceneChange(updatedScene);
    if (persist && !activeScene.id.startsWith("demo-") && !activeScene.projectId?.startsWith("demo-") && isUuid) {
      api.updateScene(activeScene.id, { imageUrl: newUrl }).catch(() => {});
    }
  }

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setBusy(true);
    const toastId = toast.loading(
      `Đang tải ${file.name} vào Cảnh #${activeScene.sceneIndex}...`
    );
    try {
      if (activeScene.id.startsWith("demo-")) {
        const uploaded = await api.uploadMediaFile(file);
        onSceneChange({ ...activeScene, imageUrl: uploaded.url });
        toast.success(`Đã gắn ${file.name} vào Cảnh #${activeScene.sceneIndex}`, {
          id: toastId,
        });
        return;
      }
      const updated = await api.uploadSceneImage(activeScene.id, file);
      onSceneChange({ ...activeScene, imageUrl: updated.imageUrl });
      toast.success(`Đã cập nhật media cho Cảnh #${activeScene.sceneIndex}`, {
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

  async function handleGenerateAI() {
    setGeneratingImg(true);
    const toastId = toast.loading(
      `Đang vẽ ảnh AI FLUX cho Cảnh #${activeScene.sceneIndex}...`
    );
    try {
      const updated = await api.generateSceneImage(activeScene.id, prompt);
      onSceneChange({
        ...activeScene,
        imageUrl: updated.imageUrl,
        imagePrompt: updated.imagePrompt ?? prompt,
      });
      toast.success(`Đã tạo xong ảnh FLUX cho Cảnh #${activeScene.sceneIndex}!`, {
        id: toastId,
      });
    } catch (e) {
      toast.error("Lỗi vẽ ảnh AI FLUX", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setGeneratingImg(false);
    }
  }

  const durSec = ((activeScene.endMs - activeScene.startMs) / 1000).toFixed(1);

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-800 bg-surface-2 select-none overflow-hidden">
      {/* Inspector Header Tabs */}
      <div className="flex h-9 shrink-0 items-center border-b border-zinc-800 bg-surface-3 px-1.5 gap-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setTab("clip")}
          className={cn(
            "flex flex-1 min-w-0 items-center justify-center gap-1 rounded py-1 px-1.5 text-[11px] font-semibold transition-colors",
            tab === "clip"
              ? "bg-zinc-800 text-amber-400 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
          title={`Chỉnh sửa Cắt/Zoom/Motion của Cảnh #${activeScene.sceneIndex}`}
        >
          <Sliders className="h-3 w-3 shrink-0" />
          <span className="truncate">Cảnh #{activeScene.sceneIndex}</span>
        </button>

        {broadcastConfig && onBroadcastChange && (
          <>
            <button
              type="button"
              onClick={() => {
                setTab("broadcast_stripes");
                onBroadcastChange((c) => ({
                  ...c,
                  templateId: "broadcast_stripes",
                }));
              }}
              className={cn(
                "flex flex-1 min-w-0 items-center justify-center gap-1 rounded py-1 px-1.5 text-[11px] font-semibold transition-colors",
                tab === "broadcast_stripes"
                  ? "bg-zinc-800 text-amber-400 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
              title="Đồ họa Bản tin Thể thao truyền thống (Kẻ sọc & Ticker)"
            >
              <Tv className="h-3 w-3 shrink-0 text-sky-400" />
              <span className="truncate">Bản tin Đồ họa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("vtv_news_template");
                onBroadcastChange((c) => ({
                  ...c,
                  templateId: "vtv_news_template",
                }));
              }}
              className={cn(
                "flex flex-1 min-w-0 items-center justify-center gap-1 rounded py-1 px-1.5 text-[11px] font-semibold transition-colors",
                tab === "vtv_news_template"
                  ? "bg-zinc-800 text-amber-400 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
              title="Mẫu video ngắn Editorial VTV News Reel (Liquid Glass & Video Loop)"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
              <span className="truncate">VTV News Reel</span>
            </button>
          </>
        )}

        {onClose && (
          <button aria-label="Thu gọn Inspector (Bên phải)"
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Thu gọn Inspector (Bên phải)"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {tab === "clip" ? (
          <div className="space-y-3.5 p-3.5 text-xs">
            {/* JOG WHEEL CAPTION TRIMMER & SCENE IN/OUT SCROLLER */}
            <NleCaptionTrimmer
              scene={activeScene}
              allScenes={allScenes.length > 0 ? allScenes : [activeScene]}
              words={words}
              totalDurationMs={totalDurationMs}
              onUpdateBounds={(id, sMs, eMs, txt) => {
                if (onUpdateBounds) {
                  onUpdateBounds(id, sMs, eMs, txt);
                } else {
                  patchScene({
                    startMs: sMs,
                    endMs: eMs,
                    transcriptText: txt ?? activeScene.transcriptText,
                  });
                }
              }}
              onSplitSceneAtMs={onSplitSceneAtMs}
              onMergeScene={onMergeScene}
              onAddSceneAfter={onAddSceneAfter}
              onDeleteScene={onDeleteScene}
              onSeek={onSeek}
              audioUrl={audioUrl}
            />

            {/* Hidden Input for Layer Image Upload */}
            <input
              ref={layerImgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleLayerImageUpload}
            />

            {/* 1. LAYERS MANAGER (DANH SÁCH LAYER TRONG CẢNH) */}
            <div className="space-y-2 rounded-lg bg-surface-3 p-3 border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
                  Danh sách Layer ({activeLayers.length})
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      addLayer({
                        id: `text-${Date.now()}`,
                        type: "text",
                        name: "Chữ Callout",
                        text: "TIÊU ĐỀ ĐIỂM NHẤN",
                        subtitle: "Mô tả ngắn bổ sung",
                        stylePreset: "headline_box",
                        color: "#FFD600",
                        position: { x: 50, y: 78 },
                        animation: "slide_up",
                        visible: true,
                      })
                    }
                    className="h-6 px-1.5 text-[10px] text-amber-400 hover:bg-zinc-800"
                    title="Thêm layer chữ / callout"
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> + Chữ
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      addLayer({
                        id: `img-${Date.now()}`,
                        type: "image",
                        name: "Ảnh nổi / Cutout",
                        imageUrl: activeScene.imageUrl || "/media/football-assets/nguoi_da_bong_logo.png",
                        position: { x: 50, y: 45 },
                        size: { width: 35 },
                        animation: "pop_in",
                        shadow: true,
                        visible: true,
                      })
                    }
                    className="h-6 px-1.5 text-[10px] text-sky-400 hover:bg-zinc-800"
                    title="Thêm layer ảnh nổi / cutout / sticker"
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> + Ảnh nổi
                  </Button>
                </div>
              </div>

              {/* Layer Items */}
              <div className="space-y-1">
                {activeLayers.map((l, idx) => {
                  const isSelected = effectiveSelectedLayerId === l.id;
                  const icon = l.type === "media" ? "🎬" : l.type === "text" ? "🔤" : "🖼️";
                  const title =
                    l.name ||
                    (l.type === "media"
                      ? "Media Nền"
                      : l.type === "text"
                        ? (l as TextLayer).text
                        : "Ảnh nổi");
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLayerId(l.id)}
                      className={cn(
                        "flex items-center justify-between rounded p-1.5 text-[11px] transition-all cursor-pointer",
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/60 font-semibold"
                          : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{title}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            Layer #{idx + 1} • {l.type.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleLayerVisible(l.id)}
                          className={cn(
                            "rounded p-1 transition-colors",
                            l.visible !== false ? "text-zinc-400 hover:text-white" : "text-zinc-600"
                          )}
                          title={l.visible !== false ? "Ẩn layer" : "Hiện layer"}
                        >
                          {l.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                        {activeLayers.length > 1 && (
                          <button aria-label="Xóa layer này"
                            type="button"
                            onClick={() => deleteLayer(l.id)}
                            className="rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50"
                            title="Xóa layer này"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. ACTIVE LAYER INSPECTOR (Media & Speed) */}
            {selectedLayer && selectedLayer.type === "media" && (
            <div className="space-y-2 rounded-lg bg-surface-3 p-2.5 border border-zinc-800/80">
              {/* ⚡ Video Speed & Auto-Fit Controller */}
              {media.isVideo && (
                <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      Tốc độ Video &amp; Auto-fit
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-zinc-300">
                        {autoFitSpeed ? "Tự động" : "Thủ công"}
                      </span>
                      <Switch
                        checked={autoFitSpeed}
                        onCheckedChange={(checked) => applyCrop({ autoFitSpeed: checked })}
                      />
                    </div>
                  </div>

                  {autoFitSpeed ? (
                    <div className="flex items-center justify-between rounded bg-black/50 px-2 py-1 border border-amber-500/20 text-[10.5px] font-mono">
                      <span className="text-zinc-400">
                        Gốc {sourceDurSec.toFixed(1)}s → Cảnh {sceneDurSec.toFixed(1)}s
                      </span>
                      <Badge className="bg-amber-400 text-black font-mono font-bold text-[10px] px-1.5 py-0 h-4">
                        {effectivePlaybackRate.toFixed(2)}×
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-1.5 rounded bg-black/40 p-2 border border-zinc-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Tốc độ tuỳ chỉnh:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {manualSpeed.toFixed(2)}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={3.0}
                        step={0.05}
                        value={manualSpeed}
                        onChange={(e) => applyCrop({ playbackRate: parseFloat(e.target.value) })}
                        className="h-1.5 w-full accent-amber-400 cursor-pointer"
                      />
                      <div className="flex items-center gap-1 pt-0.5">
                        {[0.75, 1.0, 1.25, 1.43, 1.5, 2.0].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => applyCrop({ playbackRate: spd })}
                            className={cn(
                              "flex-1 rounded py-0.5 text-[10px] font-mono font-medium transition-colors",
                              Math.abs(manualSpeed - spd) < 0.04
                                ? "bg-amber-400 text-black font-bold"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            )}
                          >
                            {spd}×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allScenes && allScenes.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        allScenes.forEach((s) => {
                          const sMedia = parseMediaCrop(s.imageUrl);
                          if (sMedia.isVideo || s.imageUrl?.match(/\.(mp4|webm|mov)/i)) {
                            const srcDur =
                              s.sourceDurationSec ??
                              sMedia.sourceDurationSec ??
                              (sMedia.cleanUrl.includes("raw_") ? 7.98 : 8.0);
                            const newUrl = buildMediaUrlWithCrop(
                              s.imageUrl || "",
                              {
                                cropX: sMedia.cropX,
                                cropY: sMedia.cropY,
                                cropZoom: sMedia.cropZoom,
                                trimStartSec: sMedia.trimStartSec,
                                autoFitSpeed: true,
                                sourceDurationSec: srcDur,
                              },
                              true
                            );
                            onSceneChange({
                              ...s,
                              imageUrl: newUrl,
                              autoFitSpeed: true,
                              sourceDurationSec: srcDur,
                            });
                          }
                        });
                        toast.success("Đã bật Auto-Fit cho tất cả phân cảnh video!");
                      }}
                      className="w-full h-6 text-[10px] bg-zinc-900 border-zinc-700 text-amber-300 hover:bg-zinc-800 hover:text-amber-200"
                    >
                      <Zap className="h-2.5 w-2.5 mr-1 text-amber-400" />
                      Đồng bộ Auto-fit cả {allScenes.length} cảnh
                    </Button>
                  )}
                </div>
              )}

              {/* Upload or AI Generate Buttons */}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                hidden
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || generatingImg}
                  onClick={() => fileRef.current?.click()}
                  className="h-7 gap-1.5 text-[11px]"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 text-sky-400" />
                  )}
                  Đổi Video / Ảnh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={generatingImg || busy}
                  onClick={handleGenerateAI}
                  className="h-7 gap-1.5 text-[11px]"
                >
                  {generatingImg ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Vẽ Ảnh AI FLUX
                </Button>
              </div>
            </div>
            )}

            {/* 3. TEXT LAYER INSPECTOR */}
            {selectedLayer && selectedLayer.type === "text" && (() => {
              const textLayer = selectedLayer as TextLayer;
              return (
                <div className="space-y-3 rounded-lg bg-surface-3 p-3 border border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Type className="h-3.5 w-3.5 text-amber-400" />
                      Cài đặt Chữ & Nhãn Điểm Nhấn
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                      {textLayer.stylePreset || "headline_box"}
                    </span>
                  </div>

                  {/* Preset Style */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-400">Kiểu hiển thị</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "headline_box", label: "Tiêu đề hộp", icon: "🏷️" },
                        { id: "neon_tag", label: "Neon sáng", icon: "⚡" },
                        { id: "quote_card", label: "Trích dẫn", icon: "💬" },
                        { id: "stat_badge", label: "Thẻ chỉ số", icon: "📊" },
                        { id: "simple", label: "Đơn giản", icon: "📝" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => updateLayer(textLayer.id, { stylePreset: st.id as any })}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded py-1 px-1.5 text-[10px] transition-all",
                            (textLayer.stylePreset || "headline_box") === st.id
                              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400 font-semibold"
                              : "bg-zinc-800/60 text-zinc-400 hover:text-white"
                          )}
                        >
                          <span>{st.icon}</span>
                          <span>{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Text */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-400">Nội dung chữ chính</Label>
                    <Input
                      value={textLayer.text}
                      onChange={(e) => updateLayer(textLayer.id, { text: e.target.value })}
                      placeholder="Nhập tiêu đề hoặc phát biểu..."
                      className="h-8 text-xs font-semibold"
                    />
                  </div>

                  {/* Subtitle / Description */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-400">Phụ đề / Tên nhân vật (tuỳ chọn)</Label>
                    <Input
                      value={textLayer.subtitle || ""}
                      onChange={(e) => updateLayer(textLayer.id, { subtitle: e.target.value })}
                      placeholder="Ví dụ: KYLIAN MBAPPÉ • PHÚT 87'"
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Color chips + Studio ColorPickerPopover (react-colorful) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Màu chủ đạo</span>
                      <ColorPickerPopover
                        color={textLayer.color || "#FFD600"}
                        onChange={(color) => updateLayer(textLayer.id, { color })}
                        label="Màu chữ"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {["#FFD600", "#00E5FF", "#FF2E55", "#00E676", "#FFFFFF", "#FF8800"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateLayer(textLayer.id, { color })}
                          className={cn(
                            "h-5 w-5 rounded-full border border-black/40 transition-transform",
                            (textLayer.color || "#FFD600") === color ? "scale-125 ring-2 ring-white" : "hover:scale-110"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Position sliders */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="block space-y-0.5">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Vị trí X</span>
                        <span className="font-mono text-amber-300">{textLayer.position?.x ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={textLayer.position?.x ?? 50}
                        onChange={(e) =>
                          updateLayer(textLayer.id, {
                            position: { ...(textLayer.position || { x: 50, y: 50 }), x: Number(e.target.value) },
                          })
                        }
                        className="h-1.5 w-full accent-amber-400 cursor-pointer"
                      />
                    </label>
                    <label className="block space-y-0.5">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Vị trí Y</span>
                        <span className="font-mono text-amber-300">{textLayer.position?.y ?? 75}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={textLayer.position?.y ?? 75}
                        onChange={(e) =>
                          updateLayer(textLayer.id, {
                            position: { ...(textLayer.position || { x: 50, y: 50 }), y: Number(e.target.value) },
                          })
                        }
                        className="h-1.5 w-full accent-amber-400 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Animation & Font Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Hiệu ứng xuất hiện</Label>
                      <Select
                        value={textLayer.animation || "slide_up"}
                        onValueChange={(val) => updateLayer(textLayer.id, { animation: val as any })}
                      >
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pop_in">Nảy lên (Pop-in)</SelectItem>
                          <SelectItem value="slide_up">Trượt lên (Slide up)</SelectItem>
                          <SelectItem value="slide_down">Trượt xuống (Slide down)</SelectItem>
                          <SelectItem value="fade_in">Mờ dần (Fade in)</SelectItem>
                          <SelectItem value="scale_spring">Bung lò xo (Spring)</SelectItem>
                          <SelectItem value="none">Đứng yên</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Cỡ chữ (Font size)</Label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min={20}
                          max={64}
                          value={textLayer.fontSize || 36}
                          onChange={(e) => updateLayer(textLayer.id, { fontSize: Number(e.target.value) })}
                          className="h-1.5 w-full accent-amber-400 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] text-zinc-400 w-7 text-right">
                          {textLayer.fontSize || 36}px
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. IMAGE LAYER INSPECTOR */}
            {selectedLayer && selectedLayer.type === "image" && (() => {
              const imgLayer = selectedLayer as ImageLayer;
              return (
                <div className="space-y-3 rounded-lg bg-surface-3 p-3 border border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Film className="h-3.5 w-3.5 text-sky-400" />
                      Layer Ảnh Nổi / Cutout PNG
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                      {imgLayer.name || "Ảnh nổi"}
                    </span>
                  </div>

                  {/* Preview & Upload Button */}
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-zinc-700 bg-zinc-900/80 flex items-center justify-center">
                      {imgLayer.imageUrl ? (
                        <img
                          src={imgLayer.imageUrl}
                          alt={imgLayer.alt || "Layer preview"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-500">Chưa có ảnh</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadingLayerTargetId(imgLayer.id);
                          layerImgInputRef.current?.click();
                        }}
                        className="h-7 w-full gap-1.5 text-[11px]"
                      >
                        <Upload className="h-3 w-3 text-sky-400" />
                        Đổi Ảnh Cutout / Logo
                      </Button>
                      <Input
                        value={imgLayer.imageUrl || ""}
                        onChange={(e) => updateLayer(imgLayer.id, { imageUrl: e.target.value })}
                        placeholder="Hoặc dán URL ảnh..."
                        className="h-6 text-[10px]"
                      />
                    </div>
                  </div>

                  {/* Position sliders */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="block space-y-0.5">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Tọa độ X</span>
                        <span className="font-mono text-sky-300">{imgLayer.position?.x ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={imgLayer.position?.x ?? 50}
                        onChange={(e) =>
                          updateLayer(imgLayer.id, {
                            position: { ...(imgLayer.position || { x: 50, y: 50 }), x: Number(e.target.value) },
                          })
                        }
                        className="h-1.5 w-full accent-sky-400 cursor-pointer"
                      />
                    </label>
                    <label className="block space-y-0.5">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Tọa độ Y</span>
                        <span className="font-mono text-sky-300">{imgLayer.position?.y ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={imgLayer.position?.y ?? 50}
                        onChange={(e) =>
                          updateLayer(imgLayer.id, {
                            position: { ...(imgLayer.position || { x: 50, y: 50 }), y: Number(e.target.value) },
                          })
                        }
                        className="h-1.5 w-full accent-sky-400 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Size slider & Animation */}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-0.5">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Kích thước</span>
                        <span className="font-mono text-sky-300">{imgLayer.size?.width ?? 40}%</span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={100}
                        value={imgLayer.size?.width ?? 40}
                        onChange={(e) =>
                          updateLayer(imgLayer.id, {
                            size: { width: Number(e.target.value) },
                          })
                        }
                        className="h-1.5 w-full accent-sky-400 cursor-pointer"
                      />
                    </label>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Hiệu ứng xuất hiện</Label>
                      <Select
                        value={imgLayer.animation || "pop_in"}
                        onValueChange={(val) => updateLayer(imgLayer.id, { animation: val as any })}
                      >
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pop_in">Bung nảy (Pop-in)</SelectItem>
                          <SelectItem value="slide_up">Trượt lên (Slide up)</SelectItem>
                          <SelectItem value="slide_left">Trượt trái (Slide left)</SelectItem>
                          <SelectItem value="slide_right">Trượt phải (Slide right)</SelectItem>
                          <SelectItem value="fade_in">Mờ dần (Fade in)</SelectItem>
                          <SelectItem value="none">Đứng yên</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Shadow & Rotation */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={imgLayer.shadow !== false}
                        onCheckedChange={(checked) => updateLayer(imgLayer.id, { shadow: checked })}
                        id={`shadow-${imgLayer.id}`}
                      />
                      <Label htmlFor={`shadow-${imgLayer.id}`} className="text-[11px] text-zinc-300 cursor-pointer">
                        Đổ bóng nổi 3D
                      </Label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400">Góc xoay</span>
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        value={imgLayer.rotation ?? 0}
                        onChange={(e) => updateLayer(imgLayer.id, { rotation: Number(e.target.value) })}
                        className="h-1.5 w-16 accent-sky-400 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-zinc-400 w-6 text-right">
                        {imgLayer.rotation ?? 0}°
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Collapsible Accordion for Callout & Camera Motion (Radix Accordion) */}
            <Accordion
              type="multiple"
              defaultValue={["callout", "camera"]}
              className="rounded-lg border border-zinc-800/80 bg-surface-3 overflow-hidden"
            >
              <AccordionItem value="callout">
                <AccordionTrigger className="px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200">
                    <Type className="h-3.5 w-3.5 text-amber-400" />
                    Chữ mô tả điểm nhấn (Callout 2 dòng)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2.5 px-3 pb-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">Dòng 1: Nhãn tính năng (Thanh mảnh)</span>
                      <span className="text-[10px] text-zinc-500 font-mono">weight 400</span>
                    </div>
                    <Input
                      value={activeScene.calloutTag ?? ""}
                      placeholder="Ví dụ: Thiết kế, Cơ chế, Dung tích..."
                      className="h-7 text-xs bg-zinc-900 border-zinc-700"
                      onChange={(e) => onSceneChange({ ...activeScene, calloutTag: e.target.value })}
                      onBlur={(e) => patchScene({ calloutTag: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">Dòng 2: Ý chính nổi bật (Cực đậm)</span>
                      <span className="text-[10px] text-amber-400/80 font-mono font-bold">weight 800</span>
                    </div>
                    <Input
                      value={activeScene.calloutText ?? ""}
                      placeholder="Ví dụ: vung nồi 2 lớp, Đạp chân & nút nhấn..."
                      className="h-8 text-xs font-bold bg-zinc-900 border-zinc-700 text-white"
                      onChange={(e) => onSceneChange({ ...activeScene, calloutText: e.target.value })}
                      onBlur={(e) => patchScene({ calloutText: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400">Vị trí</span>
                      <Select
                        value={activeScene.calloutPosition || "top_center"}
                        disabled={busy}
                        onValueChange={(val) =>
                          patchScene({ calloutPosition: val as "top_center" | "top_left" | "top_right" })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px] bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top_center" className="text-xs">
                            Đỉnh giữa (Center)
                          </SelectItem>
                          <SelectItem value="top_left" className="text-xs">
                            Đỉnh trái (Left)
                          </SelectItem>
                          <SelectItem value="top_right" className="text-xs">
                            Đỉnh phải (Right)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400">Tone màu</span>
                      <Select
                        value={activeScene.calloutTheme || "dark"}
                        disabled={busy}
                        onValueChange={(val) =>
                          patchScene({ calloutTheme: val as "dark" | "light" | "glass" })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px] bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark" className="text-xs">
                            Đen than #1C1C1E (Chuẩn)
                          </SelectItem>
                          <SelectItem value="light" className="text-xs">
                            Trắng viền đổ bóng
                          </SelectItem>
                          <SelectItem value="glass" className="text-xs">
                            Thẻ kính mờ (Glass)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="camera">
                <AccordionTrigger className="px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200">
                    <Camera className="h-3.5 w-3.5 text-sky-400" />
                    Chuyển động máy &amp; Chuyển cảnh
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Camera className="h-3 w-3" /> Chuyển động máy
                      </Label>
                      <Select
                        value={activeScene.cameraEffect}
                        disabled={busy}
                        onValueChange={(val) =>
                          patchScene({ cameraEffect: val as Scene["cameraEffect"] })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px]">
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
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Wand2 className="h-3 w-3" /> Chuyển cảnh
                      </Label>
                      <Select
                        value={activeScene.transition}
                        disabled={busy}
                        onValueChange={(val) =>
                          patchScene({ transition: val as Scene["transition"] })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px]">
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
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="prompt" className="border-b-0">
                <AccordionTrigger className="px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Lời thoại &amp; Prompt AI của cảnh
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2.5 px-3 pb-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400">Lời thoại hiển thị (Transcript)</span>
                    <textarea
                      rows={2}
                      value={activeScene.transcriptText ?? ""}
                      onChange={(e) =>
                        onSceneChange({ ...activeScene, transcriptText: e.target.value })
                      }
                      onBlur={(e) => patchScene({ transcriptText: e.target.value })}
                      placeholder="Nhập lời thoại cho phân cảnh này..."
                      className="w-full rounded border border-zinc-700/80 bg-zinc-900 p-2 text-xs leading-relaxed text-zinc-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">Prompt tạo ảnh / video AI</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!prompt) return;
                          navigator.clipboard.writeText(prompt);
                          toast.success("Đã sao chép Prompt AI vào clipboard!");
                        }}
                        className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-amber-300 hover:bg-zinc-700"
                      >
                        <Copy className="h-2.5 w-2.5" />
                        Copy
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        patchScene({ imagePrompt: e.target.value });
                      }}
                      placeholder="Mô tả bối cảnh, góc máy và chuyển động cho AI..."
                      className="w-full rounded border border-zinc-700/80 bg-zinc-950 p-2 font-mono text-[10.5px] leading-relaxed text-zinc-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : tab === "broadcast_stripes" ? (
          /* TAB 2: BROADCAST STRIPES GRAPHICS (BẢN TIN ĐỒ HỌA) */
          broadcastConfig &&
          onBroadcastChange && (
            <div className="space-y-3.5 p-3.5 text-xs">
              {/* Quick Template Switcher */}
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("broadcast_stripes");
                    onBroadcastChange((c) => ({ ...c, templateId: "broadcast_stripes" }));
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-500 py-1 text-[11px] font-bold text-black shadow-sm"
                >
                  <Tv className="h-3.5 w-3.5" />
                  Bản tin Đồ họa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("vtv_news_template");
                    onBroadcastChange((c) => ({ ...c, templateId: "vtv_news_template" }));
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  VTV News Reel
                </button>
              </div>

              {/* 1. Tông màu nền đồ họa kẻ sọc */}
              <div className="space-y-1.5 rounded-lg bg-zinc-900/60 p-2.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                    <Palette className="h-3.5 w-3.5 text-sky-400" />
                    Tông màu nền kẻ sọc
                  </Label>
                  <span className="text-[10px] text-zinc-500">Stripe Graphic Theme</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant={broadcastConfig.backgroundTheme === "navy" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onThemeChange?.("navy")}
                    className="h-8 gap-1.5 text-[11px]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0A1C3E] border border-white/40" />
                    Xanh Navy Thể thao
                  </Button>
                  <Button
                    type="button"
                    variant={broadcastConfig.backgroundTheme === "crimson" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onThemeChange?.("crimson")}
                    className="h-8 gap-1.5 text-[11px]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#BA0C2F] border border-white/40" />
                    Đỏ Crimson Sôi động
                  </Button>
                </div>
              </div>

              {/* 2. Khung hình & Viền B-Roll */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Crop className="h-3.5 w-3.5 text-amber-400" />
                  Khung hình B-Roll & Viền
                </Label>
                <div className="grid grid-cols-4 gap-1">
                  {ASPECT_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={
                        broadcastConfig.mediaAspectRatio === opt.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        onBroadcastChange((c) => ({
                          ...c,
                          mediaAspectRatio: opt.value,
                        }))
                      }
                      className="h-7 px-1 text-[11px]"
                    >
                      {opt.value}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">Viền khung B-Roll</span>
                  <Switch
                    checked={broadcastConfig.showFrameBorders}
                    onCheckedChange={(v) =>
                      onBroadcastChange((c) => ({ ...c, showFrameBorders: v }))
                    }
                  />
                </div>

                {broadcastConfig.showFrameBorders && (
                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                    <span>Màu viền khung</span>
                    <ColorPickerPopover
                      color={broadcastConfig.frameBorderColor || "#FFFFFF"}
                      onChange={(color) =>
                        onBroadcastChange((prev) => ({
                          ...prev,
                          frameBorderColor: color,
                        }))
                      }
                      label="Viền B-Roll"
                    />
                  </div>
                )}
              </div>

              {/* 3. Tiêu đề & Chuyên mục */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Type className="h-3.5 w-3.5 text-amber-400" />
                  Tiêu đề & Chuyên mục
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Chuyên mục</Label>
                    <Input
                      value={broadcastConfig.categoryText}
                      onChange={(e) =>
                        onBroadcastChange((c) => ({
                          ...c,
                          categoryText: e.target.value,
                        }))
                      }
                      placeholder="VD: TIN NÓNG:"
                      className="h-7 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Ngày phát sóng</Label>
                    <Input
                      value={broadcastConfig.dateText}
                      onChange={(e) =>
                        onBroadcastChange((c) => ({ ...c, dateText: e.target.value }))
                      }
                      placeholder="VD: THỨ HAI, 27/10"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Tiêu đề Dòng 1</Label>
                  <Input
                    value={broadcastConfig.headlines[0] ?? ""}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({
                        ...c,
                        headlines: [e.target.value, c.headlines[1] ?? ""],
                      }))
                    }
                    placeholder="Tiêu đề chính dòng 1"
                    className="h-7 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Tiêu đề Dòng 2</Label>
                  <Input
                    value={broadcastConfig.headlines[1] ?? ""}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({
                        ...c,
                        headlines: [c.headlines[0] ?? "", e.target.value],
                      }))
                    }
                    placeholder="Tiêu đề phụ dòng 2"
                    className="h-7 font-semibold text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                  <span>Cỡ chữ tiêu đề</span>
                  <div className="flex items-center gap-1">
                    {[36, 44, 50].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() =>
                          onBroadcastChange((c) => ({
                            ...c,
                            headlineFontSize: sz,
                          }))
                        }
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-mono",
                          (broadcastConfig.headlineFontSize || 44) === sz
                            ? "bg-amber-400 text-black font-bold"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Thanh Ticker Tin Tức (Social & News Ticker) */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                    <Film className="h-3.5 w-3.5 text-sky-400" />
                    Thanh Ticker Tin Tức Dưới Cùng
                  </Label>
                  <Switch
                    checked={broadcastConfig.showTicker}
                    onCheckedChange={(v) =>
                      onBroadcastChange((c) => ({ ...c, showTicker: v }))
                    }
                  />
                </div>

                {broadcastConfig.showTicker && (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Nhãn Ticker Chính (Xanh)</Label>
                      <Input
                        value={broadcastConfig.tickerText}
                        onChange={(e) =>
                          onBroadcastChange((c) => ({ ...c, tickerText: e.target.value }))
                        }
                        placeholder="VD: TIN NÓNG BÓNG ĐÁ"
                        className="h-7 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Dòng Ticker Social Mạng Xã Hội</Label>
                      <Input
                        value={broadcastConfig.tickerSocialText || ""}
                        onChange={(e) =>
                          onBroadcastChange((c) => ({ ...c, tickerSocialText: e.target.value }))
                        }
                        placeholder="VD: f | yt | tiktok | @nguoidabong | NGƯỜI ĐÁ BÓNG"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Watermark Thương Hiệu */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  Watermark & Thương hiệu
                </Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Chữ Watermark góc dưới</Label>
                  <Input
                    value={broadcastConfig.watermarkText || ""}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({ ...c, watermarkText: e.target.value }))
                    }
                    placeholder="VD: NGƯỜI ĐÁ BÓNG"
                    className="h-7 text-xs font-bold uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* 6. Phụ đề & Âm thanh */}
              <div className="space-y-1.5 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  Phụ đề & Hiệu ứng âm thanh
                </Label>
                <div className="flex items-center justify-between rounded bg-surface-3 px-2.5 py-1.5">
                  <span className="text-zinc-300">Live Karaoke Pill (Chữ trực tiếp)</span>
                  <Switch
                    checked={broadcastConfig.showCaptions}
                    onCheckedChange={(v) =>
                      onBroadcastChange((c) => ({ ...c, showCaptions: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded bg-surface-3 px-2.5 py-1.5">
                  <span className="text-zinc-300">Âm thanh chuyển cảnh (SFX Whoosh)</span>
                  <Switch
                    checked={broadcastConfig.enableTransitionSfx}
                    onCheckedChange={(v) =>
                      onBroadcastChange((c) => ({ ...c, enableTransitionSfx: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded bg-surface-3 px-2.5 py-1.5">
                  <span className="text-zinc-300">Chớp trắng khi sang cảnh mới</span>
                  <Switch
                    checked={broadcastConfig.enableFlashOnTransition}
                    onCheckedChange={(v) =>
                      onBroadcastChange((c) => ({
                        ...c,
                        enableFlashOnTransition: v,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                  <span>Âm lượng nhạc nền BGM</span>
                  <div className="flex items-center gap-1">
                    {[0.1, 0.14, 0.25, 0.35].map((vol) => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() =>
                          onBroadcastChange((c) => ({ ...c, bgmVolume: vol }))
                        }
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px]",
                          (broadcastConfig.bgmVolume ?? 0.14) === vol
                            ? "bg-amber-400 text-black font-bold"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        {Math.round(vol * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* TAB 3: VTV NEWS REEL TEMPLATE GRAPHICS */
          broadcastConfig &&
          onBroadcastChange && (
            <div className="space-y-3.5 p-3.5 text-xs">
              {/* Quick Template Switcher */}
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("broadcast_stripes");
                    onBroadcastChange((c) => ({ ...c, templateId: "broadcast_stripes" }));
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Tv className="h-3.5 w-3.5" />
                  Bản tin Đồ họa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("vtv_news_template");
                    onBroadcastChange((c) => ({ ...c, templateId: "vtv_news_template" }));
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-500 py-1 text-[11px] font-bold text-black shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  VTV News Reel
                </button>
              </div>

              {/* 1. Video Nền Động (Background Loop) */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                    <Film className="h-3.5 w-3.5 text-amber-400" />
                    Video Nền Động (Background Loop)
                  </Label>
                  <button
                    type="button"
                    onClick={() => bgVideoInputRef.current?.click()}
                    disabled={uploadingBgVideo}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    {uploadingBgVideo ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        Tải video riêng (.mp4)
                      </>
                    )}
                  </button>
                  <input
                    ref={bgVideoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={handleBgVideoUpload}
                  />
                </div>

                {/* Preset Background Video Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {BG_VIDEO_PRESETS.map((bg) => {
                    const currentUrl =
                      broadcastConfig.backgroundVideoUrl || "/media/football-assets/bg_loop.mp4";
                    const isSelected =
                      bg.url === "none"
                        ? broadcastConfig.backgroundVideoUrl === "none"
                        : currentUrl.includes(bg.url.replace(/^\/media\//, "").replace(/^\/storage\//, ""));
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() =>
                          onBroadcastChange((c) => ({
                            ...c,
                            backgroundVideoUrl: bg.url,
                          }))
                        }
                        className={cn(
                          "flex items-center gap-1.5 rounded-md p-1.5 text-left text-[11px] transition-all",
                          isSelected
                            ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/50 font-semibold"
                            : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
                        )}
                      >
                        <span className="text-sm">{bg.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{bg.title}</p>
                          <p className="truncate text-[10px] text-zinc-500">{bg.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Opacity Control */}
                {broadcastConfig.backgroundVideoUrl !== "none" && (
                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                    <span>Độ mờ video nền</span>
                    <div className="flex items-center gap-1">
                      {[1.0, 0.75, 0.5, 0.3].map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() =>
                            onBroadcastChange((c) => ({
                              ...c,
                              backgroundVideoOpacity: op,
                            }))
                          }
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px]",
                            (broadcastConfig.backgroundVideoOpacity ?? 1.0) === op
                              ? "bg-amber-400 text-black font-bold"
                              : "bg-zinc-800 text-zinc-400 hover:text-white"
                          )}
                        >
                          {Math.round(op * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Phong cách Khung Card (Liquid Glass Style) */}
              <div className="space-y-1.5 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Phong cách Khung Card Tin Tức
                </Label>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {(["liquid_glass", "solid", "bordered"] as const).map((style) => (
                    <Button
                      key={style}
                      type="button"
                      variant={
                        (broadcastConfig.cardStyle || "liquid_glass") === style
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        onBroadcastChange((c) => ({
                          ...c,
                          cardStyle: style,
                        }))
                      }
                      className="h-7 px-1 text-[10px]"
                    >
                      {style === "liquid_glass"
                        ? "Liquid Glass"
                        : style === "solid"
                          ? "Solid Card"
                          : "Bordered"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 3. Khung hình B-Roll VTV (16:9 hoặc 1:1) */}
              <div className="space-y-1.5 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Crop className="h-3.5 w-3.5 text-sky-400" />
                  Khung hình B-Roll (Chuẩn VTV Reel)
                </Label>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[
                    { value: "16:9", label: "16:9 Ngang chuẩn Reel" },
                    { value: "1:1", label: "1:1 Khung vuông" },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={
                        broadcastConfig.mediaAspectRatio === opt.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        onBroadcastChange((c) => ({
                          ...c,
                          mediaAspectRatio: opt.value as MediaAspectRatio,
                        }))
                      }
                      className="h-7 text-[11px]"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 4. Tag & Hashtags */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Hash className="h-3.5 w-3.5 text-amber-400" />
                  Tag Chủ đề & Hashtags
                </Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Tag Chủ đề góc trên</Label>
                  <Input
                    value={broadcastConfig.categoryText}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({
                        ...c,
                        categoryText: e.target.value,
                      }))
                    }
                    placeholder="VD: BÓNG ĐÁ QUỐC TẾ"
                    className="h-7 font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Danh sách Hashtags</Label>
                  <Input
                    value={(broadcastConfig.hashtags || []).join(" ")}
                    onChange={(e) => {
                      const tags = e.target.value
                        .split(/[ ,]+/)
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((t) => (t.startsWith("#") ? t : `#${t}`));
                      onBroadcastChange((c) => ({ ...c, hashtags: tags }));
                    }}
                    placeholder="#NGUOIDABONG #VTVTHETHAO #NGOAIHANGANH"
                    className="h-7 text-xs font-mono text-amber-300"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["#NGƯỜIDÁBÓNG", "#VTVTHETHAO", "#NGOAIHANGANH", "#TINNONGBONGDA"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = broadcastConfig.hashtags || [];
                          if (!current.includes(tag)) {
                            onBroadcastChange((c) => ({
                              ...c,
                              hashtags: [...current, tag],
                            }));
                          }
                        }}
                        className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-amber-300"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Tiêu đề Editorial Báo chí */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Type className="h-3.5 w-3.5 text-amber-400" />
                  Tiêu đề Báo chí Editorial
                </Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Tiêu đề Dòng 1 (Từ khóa tự động tô màu)</Label>
                  <Input
                    value={broadcastConfig.headlines[0] ?? ""}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({
                        ...c,
                        headlines: [e.target.value, c.headlines[1] ?? ""],
                      }))
                    }
                    placeholder="VD: CƠN ĐỊA CHẤN TẠI NGOẠI HẠNG ANH:"
                    className="h-7 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Tiêu đề Dòng 2</Label>
                  <Input
                    value={broadcastConfig.headlines[1] ?? ""}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({
                        ...c,
                        headlines: [c.headlines[0] ?? "", e.target.value],
                      }))
                    }
                    placeholder="VD: MU bẽ mặt thua trắng 0-2 trước Hull City!"
                    className="h-7 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Nguồn tin tức / Ngày tháng</Label>
                  <Input
                    value={broadcastConfig.dateText}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({ ...c, dateText: e.target.value }))
                    }
                    placeholder="VD: 27/10/2026"
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* 6. Logo Kênh / Watermark */}
              <div className="space-y-2 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  Logo Kênh Watermark
                </Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Đường dẫn Logo Kênh</Label>
                  <Input
                    value={broadcastConfig.watermarkLogoUrl || ""}
                    onChange={(e) =>
                      onBroadcastChange((c) => ({ ...c, watermarkLogoUrl: e.target.value }))
                    }
                    placeholder="/media/football-assets/nguoi_da_bong_logo.png"
                    className="h-7 text-xs font-mono text-zinc-300"
                  />
                </div>
              </div>

              {/* 7. Phụ đề Karaoke & Âm thanh */}
              <div className="space-y-1.5 rounded-lg bg-zinc-900/60 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  Phụ đề Karaoke & Âm thanh
                </Label>
                <div className="flex items-center justify-between rounded bg-surface-3 px-2.5 py-1.5">
                  <span className="text-zinc-300">Phụ đề Karaoke từng từ (Word-by-word)</span>
                  <Switch
                    checked={broadcastConfig.showCaptions}
                    onCheckedChange={(v) =>
                      onBroadcastChange((c) => ({ ...c, showCaptions: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                  <span>Âm lượng nhạc nền BGM</span>
                  <div className="flex items-center gap-1">
                    {[0.1, 0.16, 0.25, 0.35].map((vol) => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() =>
                          onBroadcastChange((c) => ({ ...c, bgmVolume: vol }))
                        }
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px]",
                          (broadcastConfig.bgmVolume ?? 0.16) === vol
                            ? "bg-amber-400 text-black font-bold"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        {Math.round(vol * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </ScrollArea>
    </aside>
  );
}
