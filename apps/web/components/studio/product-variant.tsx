"use client";

import { useMemo } from "react";
import { msToFrames } from "@storytoon/video-engine";
import { ProductPlayer } from "@/components/ProductPlayer";
import { MEDIA_BASE, PRODUCT_DEMO_PRESETS, extractProductMediaClips } from "./product-data";
import type { StudioPreset, StudioVariant } from "./types";

const BGM_URL = `${MEDIA_BASE}/football-assets/bgm.mp3`;
const BGM_VOLUME = 0.12;

const PRESET_LABELS: [id: string, label: string][] = [
  ["demo-product-shopee-trashcan", "[Mới] Thùng rác Shopee đạp chân có nút nhấn (31s)"],
  ["demo-product-trashcan", "[Mẫu] Thùng rác cánh bướm 2 ngăn (26s)"],
  ["demo-product-anc-headphone", "[Mẫu] Tai nghe chống ồn ANC (32s)"],
  ["demo-product-coffee-maker", "[Mẫu] Máy pha cà phê Espresso (28s)"],
];

const PRESETS: StudioPreset[] = [
  // A real DB project that is shown with curated demo data; loadable by id, not listed.
  {
    id: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
    label: PRODUCT_DEMO_PRESETS["55ff74ba-60bd-4106-8bbf-e5e47a86445e"].title,
    project: PRODUCT_DEMO_PRESETS["55ff74ba-60bd-4106-8bbf-e5e47a86445e"].project,
    hidden: true,
  },
  ...PRESET_LABELS.map(([id, label]) => ({ id, label, project: PRODUCT_DEMO_PRESETS[id].project })),
];

/** Product commercial (9:16 full-screen) studio. */
export function useProductVariant(): StudioVariant {
  return useMemo<StudioVariant>(
    () => ({
      kind: "product",
      path: "/product",
      accent: "emerald",
      defaultVoice: "Duyên Hà My",
      defaultProjectTitle: "Video giới thiệu sản phẩm",
      presets: PRESETS,
      defaultPresetId: "demo-product-shopee-trashcan",
      extractMediaClips: extractProductMediaClips,
      mediaPool: {
        titlePlaceholder: "VD: Review thùng rác thông minh đạp chân 2026",
        scriptPlaceholder:
          "Nhập kịch bản giới thiệu sản phẩm (Hook 3s → Tính năng nổi bật → Ưu đãi / CTA)…",
      },
      frameAspectRatio: "3:4",
      showCropFrameByDefault: false,
      bgm: { url: BGM_URL, volume: BGM_VOLUME },
      renderPlayer: ({ ref, project, mix }) => (
        <ProductPlayer ref={ref} project={project} bgmUrl={BGM_URL} bgmVolume={BGM_VOLUME} mix={mix} />
      ),
      deliver: (project, mix, voice) => ({
        compositionId: "ProductCommercialVideo",
        inputProps: {
          audioUrl: project.audioUrl,
          durationMs: Math.max(project.durationMs, 1000),
          aspectRatio: "9:16",
          words: project.words ?? [],
          scenes: project.scenes ?? [],
          bgmUrl: BGM_URL,
          bgmVolume: mix ? mix.bgm : BGM_VOLUME,
          voiceVolume: mix ? mix.voice : 1,
        },
        defaultTitle: `${project.title} #Shorts #Review`,
        summary: (
          <>
            Dự án: <strong className="text-zinc-200">{project.title}</strong> • 9:16 toàn màn hình
          </>
        ),
        specs: [
          ["Độ phân giải", "1080 × 1920 (9:16)"],
          ["Tốc độ khung hình", "30 FPS"],
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
          aspectRatio: "9:16",
          audioSrc: project.audioUrl,
          scenes: project.scenes.map((sc, idx) => ({
            sceneIndex: sc.sceneIndex,
            src: sc.imageUrl,
            startFrame: msToFrames(sc.startMs),
            durationInFrames: Math.max(15, msToFrames(sc.endMs - sc.startMs)),
            motion: sc.cameraEffect,
            transition: idx === 0 ? "none" : sc.transition,
            transcriptText: sc.transcriptText,
            imagePrompt: sc.imagePrompt,
          })),
        },
      }),
    }),
    []
  );
}
