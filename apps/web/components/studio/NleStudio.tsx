"use client";

// Shared NLE studio used by every short-video type (Product, Football…).
// All editing state lives here; a `StudioVariant` supplies the presets,
// player, export settings and any extra controls for its video type.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import type { PlayerRef } from "@remotion/player";
import {
  Check,
  Columns2,
  Copy,
  Film,
  FolderOpen,
  PanelBottom,
  PanelRight,
  Pause,
  Play,
  Plus,
  Redo2,
  Rocket,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Project, Scene } from "@storytoon/shared-types";
import { FPS, msToFrames } from "@storytoon/video-engine";
import { api, fmtMs, type ProjectSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { projectKind } from "@/lib/project-kind";
import { RenderAndYoutubePanel } from "@/components/RenderAndYoutubePanel";
import { NleTimeline, type TimelineAudioMix } from "@/components/nle/NleTimeline";
import { NleInspector } from "@/components/nle/NleInspector";
import { NleMediaPool, type MediaPoolClip } from "@/components/nle/NleMediaPool";
import { NleSceneViewer } from "@/components/nle/NleSceneViewer";
import { NleWorkspaceSwitcher } from "@/components/nle/NleWorkspaceSwitcher";
import { ProjectLoadingOverlay } from "@/components/nle/ProjectLoadingOverlay";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useConfirmDialog, deleteProjectConfirm } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudioAccent, StudioPreset, StudioVariant } from "./types";

/** Full class strings per accent (kept literal so Tailwind can see them). */
const ACCENTS: Record<
  StudioAccent,
  { solid: string; toggleOn: string; seg: string; text: string; soft: string }
> = {
  emerald: {
    solid: "bg-primary hover:bg-primary/90 text-primary-foreground",
    toggleOn: "border-primary/50 bg-primary/15 text-primary-text",
    seg: "bg-primary/15 text-primary-text font-semibold",
    text: "text-primary-text",
    soft: "border-primary/20 bg-primary/10 text-primary-text",
  },
  amber: {
    solid: "bg-primary hover:bg-primary/90 text-primary-foreground",
    toggleOn: "border-primary/50 bg-primary/15 text-primary-text",
    seg: "bg-primary/15 text-primary-text font-semibold",
    text: "text-primary-text",
    soft: "border-primary/20 bg-primary/10 text-primary-text",
  },
};

/** Push `url` only when it differs from the current one (re-pushing the same URL makes Next re-navigate). */
function syncUrl(url: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname + window.location.search === url) return;
  window.history.pushState(null, "", url);
}

function makeBlankProject(variant: StudioVariant): Project {
  return {
    id: `new-blank-${variant.kind}`,
    title: "Dự án mới",
    rawScript: "",
    aspectRatio: "9:16",
    videoType: variant.kind,
    durationMs: 0,
    scenes: [],
    words: [],
    status: "ready",
    audioUrl: null,
    captionSrtUrl: null,
    captionVttUrl: null,
    errorMessage: null,
    characters: [],
    createdAt: new Date(0).toISOString(),
  };
}

