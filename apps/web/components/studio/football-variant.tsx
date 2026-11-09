"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FootballBroadcastConfig, MediaAspectRatio } from "@storytoon/shared-types";
import { msToFrames } from "@storytoon/video-engine";
import { cn } from "@/lib/utils";
import { FootballPlayer } from "@/components/FootballPlayer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FOOTBALL_DEMO_PRESETS,
  MEDIA_BASE,
  defaultBroadcastConfig,
  extractFootballMediaClips,
} from "./football-data";
import type { StudioPreset, StudioVariant } from "./types";

const ASPECT_OPTIONS: { value: MediaAspectRatio; label: string }[] = [
  { value: "3:4", label: "3:4 Dọc" },
  { value: "4:3", label: "4:3 Chuẩn" },
  { value: "16:9", label: "16:9 Ngang" },
  { value: "1:1", label: "1:1 Vuông" },
];

const PRESET_DEFS: {
  key: keyof typeof FOOTBALL_DEMO_PRESETS;
  label: string;
  initialSceneId?: string;
}[] = [
  { key: "el_clasico", label: "[Video] Barca 1-2 Real (3 bàn thắng)", initialSceneId: "demo-ec-3" },
  { key: "mancity_psg", label: "[Mẫu] Man City 2-4 PSG" },
  { key: "roma_real", label: "[Mẫu] Real Madrid 4-3 Roma" },
  { key: "vtv_news_reel", label: "[Mẫu VTV News] MU 0-2 Hull City (Liquid Glass)" },
];

/**
 * Football broadcast studio = the shared studio + broadcast templates
 * (Bản tin đồ hoạ / VTV News), theme, B-roll frame ratio and their player.
 */
export function useFootballVariant(): StudioVariant {
  const [config, setConfig] = useState<FootballBroadcastConfig>(() => ({
    ...defaultBroadcastConfig("navy"),
    ...FOOTBALL_DEMO_PRESETS.el_clasico.config,
  }));

  const updateTheme = useCallback((theme: "navy" | "crimson") => {
    setConfig((prev) => ({
      ...prev,
      backgroundTheme: theme,
      backgroundColor: theme === "crimson" ? "#BA0C2F" : "#0A1C3E",
      backgroundTileUrl:
        theme === "crimson"
          ? `${MEDIA_BASE}/football-assets/broadcast_seamless_tile_red.png`
          : `${MEDIA_BASE}/football-assets/broadcast_seamless_tile_blue.png`,
    }));
  }, []);

  // Stable across config edits so the studio's project loading isn't re-triggered.
  const presets = useMemo<StudioPreset[]>(
    () =>
      PRESET_DEFS.map(({ key, label, initialSceneId }) => {
        const preset = FOOTBALL_DEMO_PRESETS[key];
        return {
          id: preset.project.id,
          label,
          project: preset.project,
          initialSceneId,
          onLoad: () => setConfig((prev) => ({ ...prev, ...preset.config })),
        };
      }),
    []
  );

  const aspect = config.mediaAspectRatio ?? "3:4";

  return useMemo<StudioVariant>(
    () => ({
      kind: "football",
      path: "/football",
      accent: "amber",
      defaultVoice: "Thiện Minh",
      defaultProjectTitle: "Bản tin bóng đá",
      presets,
      defaultPresetId: FOOTBALL_DEMO_PRESETS.el_clasico.project.id,
      extractMediaClips: extractFootballMediaClips,
      mediaPool: {
        titlePlaceholder: "VD: Barca 1-2 Real — Mbappé lập cú đúp",
        scriptPlaceholder: "Nhập kịch bản bản tin (diễn biến trận, bàn thắng, nhận định)…",
      },
      frameAspectRatio: aspect,
      showCropFrameByDefault: true,
      bgm: { url: config.bgmUrl ?? `${MEDIA_BASE}/football-assets/bgm.mp3`, volume: config.bgmVolume ?? 0.14 },
      renderPlayer: ({ ref, project, mix }) => (
        <FootballPlayer ref={ref} project={project} config={config} mix={mix} />
      ),
      headerExtras: (
        <div
          role="radiogroup"
          aria-label="Khung hình B-Roll"
          className="hidden xl:flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5"
        >
          {ASPECT_OPTIONS.map((opt) => (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={aspect === opt.value}
                  onClick={() => {
                    setConfig((c) => ({ ...c, mediaAspectRatio: opt.value }));
                    toast.info(`Đã chuyển khung B-Roll sang ${opt.label}`);
                  }}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                    aspect === opt.value
                      ? "bg-primary/15 text-primary-text font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {opt.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Khung hình B-Roll {opt.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      ),
      inspectorProps: {
        broadcastConfig: config,
        onBroadcastChange: setConfig,
        onThemeChange: updateTheme,
      },
      deliver: (project, mix, voice) => {
        const isVtv = config.templateId === "vtv_news_template";
        return {
          compositionId: isVtv ? "VtvNewsTemplate" : "FootballShortVideo",
          inputProps: {
            audioUrl: project.audioUrl,
            durationMs: Math.max(project.durationMs, 1000),
            words: project.words ?? [],
            scenes: project.scenes ?? [],
            config: mix ? { ...config, bgmVolume: mix.bgm } : config,
            voiceVolume: mix ? mix.voice : 1,
          },
          defaultTitle: `${config.headlines.join(" ")} #Shorts`,
          summary: (
            <>
              Dự án: <strong className="text-zinc-200">{project.title}</strong> • Khung B-Roll:{" "}
              <strong className="text-primary-text">{aspect}</strong>
            </>
          ),
          specs: [
            ["Template", isVtv ? "VTV News Reel" : "Bản tin đồ hoạ"],
            ["Độ phân giải", "1080 × 1920 (9:16)"],
            ["Khung B-Roll", aspect],
            [
              "Tổng thời lượng",
              `${(project.durationMs / 1000).toFixed(1)}s (${msToFrames(project.durationMs)} frames)`,
            ],
            ["Số phân cảnh", `${project.scenes.length} cảnh`],
            ["Giọng đọc", voice],
          ],
          configJson: {
            durationInFrames: msToFrames(Math.max(project.durationMs, 1000)),
            fps: 30,
            backgroundColor: config.backgroundColor,
            mediaAspectRatio: config.mediaAspectRatio,
            dateText: config.dateText,
            categoryText: config.categoryText,
            categoryColor: config.categoryColor,
            headlines: config.headlines,
            tickerText: config.tickerText,
            audioSrc: project.audioUrl,
            mediaClips: project.scenes.map((sc, idx) => ({
              sceneIndex: sc.sceneIndex,
              src: sc.imageUrl,
              startFrame: msToFrames(sc.startMs),
              durationInFrames: Math.max(15, msToFrames(sc.endMs - sc.startMs)),
              motion: sc.cameraEffect,
              transition: idx === 0 ? "none" : sc.transition,
            })),
          },
        };
      },
    }),
    [config, aspect, presets, updateTheme]
  );
}
