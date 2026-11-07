"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import type { PlayerRef } from "@remotion/player";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Columns2,
  Copy,
  FileAudio,
  FileText,
  Film,
  FolderOpen,
  GripHorizontal,
  Loader2,
  Monitor,
  PanelBottom,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Pause,
  Play,
  RefreshCw,
  Smartphone,
  Sparkles,
  Square,
  Subtitles,
  Trash2,
  Upload,
  Users,
  Video,
} from "lucide-react";
import {
  buildMediaUrlWithCrop,
  type AspectRatio,
  type Project,
  type Scene,
} from "@storytoon/shared-types";
import { FPS } from "@storytoon/video-engine";
import { API_URL, api, fmtMs } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StudioPlayer } from "@/components/StudioPlayer";
import { RenderAndYoutubePanel } from "@/components/RenderAndYoutubePanel";
import { NleTimeline, type TimelineAudioMix } from "@/components/nle/NleTimeline";
import { NleInspector } from "@/components/nle/NleInspector";
import { NleSceneViewer } from "@/components/nle/NleSceneViewer";
import { NleWorkspaceSwitcher } from "@/components/nle/NleWorkspaceSwitcher";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useConfirmDialog, deleteProjectConfirm } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MEDIA_BASE = `${API_URL}/media`;

const GOAL_CLIPS = [
  {
    label: "⚽ Bàn 1: Mbappé 41' (0-1 Cận sân 6.7s)",
    url: `${MEDIA_BASE}/football-clips/goal_1_mbappe_41m_closeup.mp4#crop=50,60,1.05,0&v=1`,
  },
  {
    label: "⚽ Bàn 2: Raphinha 61' (1-1 Gỡ hòa 10.9s)",
    url: `${MEDIA_BASE}/football-clips/goal_2_raphinha_61m.mp4#crop=50,65,1.05,0&v=1`,
  },
  {
    label: "⚽ Bàn 3: Mbappé 87' (1-2 Ấn định 11.3s)",
    url: `${MEDIA_BASE}/football-clips/goal_3_mbappe_87m_main.mp4#crop=50,55,1.05,0&v=1`,
  },
];

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [workspaceMode, setWorkspaceMode] = useState<"edit" | "deliver">("edit");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [viewerMode, setViewerMode] = useState<"dual" | "scene" | "program">("dual");

  const [leftTab, setLeftTab] = useState<"media" | "characters" | "transcript">("media");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Track mixer from the timeline (voice mute / volume) applied live to the player
  const [audioMix, setAudioMix] = useState<TimelineAudioMix | null>(null);
  const [error, setError] = useState("");
  const [copiedChar, setCopiedChar] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [uploading, setUploading] = useState(false);

  // Undo / Redo Scene History Stack
  const [historyPast, setHistoryPast] = useState<Scene[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Scene[][]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [confirm, confirmDialog] = useConfirmDialog();

  const load = useCallback(async () => {
    try {
      const p = await api.getProject(id);
      setProject((prev) => {
        if (!prev) {
          setRatio(p.aspectRatio);
          if (p.scenes.length > 0) setSelectedSceneId(p.scenes[0].id);
        }
        return p;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (project?.status !== "processing") return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [project?.status, load]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) =>
      setNowMs((e.detail.frame / FPS) * 1000);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [project?.status, ratio, workspaceMode, viewerMode]);

  const updateScenesWithHistory = useCallback((updater: (prev: Scene[]) => Scene[]) => {
    setProject((prev) => {
      if (!prev) return prev;
      const nextScenes = updater(prev.scenes);
      setHistoryPast((h) => [...h.slice(-24), prev.scenes]);
      setHistoryFuture([]);
      return { ...prev, scenes: nextScenes };
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (!project || historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((h) => h.slice(0, -1));
    setHistoryFuture((f) => [project.scenes, ...f]);
    setProject((p) => (p ? { ...p, scenes: previous } : p));
    toast.info("Đã hoàn tác (Undo)");
  }, [historyPast, project]);

  const handleRedo = useCallback(() => {
    if (!project || historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((h) => [...h, project.scenes]);
    setProject((p) => (p ? { ...p, scenes: next } : p));
    toast.info("Đã làm lại (Redo)");
  }, [historyFuture, project]);

  const seek = useCallback(
    (ms: number) => {
      const maxDur = project?.durationMs ?? 10000;
      const clamped = Math.max(0, Math.min(maxDur, ms));
      setNowMs(clamped);
      playerRef.current?.seekTo(Math.round((clamped / 1000) * FPS));
    },
    [project?.durationMs]
  );

  const handleSplitAtPlayhead = useCallback(() => {
    if (!project) return;
    const target = project.scenes.find(
      (s) => nowMs > s.startMs + 600 && nowMs < s.endMs - 600
    );
    if (!target) {
      toast.warning("Hãy đặt kim Playhead vào giữa một cảnh để tách đôi!");
      return;
    }
    const splitPoint = Math.round(nowMs);
    const words = target.transcriptText.split(/\s+/);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    const text1 = words.slice(0, midWord).join(" ");
    const text2 = words.slice(midWord).join(" ") || target.transcriptText;

    updateScenesWithHistory((scenes) => {
      const next: Scene[] = [];
      scenes.forEach((sc) => {
        if (sc.id !== target.id) {
          next.push(sc);
        } else {
          next.push({ ...sc, endMs: splitPoint, transcriptText: text1 });
          next.push({
            ...sc,
            id: `${sc.id}-split-${Date.now()}`,
            startMs: splitPoint,
            endMs: sc.endMs,
            transcriptText: text2,
            transition: "cut",
          });
        }
      });
      return next.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
    });
    toast.success(`Đã tách Cảnh #${target.sceneIndex} tại ${fmtMs(splitPoint)}`);
  }, [nowMs, project, updateScenesWithHistory]);

  const handleResizeSceneBoundary = useCallback(
    (leftSceneId: string, rightSceneId: string, newBoundaryMs: number) => {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((sc) => {
                if (sc.id === leftSceneId) return { ...sc, endMs: newBoundaryMs };
                if (sc.id === rightSceneId) return { ...sc, startMs: newBoundaryMs };
                return sc;
              }),
            }
          : prev
      );
    },
    []
  );

  const handleResizeSceneBoundaryEnd = useCallback(
    (leftSceneId: string, rightSceneId: string, newBoundaryMs: number) => {
      if (!project) return;
      let finalScenes: Scene[] = [];
      updateScenesWithHistory((scenes) => {
        finalScenes = scenes.map((sc) => {
          if (sc.id === leftSceneId) return { ...sc, endMs: newBoundaryMs };
          if (sc.id === rightSceneId) return { ...sc, startMs: newBoundaryMs };
          return sc;
        });
        return finalScenes;
      });

      if (!project.id.startsWith("demo-")) {
        Promise.all([
          api.updateScene(leftSceneId, { endMs: newBoundaryMs }),
          api.updateScene(rightSceneId, { startMs: newBoundaryMs }),
        ]).catch(() => {
          if (finalScenes.length > 0) {
            api.saveProjectScenes(project.id, finalScenes).catch(() => {});
          }
        });
      }
    },
    [project, updateScenesWithHistory]
  );

  // Hotkeys
  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      playerRef.current?.toggle();
    },
    { enableOnFormTags: false }
  );
  useHotkeys(
    "left",
    (e) => {
      e.preventDefault();
      seek(nowMs - Math.round(1000 / FPS));
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "right",
    (e) => {
      e.preventDefault();
      seek(nowMs + Math.round(1000 / FPS));
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "s",
    (e) => {
      e.preventDefault();
      handleSplitAtPlayhead();
    },
    { enableOnFormTags: false },
    [handleSplitAtPlayhead]
  );
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      handleUndo();
    },
    { enableOnFormTags: false },
    [handleUndo]
  );
  useHotkeys(
    "mod+shift+z, mod+y",
    (e) => {
      e.preventDefault();
      handleRedo();
    },
    { enableOnFormTags: false },
    [handleRedo]
  );

  const selectedScene = useMemo(() => {
    if (!project || !project.scenes.length) return null;
    return (
      project.scenes.find((s) => s.id === selectedSceneId) ??
      project.scenes[0] ??
      null
    );
  }, [project, selectedSceneId]);

  const playingScene = useMemo(() => {
    if (!project || !project.scenes.length) return null;
    return (
      project.scenes.find((s) => nowMs >= s.startMs && nowMs < s.endMs) ??
      project.scenes[0] ??
      null
    );
  }, [project, nowMs]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-1 p-6">
        <Card className="mx-auto max-w-xl border-0 bg-red-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Không thể tải dự án
            </CardTitle>
            <CardDescription className="text-red-300">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-surface-1 text-sm text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        Đang tải dữ liệu Bàn dựng NLE...
      </div>
    );
  }

  const updateScene = (s: Scene) =>
    updateScenesWithHistory((scenes) => scenes.map((x) => (x.id === s.id ? s : x)));

  async function handleDeleteProject() {
    if (!project) return;
    if (!(await confirm(deleteProjectConfirm(project.title)))) {
      return;
    }
    const toastId = toast.loading(`Đang xóa dự án "${project.title}"...`);
    try {
      await api.deleteProject(project.id);
      toast.success(`Đã xóa dự án "${project.title}"`, { id: toastId });
      router.push("/");
    } catch (e) {
      toast.error("Không thể xóa dự án", {
        id: toastId,
        description: (e as Error).message,
      });
    }
  }

  async function handleReprocess() {
    setReprocessing(true);
    const toastId = toast.loading("Đang chạy lại Pipeline AI...");
    try {
      await api.processProject(id);
      await load();
      toast.success("Đã khởi chạy lại Pipeline AI!", { id: toastId });
    } catch (e) {
      toast.error("Lỗi chạy lại AI", { id: toastId, description: (e as Error).message });
    } finally {
      setReprocessing(false);
    }
  }

  async function handleGenerateAllMissing() {
    if (!project) return;
    const missing = project.scenes.filter((s) => !s.imageUrl);
    if (missing.length === 0) return;
    setBatchGenerating(true);
    const toastId = toast.loading(`Đang vẽ ${missing.length} ảnh AI FLUX...`);
    try {
      for (let idx = 0; idx < missing.length; idx++) {
        const sc = missing[idx];
        setBatchProgress(`${idx + 1}/${missing.length}`);
        const updated = await api.generateSceneImage(sc.id, sc.imagePrompt);
        setProject((prev) =>
          prev
            ? {
                ...prev,
                scenes: prev.scenes.map((x) => (x.id === sc.id ? { ...x, ...updated } : x)),
              }
            : prev
        );
      }
      toast.success("Đã vẽ xong toàn bộ ảnh FLUX!", { id: toastId });
    } catch (e) {
      toast.error("Lỗi vẽ ảnh hàng loạt", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setBatchGenerating(false);
      setBatchProgress("");
    }
  }

  async function handleAttachClipToScene(sceneId: string, url: string) {
    if (!project) return;
    const target = project.scenes.find((s) => s.id === sceneId);
    if (!target) return;
    const updated = await api.updateScene(sceneId, { imageUrl: url });
    updateScene({ ...target, ...updated });
    toast.success(`Đã gắn Media vào Cảnh #${target.sceneIndex}`);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedScene) return;
    setUploading(true);
    const toastId = toast.loading(`Đang tải ${file.name} lên...`);
    try {
      const uploaded = await api.uploadMediaFile(file);
      const urlWithCrop = buildMediaUrlWithCrop(uploaded.url, {
        cropX: 50,
        cropY: 50,
        cropZoom: 1,
        trimStartSec: 0,
      });
      await handleAttachClipToScene(selectedScene.id, urlWithCrop);
      toast.success(`Đã gắn ${file.name} vào Cảnh #${selectedScene.sceneIndex}`, {
        id: toastId,
      });
    } catch (err) {
      toast.error("Tải file thất bại", {
        id: toastId,
        description: (err as Error).message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const doneCount = project.scenes.filter((s) => s.imageUrl).length;
  const totalScenes = project.scenes.length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-1 text-zinc-100 select-none">
      {confirmDialog}
      {/* 1. TOP NLE HEADER BAR */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800/90 bg-surface-3 px-3">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Media Pool (Thư viện media)"
                type="button"
                onClick={() => setShowLeftPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showLeftPanel
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Media Pool (Thư viện media)</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" asChild className="h-7 w-7 text-zinc-400 hover:text-white">
            <Link href="/" title="Quay lại Bảng điều khiển">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="max-w-[200px] truncate text-sm font-bold tracking-tight text-zinc-100">
            {project.title}
          </h1>
          {project.status === "ready" && (
            <Badge variant="success" className="hidden sm:inline-flex gap-1 text-[10px] py-0">
              <CheckCircle2 className="h-3 w-3" /> {doneCount}/{totalScenes}
            </Badge>
          )}
        </div>

        {/* Center Workspace Switcher + Dual Monitor Switcher */}
        <div className="flex items-center gap-2">
          <NleWorkspaceSwitcher mode={workspaceMode} onChange={setWorkspaceMode} />

          {workspaceMode === "edit" && (
            <div className="hidden lg:flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 text-[11px] gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Dual Monitor (Cảnh đang làm + Full Video)"
                    type="button"
                    onClick={() => setViewerMode("dual")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "dual"
                        ? "bg-cyan-500 text-black font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Dual Monitor (Cảnh đang làm + Full Video)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Single Monitor (Chỉ xem Cảnh đang làm)"
                    type="button"
                    onClick={() => setViewerMode("scene")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "scene"
                        ? "bg-cyan-500 text-black font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Square className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Single Monitor (Chỉ xem Cảnh đang làm)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Single Monitor (Chỉ xem Full Video)"
                    type="button"
                    onClick={() => setViewerMode("program")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "program"
                        ? "bg-cyan-500 text-black font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Film className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Single Monitor (Chỉ xem Full Video)</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Right Controls & Panel Toggles */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setRatio("16:9")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium",
                    ratio === "16:9" ? "bg-amber-500 text-black font-bold" : "text-zinc-400"
                  )}
                >
                  <Monitor className="h-3 w-3" /> 16:9
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Khung hình 16:9 (Ngang)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setRatio("9:16")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium",
                    ratio === "9:16" ? "bg-amber-500 text-black font-bold" : "text-zinc-400"
                  )}
                >
                  <Smartphone className="h-3 w-3" /> 9:16
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Khung hình 9:16 (Dọc TikTok/Shorts)</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={reprocessing}
                onClick={handleReprocess}
                className="hidden sm:inline-flex h-7 px-2 border-zinc-700 bg-zinc-900 text-[11px]"
              >
                <RefreshCw className={cn("h-3 w-3", reprocessing && "animate-spin")} />
                AI
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Tái tạo kịch bản & phân cảnh AI</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="Xóa dự án này"
                variant="outline"
                size="sm"
                onClick={handleDeleteProject}
                className="h-7 w-7 p-0 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Xóa dự án này</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Đóng / Mở Timeline"
                type="button"
                onClick={() => setShowBottomPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showBottomPanel
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <PanelBottom className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Đóng / Mở Timeline</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Đóng / Mở Inspector"
                type="button"
                onClick={() => setShowRightPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showRightPanel
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Đóng / Mở Inspector</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* 2. RESIZABLE MAIN WORKSPACE */}
      {workspaceMode === "edit" ? (
        <ResizablePanelGroup orientation="vertical" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={showBottomPanel ? "70%" : "100%"} minSize="35%">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
              {/* LEFT DOCK: Media / Characters / Words (Collapsible) */}
              {showLeftPanel && (
                <>
                  <ResizablePanel defaultSize="20%" minSize="14%" maxSize="35%">
                    <div className="flex h-full w-full flex-col border-r border-zinc-800/90 bg-surface-3 text-zinc-200 overflow-hidden">
                      <div className="flex items-center border-b border-zinc-800 bg-zinc-900/90 px-1.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setLeftTab("media")}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-[11px] font-semibold",
                            leftTab === "media"
                              ? "border-amber-400 text-amber-300"
                              : "border-transparent text-zinc-400"
                          )}
                        >
                          <FolderOpen className="h-3.5 w-3.5" /> Media
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftTab("characters")}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-[11px] font-semibold",
                            leftTab === "characters"
                              ? "border-amber-400 text-amber-300"
                              : "border-transparent text-zinc-400"
                          )}
                        >
                          <Users className="h-3.5 w-3.5" /> Nhân vật
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftTab("transcript")}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-[11px] font-semibold",
                            leftTab === "transcript"
                              ? "border-amber-400 text-amber-300"
                              : "border-transparent text-zinc-400"
                          )}
                        >
                          <Subtitles className="h-3.5 w-3.5" /> Từ
                        </button>
                        <button aria-label="Thu gọn Media Pool"
                          type="button"
                          onClick={() => setShowLeftPanel(false)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white ml-1"
                          title="Thu gọn Media Pool"
                        >
                          <PanelLeftClose className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {leftTab === "media" && (
                          <>
                            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                              <span className="text-[11px] text-zinc-300">Đang chọn:</span>
                              <Badge className="bg-amber-500 text-black font-bold text-[10px]">
                                {selectedScene ? `Cảnh #${selectedScene.sceneIndex}` : "Chưa chọn"}
                              </Badge>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime,image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              disabled={uploading || !selectedScene}
                              onClick={() => fileInputRef.current?.click()}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15"
                            >
                              {uploading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              Tải Video / Ảnh vào Cảnh #{selectedScene?.sceneIndex ?? 1}
                            </button>

                            {totalScenes > doneCount && (
                              <Button
                                size="sm"
                                disabled={batchGenerating}
                                onClick={handleGenerateAllMissing}
                                className="w-full h-8 gap-1.5 text-xs bg-amber-500 text-black hover:bg-amber-400 font-semibold"
                              >
                                {batchGenerating ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Đang vẽ FLUX ({batchProgress})...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Vẽ AI tự động {totalScenes - doneCount} cảnh thiếu
                                  </>
                                )}
                              </Button>
                            )}

                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                                <Video className="h-3 w-3 text-emerald-400" /> Media Của Dự Án
                              </span>
                              {project.scenes.filter((s) => s.imageUrl).length === 0 ? (
                                <p className="py-3 text-center text-[11px] text-zinc-500">
                                  Chưa có media nào trong dự án này.
                                </p>
                              ) : (
                                project.scenes
                                  .filter((s) => s.imageUrl)
                                  .map((s) => {
                                    const isVideo = /\.(mp4|webm|mov)(\?|$|#)/i.test(s.imageUrl!);
                                    const label = `${isVideo ? "🎬" : "🖼️"} Cảnh #${s.sceneIndex}: ${
                                      s.calloutTag || s.setting || s.transcriptText.slice(0, 24)
                                    }`;
                                    return (
                                      <button
                                        key={`${s.id}-${s.imageUrl}`}
                                        type="button"
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData(
                                            "application/x-nle-media",
                                            JSON.stringify({ url: s.imageUrl!, isLocalClip: true })
                                          );
                                        }}
                                        onClick={() =>
                                          selectedScene &&
                                          handleAttachClipToScene(selectedScene.id, s.imageUrl!)
                                        }
                                        className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 py-2 text-left text-[11px] hover:border-emerald-500/50 cursor-grab active:cursor-grabbing"
                                      >
                                        <span className="flex items-center gap-1.5 truncate">
                                          <GripHorizontal className="h-3 w-3 shrink-0 text-zinc-500" />
                                          <span className="truncate">{label}</span>
                                        </span>
                                        <span className="text-[10px] text-emerald-400 font-bold ml-1">
                                          +Gắn
                                        </span>
                                      </button>
                                    );
                                  })
                              )}
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Tải tệp âm thanh & phụ đề
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {project.audioUrl && (
                                  <Button variant="outline" size="sm" asChild className="h-7 text-[11px]">
                                    <a href={project.audioUrl} download>
                                      <FileAudio className="h-3 w-3 mr-1 text-amber-400" /> Voice.wav
                                    </a>
                                  </Button>
                                )}
                                {project.captionSrtUrl && (
                                  <Button variant="outline" size="sm" asChild className="h-7 text-[11px]">
                                    <a href={project.captionSrtUrl} download>
                                      <Subtitles className="h-3 w-3 mr-1 text-emerald-400" /> .SRT
                                    </a>
                                  </Button>
                                )}
                                {project.captionVttUrl && (
                                  <Button variant="outline" size="sm" asChild className="h-7 text-[11px]">
                                    <a href={project.captionVttUrl} download>
                                      <FileText className="h-3 w-3 mr-1" /> .VTT
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {leftTab === "characters" && (
                          <div className="space-y-2.5">
                            {(!project.characters || project.characters.length === 0) && (
                              <p className="py-6 text-center text-xs text-zinc-500">
                                Không có hồ sơ nhân vật riêng.
                              </p>
                            )}
                            {project.characters?.map((c) => (
                              <div
                                key={c.name}
                                className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-amber-400">{c.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${c.name}: ${c.description}`);
                                      setCopiedChar(c.name);
                                      toast.success(`Đã copy tạo hình ${c.name}`);
                                      setTimeout(() => setCopiedChar(null), 1400);
                                    }}
                                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                                  >
                                    {copiedChar === c.name ? (
                                      <Check className="h-3 w-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                    Copy
                                  </button>
                                </div>
                                <p className="font-mono text-[10px] leading-relaxed text-zinc-400">
                                  {c.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {leftTab === "transcript" && (
                          <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                            {project.words?.map((w, idx) => {
                              const isSpoken = nowMs >= w.startMs && nowMs < w.endMs;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => seek(w.startMs)}
                                  className={cn(
                                    "rounded px-1 py-0.5 text-xs transition-colors",
                                    isSpoken
                                      ? "bg-amber-500 font-bold text-black"
                                      : "text-zinc-300 hover:bg-zinc-800"
                                  )}
                                >
                                  {w.text}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle direction="horizontal" />
                </>
              )}

              {/* CENTER DOCK: Dual Monitors (Left = Scene Monitor, Right = Program Full Video) */}
              <ResizablePanel
                defaultSize={
                  showLeftPanel && showRightPanel
                    ? "56%"
                    : showLeftPanel || showRightPanel
                      ? "78%"
                      : "100%"
                }
                minSize="30%"
              >
                <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
                  {(viewerMode === "dual" || viewerMode === "scene") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <NleSceneViewer
                        scene={selectedScene}
                        frameAspectRatio={ratio === "9:16" ? "3:4" : "16:9"}
                        onSceneChange={updateScene}
                        onSeekToScene={seek}
                      />
                    </ResizablePanel>
                  )}

                  {viewerMode === "dual" && (
                    <ResizableHandle withHandle direction="horizontal" />
                  )}

                  {(viewerMode === "dual" || viewerMode === "program") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <div className="flex h-full w-full flex-col min-w-0 bg-background overflow-hidden">
                        <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-surface-2 px-3 text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
                            <span className="truncate font-semibold uppercase tracking-wider text-zinc-300">
                              Program Monitor (Full Video)
                            </span>
                            {playingScene && (
                              <Badge
                                variant="outline"
                                className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] py-0 h-4 shrink-0"
                              >
                                Cảnh #{playingScene.sceneIndex}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => playerRef.current?.toggle()}
                              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-700"
                            >
                              {isPlaying ? (
                                <>
                                  <Pause className="h-3 w-3 text-amber-400" /> Dừng
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 text-emerald-400" /> Phát
                                </>
                              )}
                            </button>
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {fmtMs(nowMs)}
                            </span>
                            <span className="text-zinc-600">/</span>
                            <span className="font-mono text-xs text-zinc-400">
                              {fmtMs(project.durationMs)}
                            </span>
                          </div>
                        </div>

                        <div className="relative flex flex-1 min-h-0 items-center justify-center p-3 overflow-hidden">
                          <StudioPlayer
                            ref={playerRef}
                            project={project}
                            ratio={ratio}
                            voiceVolume={audioMix?.voice ?? 1}
                          />
                        </div>

                        {playingScene && (
                          <div className="flex h-8 shrink-0 items-center justify-between border-t border-zinc-800/80 bg-surface-2 px-3 text-[11px] text-zinc-400">
                            <p className="truncate">
                              <span className="font-semibold text-amber-400 mr-1.5">
                                [Cảnh #{playingScene.sceneIndex}]
                              </span>
                              “{playingScene.transcriptText}”
                            </p>
                            <span className="shrink-0 font-mono text-[10px] text-zinc-500 ml-2">
                              Khung {ratio}
                            </span>
                          </div>
                        )}
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>

              {/* RIGHT DOCK: Inspector for Selected Scene (Collapsible) */}
              {showRightPanel && (
                <>
                  <ResizableHandle withHandle direction="horizontal" />
                  <ResizablePanel defaultSize="24%" minSize="16%" maxSize="38%">
                    <NleInspector
                      scene={selectedScene}
                      totalScenes={totalScenes}
                      frameAspectRatio={ratio === "9:16" ? "3:4" : "16:9"}
                      onSceneChange={updateScene}
                      onSeek={seek}
                      onClose={() => setShowRightPanel(false)}
                      allScenes={project.scenes}
                      words={project.words ?? []}
                      totalDurationMs={project.durationMs}
                      audioUrl={project.audioUrl}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* 3. BOTTOM DOCK: Multi-Track NLE Timeline (Resizable Height + Collapsible) */}
          {showBottomPanel && (
            <>
              <ResizableHandle withHandle direction="vertical" />
              <ResizablePanel defaultSize="30%" minSize="15%" maxSize="55%">
                <NleTimeline
                  scenes={project.scenes}
                  durationMs={project.durationMs}
                  nowMs={nowMs}
                  selectedSceneId={selectedScene?.id ?? null}
                  onSelectScene={(sc) => setSelectedSceneId(sc.id)}
                  onSeek={seek}
                  audioUrl={project.audioUrl}
                  onResizeSceneBoundary={handleResizeSceneBoundary}
                  onResizeSceneBoundaryEnd={handleResizeSceneBoundaryEnd}
                  onDropMediaOnScene={(sceneId, url) => handleAttachClipToScene(sceneId, url)}
                  onSplitAtPlayhead={handleSplitAtPlayhead}
                  canUndo={historyPast.length > 0}
                  canRedo={historyFuture.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onAudioMixChange={setAudioMix}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        /* DELIVER WORKSPACE */
        <div className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-2xl rounded-xl bg-surface-3 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-zinc-100">
                  <Film className="h-4 w-4 text-red-500" />
                  Deliver: Kết xuất MP4 (1080p) & Đăng YouTube
                </h2>
                <p className="text-xs text-zinc-400">
                  Dự án: <strong className="text-zinc-200">{project.title}</strong> ({ratio})
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWorkspaceMode("edit")}
                className="h-7 text-xs border-0 bg-zinc-800/80"
              >
                ← Quay lại Bàn dựng
              </Button>
            </div>

            <RenderAndYoutubePanel
              projectId={project.id}
              compositionId="StoryVideo"
              inputProps={{
                audioUrl: project.audioUrl,
                durationMs: Math.max(project.durationMs, 1000),
                aspectRatio: ratio,
                words: project.words ?? [],
                scenes: project.scenes ?? [],
                voiceVolume: audioMix?.voice ?? 1,
              }}
              defaultTitle={project.title}
              script={project.rawScript}
            />
          </div>
        </div>
      )}
    </div>
  );
}