export function NleStudio({ variant }: { variant: StudioVariant }) {
  const playerRef = useRef<PlayerRef>(null);
  const searchParams = useSearchParams();
  const [confirm, confirmDialog] = useConfirmDialog();
  const queryId = searchParams.get("id") || searchParams.get("project");
  const isNew = searchParams.get("new") === "1";

  const accent = ACCENTS[variant.accent];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blankProject = useMemo(() => makeBlankProject(variant), [variant.kind]);
  const findPreset = useCallback(
    (id: string | null | undefined) => (id ? variant.presets.find((p) => p.id === id) : undefined),
    [variant.presets]
  );
  const defaultPreset = findPreset(variant.defaultPresetId) ?? variant.presets[0];

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const queryPreset = findPreset(queryId);
  // URL trỏ tới dự án thật (không phải mẫu) -> chưa có dữ liệu, KHÔNG hiển thị dự án mẫu trong lúc chờ API
  const opensRealProject = !isNew && !!queryId && !queryPreset;
  const initialPreset = isNew || opensRealProject ? null : queryPreset ?? defaultPreset;
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(() =>
    opensRealProject ? queryId : null
  );
  const [project, setProject] = useState<Project>(() => initialPreset?.project ?? blankProject);

  // Undo / Redo Scene History Stack
  const [historyPast, setHistoryPast] = useState<Scene[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Scene[][]>([]);

  // NLE Workspace & Panel Visibility State
  const [workspaceMode, setWorkspaceMode] = useState<"edit" | "deliver">("edit");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [viewerMode, setViewerMode] = useState<"dual" | "scene" | "program">("dual");

  const [selectedSceneId, setSelectedSceneId] = useState<string>(() =>
    initialPreset ? initialPreset.initialSceneId ?? initialPreset.project.scenes[0]?.id ?? "" : ""
  );
  const [videoClips, setVideoClips] = useState<MediaPoolClip[]>(() =>
    initialPreset ? variant.extractMediaClips(initialPreset.project) : []
  );

  // Script & Voice Creator State
  const [title, setTitle] = useState(() => initialPreset?.project.title ?? "");
  const [script, setScript] = useState(() => initialPreset?.project.rawScript ?? "");
  const [selectedVoice, setSelectedVoice] = useState(variant.defaultVoice);

  // Apply the opening preset's side effects once (e.g. its broadcast template)
  useEffect(() => {
    initialPreset?.onLoad?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [creatingVideo, setCreatingVideo] = useState(false);

  // Batch & Media Operations
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [attachingMedia, setAttachingMedia] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);


  // Track mixer (mute / volume) from the timeline, applied live to the Program Monitor
  const [audioMix, setAudioMix] = useState<TimelineAudioMix | null>(null);

  const updateScenesWithHistory = useCallback((updater: (prev: Scene[]) => Scene[]) => {
    setProject((prev) => {
      const nextScenes = updater(prev.scenes);
      setHistoryPast((h) => [...h.slice(-24), prev.scenes]);
      setHistoryFuture([]);
      return { ...prev, scenes: nextScenes };
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((h) => h.slice(0, -1));
    setHistoryFuture((f) => [project.scenes, ...f]);
    setProject((p) => ({ ...p, scenes: previous }));
    toast.info("Đã hoàn tác (Undo)");
  }, [historyPast, project.scenes]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((h) => [...h, project.scenes]);
    setProject((p) => ({ ...p, scenes: next }));
    toast.info("Đã làm lại (Redo)");
  }, [historyFuture, project.scenes]);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.listProjects();
      setProjects(list.filter((p) => projectKind(p) === variant.kind));
    } catch {
      // ignore
    }
  }, [variant.kind]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const handleCreateNewBlankProject = useCallback(() => {
    setHistoryPast([]);
    setHistoryFuture([]);
    setProject(blankProject);
    setTitle("");
    setScript("");
    setSelectedSceneId("");
    setVideoClips([]);
    setShowLeftPanel(true);
    if (typeof window !== "undefined") {
      syncUrl(`${variant.path}?new=1`);
    }
    toast.success("Đã mở dự án mới! Hãy nhập kịch bản hoặc thêm media.");
  }, [blankProject, variant.path]);

  const handleAddFirstScene = useCallback(() => {
    const firstScene: Scene = {
      id: `sc-init-${Date.now()}`,
      projectId: project.id,
      sceneIndex: 1,
      startMs: 0,
      endMs: 4000,
      transcriptText: "Phân cảnh giới thiệu sản phẩm đầu tiên",
      setting: "Cảnh 1",
      characters: [],
      imagePrompt: "Commercial product showcase, clean studio lighting 4k",
      imageUrl: null,
      cameraEffect: "zoom_in",
      transition: "fade",
      showCaption: true,
    };
    updateScenesWithHistory(() => [firstScene]);
    setSelectedSceneId(firstScene.id);
    setProject((p) => ({ ...p, durationMs: 4000 }));
    toast.success("Đã thêm Cảnh #1 mới");
  }, [project.id, updateScenesWithHistory]);

  function loadPreset(preset: StudioPreset) {
    setHistoryPast([]);
    setHistoryFuture([]);
    setProject(preset.project);
    setTitle(preset.project.title);
    setScript(preset.project.rawScript);
    setSelectedSceneId(preset.initialSceneId ?? preset.project.scenes[0]?.id ?? "");
    setVideoClips(variant.extractMediaClips(preset.project));
    preset.onLoad?.();
    toast.success(`Đã nạp mẫu: ${preset.label}`);
  }

  const loadExistingProject = useCallback(
    async (id: string) => {
      if (id === "__new_blank__" || id === blankProject.id) {
        handleCreateNewBlankProject();
        return;
      }
      const preset = findPreset(id);
      if (preset) return loadPreset(preset);
      setLoadingProjectId(id);
      try {
        const p = await api.getProject(id);
        setHistoryPast([]);
        setHistoryFuture([]);
        setProject(p);
        setTitle(p.title);
        setScript(p.rawScript);
        if (p.scenes.length > 0) {
          setSelectedSceneId(p.scenes[0].id);
        } else {
          setSelectedSceneId("");
        }
        // Thay thế hoàn toàn Media Pool bằng danh sách media của chính dự án này (không gộp với prev)
        setVideoClips(variant.extractMediaClips(p));
        if (typeof window !== "undefined") {
          syncUrl(`${variant.path}?id=${p.id}`);
        }
        toast.success(`Đã mở dự án: ${p.title}`);
      } catch (e) {
        toast.error("Không thể tải dự án", { description: (e as Error).message });
      } finally {
        setLoadingProjectId((cur) => (cur === id ? null : cur));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleCreateNewBlankProject, blankProject.id, findPreset, variant]
  );

  // Handle URL Query Params
  useEffect(() => {
    if (isNew && project.id !== blankProject.id) {
      handleCreateNewBlankProject();
      return;
    }
    if (!isNew && queryId && queryId !== project.id) {
      loadExistingProject(queryId);
    }
  }, [queryId, isNew, project.id, handleCreateNewBlankProject, loadExistingProject]);

  // Polling updates while project is processing in backend
  useEffect(() => {
    if (
      project.id.startsWith("demo-") ||
      project.id === blankProject.id ||
      project.status === "ready" ||
      project.status === "failed"
    ) {
      return;
    }
    const t = setInterval(async () => {
      try {
        const updated = await api.getProject(project.id);
        if (
          updated.status !== project.status ||
          updated.scenes.length !== project.scenes.length
        ) {
          setProject(updated);
          setVideoClips(variant.extractMediaClips(updated));
          if (updated.status === "ready") {
            toast.success("Pipeline AI đã xử lý xong dự án!");
            refreshList();
            if (updated.scenes.length > 0) {
              setSelectedSceneId(updated.scenes[0].id);
            }
          } else if (updated.status === "failed") {
            toast.error(
              "Quá trình xử lý AI thất bại: " + (updated.errorMessage || "Lỗi không xác định")
            );
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.status, project.scenes.length]);

  // Đồng bộ Player timecode
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
  }, [project.id, workspaceMode, viewerMode]);

  const selectedScene = useMemo<Scene | null>(() => {
    if (!project.scenes.length) return null;
    return (
      project.scenes.find((s) => s.id === selectedSceneId) ??
      project.scenes[0] ??
      null
    );
  }, [project.scenes, selectedSceneId]);

  const playingScene = useMemo<Scene | null>(() => {
    if (!project.scenes.length) return null;
    return (
      project.scenes.find((s) => nowMs >= s.startMs && nowMs < s.endMs) ??
      project.scenes[0] ??
      null
    );
  }, [project.scenes, nowMs]);

  const seek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(project.durationMs, ms));
      setNowMs(clamped);
      playerRef.current?.seekTo(Math.round((clamped / 1000) * FPS));
    },
    [project.durationMs]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  }, [isPlaying]);


  async function handleDeleteCurrentProject(id: string, projectTitle: string) {
    if (id.startsWith("demo-")) {
      toast.info("Không thể xóa dự án mẫu cài sẵn!");
      return;
    }
    if (!(await confirm(deleteProjectConfirm(projectTitle)))) {
      return;
    }
    const toastId = toast.loading(`Đang xóa dự án "${projectTitle}"...`);
    try {
      await api.deleteProject(id);
      toast.success(`Đã xóa dự án "${projectTitle}"`, { id: toastId });
      loadPreset(defaultPreset);
      refreshList();
    } catch (e) {
      toast.error("Không thể xóa dự án", {
        id: toastId,
        description: (e as Error).message,
      });
    }
  }

  const handleSplitAtPlayhead = useCallback(() => {
    const target = project.scenes.find(
      (s) => nowMs >= s.startMs + 350 && nowMs <= s.endMs - 350
    );
    if (!target) {
      toast.warning("Playhead phải nằm trong cảnh và cách 2 mép ít nhất 0.35s");
      return;
    }

    const splitPoint = Math.round(nowMs);
    const words = target.transcriptText.split(/\s+/).filter(Boolean);
    const ratio =
      (splitPoint - target.startMs) / Math.max(1, target.endMs - target.startMs);
    const cutIdx = Math.max(
      1,
      Math.min(words.length - 1, Math.round(words.length * ratio))
    );
    const text1 = words.slice(0, cutIdx).join(" ") || target.transcriptText;
    const text2 = words.slice(cutIdx).join(" ") || target.transcriptText;

    const nextScenes: Scene[] = [];
    project.scenes.forEach((sc) => {
      if (sc.id !== target.id) {
        nextScenes.push(sc);
      } else {
        nextScenes.push({
          ...sc,
          endMs: splitPoint,
          transcriptText: text1,
        });
        nextScenes.push({
          ...sc,
          id: `${sc.id}-split-${Date.now()}`,
          startMs: splitPoint,
          endMs: sc.endMs,
          transcriptText: text2,
          transition: "cut",
        });
      }
    });

    const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
    updateScenesWithHistory(() => reindexed);
    if (!project.id.startsWith("demo-")) {
      api.saveProjectScenes(project.id, reindexed).catch(() => {});
    }
    toast.success(`Đã tách Cảnh #${target.sceneIndex} tại ${fmtMs(splitPoint)}`);
  }, [nowMs, project.id, project.scenes, updateScenesWithHistory]);

  const handleSplitSceneAtMs = useCallback(
    (sceneId: string, splitMs: number) => {
      const target = project.scenes.find((s) => s.id === sceneId);
      if (!target) return;
      if (splitMs <= target.startMs + 350 || splitMs >= target.endMs - 350) {
        toast.warning("Vui lòng chọn điểm cắt cách 2 mép ít nhất 0.35s");
        return;
      }
      const words = target.transcriptText.split(/\s+/).filter(Boolean);
      const ratio =
        (splitMs - target.startMs) / Math.max(1, target.endMs - target.startMs);
      const cutIdx = Math.max(
        1,
        Math.min(words.length - 1, Math.round(words.length * ratio))
      );
      const text1 = words.slice(0, cutIdx).join(" ") || target.transcriptText;
      const text2 = words.slice(cutIdx).join(" ") || target.transcriptText;

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc) => {
        if (sc.id !== target.id) {
          nextScenes.push(sc);
        } else {
          nextScenes.push({
            ...sc,
            endMs: splitMs,
            transcriptText: text1,
          });
          nextScenes.push({
            ...sc,
            id: `${sc.id}-split-${Date.now()}`,
            startMs: splitMs,
            endMs: sc.endMs,
            transcriptText: text2,
            transition: "cut",
          });
        }
      });
      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã tách Cảnh #${target.sceneIndex} tại ${fmtMs(splitMs)}`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleMergeScene = useCallback(
    (sceneId: string, direction: "prev" | "next") => {
      const idx = project.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return;

      const targetIdx = direction === "prev" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= project.scenes.length) {
        toast.warning(
          direction === "prev"
            ? "Đây là cảnh đầu tiên, không thể gộp về trước"
            : "Đây là cảnh cuối cùng, không thể gộp về sau"
        );
        return;
      }

      const firstScene =
        direction === "prev" ? project.scenes[targetIdx] : project.scenes[idx];
      const secondScene =
        direction === "prev" ? project.scenes[idx] : project.scenes[targetIdx];

      const mergedScene: Scene = {
        ...firstScene,
        endMs: secondScene.endMs,
        transcriptText: `${firstScene.transcriptText.trim()} ${secondScene.transcriptText.trim()}`.trim(),
        setting: firstScene.setting || secondScene.setting,
      };

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc, i) => {
        if (i === (direction === "prev" ? targetIdx : idx)) {
          nextScenes.push(mergedScene);
        } else if (i === (direction === "prev" ? idx : targetIdx)) {
          // skip merged
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(mergedScene.id);
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(
        `Đã gộp Cảnh #${firstScene.sceneIndex} và Cảnh #${secondScene.sceneIndex} thành một cảnh!`
      );
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleAddSceneAfter = useCallback(
    (afterSceneId: string) => {
      const idx = project.scenes.findIndex((s) => s.id === afterSceneId);
      if (idx === -1) return;
      const target = project.scenes[idx];
      const dur = target.endMs - target.startMs;
      if (dur < 1000) {
        toast.warning("Cảnh này quá ngắn (<1s) để chia thêm cảnh mới");
        return;
      }

      const midMs = Math.round(target.startMs + dur / 2);
      const words = target.transcriptText.split(/\s+/).filter(Boolean);
      const half = Math.max(1, Math.floor(words.length / 2));
      const t1 = words.slice(0, half).join(" ") || "Phân cảnh mới";
      const t2 = words.slice(half).join(" ") || "Phân cảnh mới tiếp theo";

      const newScene: Scene = {
        id: `sc-new-${Date.now()}`,
        projectId: project.id,
        sceneIndex: target.sceneIndex + 1,
        startMs: midMs,
        endMs: target.endMs,
        transcriptText: t2,
        setting: `Phân cảnh #${target.sceneIndex + 1}`,
        characters: target.characters ?? [],
        imagePrompt:
          target.imagePrompt ??
          "Slow macro push-in focusing on mechanical action, subtle studio softbox lighting shift, sound direction: tactile mechanical sfx, no speech",
        imageUrl: target.imageUrl ?? null,
        cameraEffect: "zoom_in",
        transition: "slide",
        showCaption: true,
      };

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc, i) => {
        if (i === idx) {
          nextScenes.push({ ...target, endMs: midMs, transcriptText: t1 });
          nextScenes.push(newScene);
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(newScene.id);
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã thêm Cảnh #${newScene.sceneIndex} mới`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleDeleteScene = useCallback(
    (sceneId: string) => {
      if (project.scenes.length <= 1) {
        toast.warning("Không thể xóa cảnh duy nhất của dự án!");
        return;
      }
      const idx = project.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return;
      const target = project.scenes[idx];

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc, i) => {
        if (sc.id === sceneId) return;
        if (i === idx - 1) {
          nextScenes.push({ ...sc, endMs: target.endMs });
        } else if (idx === 0 && i === 1) {
          nextScenes.push({ ...sc, startMs: target.startMs });
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(
        reindexed[Math.max(0, idx - 1)]?.id ?? reindexed[0]?.id ?? ""
      );
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã xóa Cảnh #${target.sceneIndex}`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleUpdateSceneBounds = useCallback(
    (
      sceneId: string,
      newStartMs: number,
      newEndMs: number,
      newTranscriptText?: string
    ) => {
      updateScenesWithHistory((scenes) =>
        scenes.map((sc) => {
          if (sc.id !== sceneId) return sc;
          return {
            ...sc,
            startMs: newStartMs,
            endMs: newEndMs,
            transcriptText: newTranscriptText ?? sc.transcriptText,
          };
        })
      );
      if (!project.id.startsWith("demo-")) {
        api
          .updateScene(sceneId, {
            startMs: newStartMs,
            endMs: newEndMs,
            transcriptText: newTranscriptText,
          })
          .catch(() => {});
      }
    },
    [project.id, updateScenesWithHistory]
  );

  const handleResizeSceneBoundary = useCallback(
    (leftSceneId: string, rightSceneId: string, newBoundaryMs: number) => {
      setProject((prev) => ({
        ...prev,
        scenes: prev.scenes.map((sc) => {
          if (sc.id === leftSceneId) return { ...sc, endMs: newBoundaryMs };
          if (sc.id === rightSceneId) return { ...sc, startMs: newBoundaryMs };
          return sc;
        }),
      }));
    },
    []
  );

  const handleResizeSceneBoundaryEnd = useCallback(
    (leftSceneId: string, rightSceneId: string, newBoundaryMs: number) => {
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
    [project.id, updateScenesWithHistory]
  );

  async function attachMediaToSceneById(
    sceneId: string,
    mediaUrl: string,
    isLocalClip = false
  ) {
    const target = project.scenes.find((s) => s.id === sceneId);
    if (!target) return;

    if (
      isLocalClip &&
      !videoClips.some((c) => c.url.split("#")[0] === mediaUrl.split("#")[0])
    ) {
      const fileName = mediaUrl.split("/").pop()?.split("#")[0] ?? "Clip mới";
      setVideoClips((prev) => [
        { label: fileName, url: mediaUrl, badge: "Upload" },
        ...prev,
      ]);
    }

    if (project.id.startsWith("demo-")) {
      updateScenesWithHistory((scenes) =>
        scenes.map((s) => (s.id === sceneId ? { ...s, imageUrl: mediaUrl } : s))
      );
      return;
    }

    setAttachingMedia(mediaUrl);
    try {
      const updated = isLocalClip
        ? await api.updateScene(sceneId, { imageUrl: mediaUrl })
        : await api.generateSceneImage(sceneId, mediaUrl);
      updateScenesWithHistory((scenes) =>
        scenes.map((s) => (s.id === sceneId ? { ...s, ...updated } : s))
      );
    } catch (e: any) {
      toast.error("Lỗi gắn Media vào cảnh", { description: e.message });
    } finally {
      setAttachingMedia(null);
    }
  }

  async function handleAttachMediaToSelectedScene(
    mediaUrl: string,
    isLocalClip = false
  ) {
    if (!selectedScene) return;
    await attachMediaToSceneById(selectedScene.id, mediaUrl, isLocalClip);
  }

  async function handleDropMediaOnScene(
    sceneId: string,
    mediaUrl: string,
    isLocalClip: boolean
  ) {
    const target = project.scenes.find((s) => s.id === sceneId);
    setSelectedSceneId(sceneId);
    await attachMediaToSceneById(sceneId, mediaUrl, isLocalClip);
    toast.success(`Đã thả Media vào Cảnh #${target?.sceneIndex ?? ""}`);
  }

  async function handleGenerateAllMissingBroll() {
    if (project.id.startsWith("demo-")) {
      toast.info("Dự án mẫu đã có sẵn hình ảnh!");
      return;
    }
    const missing = project.scenes.filter((s) => !s.imageUrl);
    if (missing.length === 0) {
      toast.info("Tất cả các cảnh đã có hình ảnh!");
      return;
    }
    setBatchGenerating(true);
    const toastId = toast.loading(`Đang vẽ ${missing.length} ảnh AI (FLUX)...`);
    try {
      for (let i = 0; i < missing.length; i++) {
        const sc = missing[i];
        setBatchProgress(`${i + 1}/${missing.length}`);
        const updated = await api.generateSceneImage(sc.id, sc.imagePrompt);
        setProject((prev) => {
          const nextProj = {
            ...prev,
            scenes: prev.scenes.map((x) =>
              x.id === sc.id ? { ...x, ...updated } : x
            ),
          };
          setVideoClips(variant.extractMediaClips(nextProj));
          return nextProj;
        });
      }
      toast.success("Đã vẽ xong toàn bộ ảnh!", { id: toastId });
    } catch (e: any) {
      toast.error("Lỗi vẽ ảnh hàng loạt", {
        id: toastId,
        description: e.message,
      });
    } finally {
      setBatchGenerating(false);
      setBatchProgress("");
    }
  }

  const updateSelectedScene = useCallback(
    (updated: Scene) => {
      updateScenesWithHistory((scenes) =>
        scenes.map((x) => (x.id === updated.id ? updated : x))
      );
    },
    [updateScenesWithHistory]
  );

  // Khởi tạo Pipeline AI: Tạo Voice AI (Duyên Hà My / VieNeu) + Tự động chia cảnh < 8s
  async function handleCreateAndProcess() {
    if (!script.trim()) {
      toast.warning("Vui lòng nhập kịch bản!");
      return;
    }

    setCreatingVideo(true);
    const toastId = toast.loading(
      `Đang tạo giọng đọc (${selectedVoice}) & chia cảnh tự động...`
    );

    try {
      const created = await api.createProject({
        title: title.trim() || variant.defaultProjectTitle,
        script: script.trim(),
        aspectRatio: "9:16",
        videoType: variant.kind,
      });

      await api.processProject(created.id, selectedVoice);

      // Nạp dữ liệu dự án vừa tạo
      const latest = await api.getProject(created.id);
      setHistoryPast([]);
      setHistoryFuture([]);
      setProject(latest);
      setVideoClips(variant.extractMediaClips(latest));
      if (latest.scenes.length > 0) {
        setSelectedSceneId(latest.scenes[0].id);
      } else {
        setSelectedSceneId("");
      }
      if (typeof window !== "undefined") {
        syncUrl(`${variant.path}?id=${created.id}`);
      }

      toast.success(
        `Đã khởi chạy Pipeline AI với giọng ${selectedVoice}!`,
        { id: toastId }
      );
      setCreatingVideo(false);
      refreshList();
    } catch (e: any) {
      toast.error("Lỗi tạo dự án", {
        id: toastId,
        description: e.message,
      });
      setCreatingVideo(false);
    }
  }

  // NLE Hotkeys (Space, S, Cmd+Z, Cmd+Shift+Z, Arrows, 1/2/3)
  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      togglePlay();
    },
    { enableOnFormTags: false },
    [togglePlay]
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
    "shift+left",
    (e) => {
      e.preventDefault();
      seek(nowMs - 1000);
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "shift+right",
    (e) => {
      e.preventDefault();
      seek(nowMs + 1000);
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
  useHotkeys("1", () => setViewerMode("dual"), [setViewerMode]);
  useHotkeys("2", () => setViewerMode("scene"), [setViewerMode]);
  useHotkeys("3", () => setViewerMode("program"), [setViewerMode]);

  const deliver = useMemo(
    () => variant.deliver(project, audioMix, selectedVoice),
    [variant, project, audioMix, selectedVoice]
  );
  const exportedConfigJson = useMemo(() => JSON.stringify(deliver.configJson, null, 2), [deliver]);

  const missingCount = useMemo(
    () => project.scenes.filter((s) => !s.imageUrl).length,
    [project.scenes]
  );

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-surface-1 text-zinc-100 select-none">
      {loadingProjectId && <ProjectLoadingOverlay />}
      {confirmDialog}
      {/* 1. TOP NLE HEADER BAR (48px) */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800/90 bg-surface-3 px-3 z-20">
        {/* Left: Media Pool Toggle + Brand Badge + Project Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Media Pool (Thư viện media & kịch bản)"
                type="button"
                onClick={() => setShowLeftPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showLeftPanel
                    ? accent.toggleOn
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Media Pool (Thư viện media & kịch bản)</TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateNewBlankProject}
            className="h-7 shrink-0 gap-1 px-2.5 text-xs font-semibold"
            title="Tạo dự án trắng mới"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Tạo mới</span>
          </Button>

          <Select
            value={
              loadingProjectId
                ? loadingProjectId
                : project.id === blankProject.id
                  ? "__new_blank__"
                  : project.id
            }
            onValueChange={loadExistingProject}
          >
            <SelectTrigger className="h-7 w-[240px] border-zinc-700/80 bg-zinc-900/90 text-xs text-zinc-100 font-medium">
              <SelectValue placeholder="Chọn dự án..." />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-surface-3 text-zinc-200">
              <SelectGroup>
                <SelectItem
                  value="__new_blank__"
                  className={cn("text-xs font-bold", accent.text)}
                >
                  Dự án trắng mới
                </SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-xs uppercase font-bold text-muted-foreground px-2 py-1">
                  Dự án mẫu (Demo)
                </SelectLabel>
                {variant.presets
                  .filter((p) => !p.hidden)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
              </SelectGroup>

              {projects.filter((p) => !findPreset(p.id)).length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-xs uppercase font-bold text-muted-foreground px-2 py-1 border-t border-zinc-800 mt-1 pt-1">
                    Dự án của bạn
                  </SelectLabel>
                  {projects
                    .filter((p) => !findPreset(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.title} ({fmtMs(p.durationMs)})
                      </SelectItem>
                    ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>

          {!project.id.startsWith("demo-") && project.id !== blankProject.id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Xóa dự án này khỏi hệ thống"
                  type="button"
                  onClick={() => handleDeleteCurrentProject(project.id, project.title)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Xóa dự án này khỏi hệ thống</TooltipContent>
            </Tooltip>
          )}

          {/* Undo / Redo Buttons */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Hoàn tác (Cmd+Z)"
                  type="button"
                  disabled={historyPast.length === 0}
                  onClick={handleUndo}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Hoàn tác (Cmd+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Làm lại (Cmd+Shift+Z)"
                  type="button"
                  disabled={historyFuture.length === 0}
                  onClick={handleRedo}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <Redo2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Làm lại (Cmd+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Center: DaVinci Resolve Workspace Switcher (Edit vs Deliver) + Dual Monitor Mode */}
        <div className="flex items-center gap-2">
          <NleWorkspaceSwitcher mode={workspaceMode} onChange={setWorkspaceMode} accent={variant.accent} />

          {workspaceMode === "edit" && (
            <div className="hidden lg:flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 text-xs gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Dual Monitor (Cảnh đang làm + Full Video)"
                    type="button"
                    onClick={() => setViewerMode("dual")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "dual"
                        ? accent.seg
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
                        ? accent.seg
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
                        ? accent.seg
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

        {/* Right: variant controls (e.g. B-roll frame) + Panel Toggles */}
        <div className="flex items-center gap-1.5">
          {variant.headerExtras}
          {workspaceMode === "edit" && project.scenes.length > 0 && (
            <Button
              size="sm"
              onClick={() => setWorkspaceMode("deliver")}
              className={cn("h-7 shrink-0 gap-1.5 px-3 text-xs font-semibold", accent.solid)}
            >
              <Rocket className="h-3.5 w-3.5" aria-hidden />
              Xuất video
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Đóng / Mở Timeline"
                type="button"
                onClick={() => setShowBottomPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showBottomPanel
                    ? accent.toggleOn
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
                    ? accent.toggleOn
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

      {/* 2. RESIZABLE NLE WORKSPACE: EDIT MODE vs DELIVER MODE */}
      {workspaceMode === "edit" ? (
        <ResizablePanelGroup orientation="vertical" className="flex-1 min-h-0">
          {/* TOP DOCK (Media Pool | Dual Monitors | Inspector) */}
          <ResizablePanel defaultSize={showBottomPanel ? "70%" : "100%"} minSize="35%">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
              {/* LEFT DOCK: Media Pool & AI Script (Collapsible) */}
              {showLeftPanel && (
                <>
                  <ResizablePanel defaultSize="20%" minSize="14%" maxSize="35%">
                    <NleMediaPool
                      selectedScene={selectedScene}
                      videoClips={videoClips}
                      attachingMedia={attachingMedia}
                      onAttachMedia={handleAttachMediaToSelectedScene}
                      missingCount={missingCount}
                      batchGenerating={batchGenerating}
                      batchProgress={batchProgress}
                      onGenerateAllMissing={handleGenerateAllMissingBroll}
                      title={title}
                      setTitle={setTitle}
                      script={script}
                      setScript={setScript}
                      selectedVoice={selectedVoice}
                      setSelectedVoice={setSelectedVoice}
                      creatingVideo={creatingVideo}
                      onCreateAndProcess={handleCreateAndProcess}
                      onClose={() => setShowLeftPanel(false)}
                      initialTab={project.scenes.length === 0 ? "script" : "media"}
                      titlePlaceholder={variant.mediaPool.titlePlaceholder}
                      scriptPlaceholder={variant.mediaPool.scriptPlaceholder}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle direction="horizontal" />
                </>
              )}

              {/* CENTER DOCK: DaVinci Resolve Dual Monitors (Left = Scene Monitor, Right = Program Full Video) */}
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
                  {/* Left Monitor: Scene Monitor (Active Scene Crop & In-Point Trim) */}
                  {(viewerMode === "dual" || viewerMode === "scene") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <NleSceneViewer
                        scene={selectedScene}
                        frameAspectRatio={variant.frameAspectRatio}
                        onSceneChange={updateSelectedScene}
                        onSeekToScene={seek}
                        defaultShowCropFrame={variant.showCropFrameByDefault}
                      />
                    </ResizablePanel>
                  )}

                  {viewerMode === "dual" && (
                    <ResizableHandle withHandle direction="horizontal" />
                  )}

                  {/* Right Monitor: Program Monitor (Full Assembled Video 9:16) */}
                  {(viewerMode === "dual" || viewerMode === "program") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <div className="flex h-full w-full flex-col min-w-0 bg-background overflow-hidden">
                        {/* Program Monitor Compact Transport Bar */}
                        <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-surface-2 px-2.5 text-xs">
                          <button
                            type="button"
                            onClick={togglePlay}
                            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                            title="Phím tắt: Space"
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="h-3 w-3 text-primary-text" /> Dừng
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 text-primary-text" /> Phát
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="font-bold text-primary-text">
                              {fmtMs(nowMs)}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-zinc-400">
                              {fmtMs(project.durationMs)}
                            </span>
                          </div>
                        </div>

                        {/* Remotion Full 9:16 Vertical Player Monitor */}
                        <div className="relative flex flex-1 min-h-0 items-center justify-center p-2.5 overflow-hidden">
                          {project.scenes.length === 0 ? (
                            <div className="flex h-full w-full max-w-[280px] aspect-[9/16] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-surface-2 p-6 text-center shadow-xl">
                              <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-full border", accent.soft)}>
                                <Sparkles className="h-6 w-6" />
                              </div>
                              <h4 className="text-sm font-bold text-zinc-100 mb-1">Dự Án Trắng (Blank)</h4>
                              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                Chưa có phân cảnh nào. Nhập kịch bản ở Media Pool để AI tạo giọng đọc và phân cảnh tự động.
                              </p>
                              <Button
                                size="sm"
                                onClick={() => setShowLeftPanel(true)}
                                className={cn("gap-1.5 font-bold text-xs", accent.solid)}
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                                Mở Kịch Bản &amp; Giọng AI
                              </Button>
                            </div>
                          ) : (
                            variant.renderPlayer({ ref: playerRef, project, mix: audioMix ?? undefined })
                          )}
                        </div>
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>

              {/* RIGHT DOCK: Inspector for Selected Scene & Prompt Assistant (Collapsible) */}
              {showRightPanel && (
                <>
                  <ResizableHandle withHandle direction="horizontal" />
                  <ResizablePanel defaultSize="24%" minSize="16%" maxSize="38%">
                    <NleInspector
                      scene={selectedScene}
                      totalScenes={project.scenes.length}
                      frameAspectRatio={variant.frameAspectRatio}
                      onSceneChange={updateSelectedScene}
                      onSeek={seek}
                      onClose={() => setShowRightPanel(false)}
                      allScenes={project.scenes}
                      words={project.words ?? []}
                      totalDurationMs={project.durationMs}
                      onUpdateBounds={handleUpdateSceneBounds}
                      onSplitSceneAtMs={handleSplitSceneAtMs}
                      onMergeScene={handleMergeScene}
                      onAddSceneAfter={handleAddSceneAfter}
                      onDeleteScene={handleDeleteScene}
                      audioUrl={project.audioUrl}
                      {...variant.inspectorProps}
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
              <ResizablePanel defaultSize="34%" minSize="18%" maxSize="65%">
                <NleTimeline
                  scenes={project.scenes}
                  durationMs={project.durationMs}
                  nowMs={nowMs}
                  selectedSceneId={selectedScene?.id ?? null}
                  onSelectScene={(sc) => setSelectedSceneId(sc.id)}
                  onSeek={seek}
                  audioUrl={project.audioUrl}
                  bgmUrl={variant.bgm.url}
                  onResizeSceneBoundary={handleResizeSceneBoundary}
                  onResizeSceneBoundaryEnd={handleResizeSceneBoundaryEnd}
                  onDropMediaOnScene={handleDropMediaOnScene}
                  onSplitAtPlayhead={handleSplitAtPlayhead}
                  onAddScene={() => {
                    if (project.scenes.length === 0) {
                      handleAddFirstScene();
                    } else if (selectedScene) {
                      handleAddSceneAfter(selectedScene.id);
                    } else if (project.scenes.length > 0) {
                      handleAddSceneAfter(project.scenes[project.scenes.length - 1].id);
                    }
                  }}
                  onMergeSelectedWithNext={() =>
                    selectedScene && handleMergeScene(selectedScene.id, "next")
                  }
                  canUndo={historyPast.length > 0}
                  canRedo={historyFuture.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onDeleteScene={handleDeleteScene}
                  onAudioMixChange={setAudioMix}
                  initialBgmVolume={variant.bgm.volume}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        /* DELIVER WORKSPACE (Render MP4 & Upload YouTube) */
        <div className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-xl bg-surface-3 p-5 shadow-xl border border-zinc-800">
              <div className="mb-4 flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-zinc-100">
                    <Rocket className={cn("h-5 w-5", accent.text)} />
                    Deliver: Kết xuất MP4 (1080p) &amp; Đăng YouTube Shorts
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {deliver.summary}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkspaceMode("edit")}
                  className="h-7 text-xs border-0 bg-zinc-800/80 text-zinc-300 hover:text-white"
                >
                  ← Quay lại Bàn dựng
                </Button>
              </div>

              <RenderAndYoutubePanel
                projectId={project.id}
                compositionId={deliver.compositionId}
                inputProps={deliver.inputProps}
                defaultTitle={deliver.defaultTitle}
                script={project.rawScript}
              />
            </div>

            {/* Quick Preview Specs & Remotion Props JSON */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="rounded-xl bg-surface-3 p-5 shadow-xl border border-zinc-800 space-y-3">
                <h3 className={cn("text-xs font-bold uppercase tracking-wider", accent.text)}>
                  Thông Số Kỹ Thuật Render
                </h3>
                <dl className="space-y-2 text-xs">
                  {deliver.specs.map(([label, value], idx) => (
                    <div
                      key={label}
                      className={cn(
                        "flex justify-between gap-3",
                        idx < deliver.specs.length - 1 && "border-b border-zinc-800/80 pb-1.5"
                      )}
                    >
                      <dt className="text-zinc-400">{label}</dt>
                      <dd className="text-right font-mono font-semibold text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <details className="group rounded-xl bg-surface-3 p-4 shadow-xl border border-zinc-800">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Terminal className={cn("h-3.5 w-3.5", accent.text)} />
                    Cấu hình Remotion Props (JSON)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs border-0 bg-zinc-800/80"
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(exportedConfigJson);
                      setCopiedJson(true);
                      toast.success("Đã copy cấu hình JSON vào clipboard");
                      setTimeout(() => setCopiedJson(false), 1500);
                    }}
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3 w-3 text-primary-text" />
                        Đã copy
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </summary>
                <pre className="mt-3 max-h-[300px] overflow-auto rounded-lg bg-zinc-950 p-3 text-xs leading-relaxed text-primary-text">
                  {exportedConfigJson}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
