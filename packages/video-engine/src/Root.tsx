import React from "react";
import { Composition, Folder } from "remotion";
import type { FootballVideoProps, StoryVideoProps } from "@storytoon/shared-types";
import { StoryVideo } from "./StoryVideo";
import { FootballShortVideo } from "./FootballShortVideo";
import { VtvNewsVideo } from "./VtvNewsVideo";
import { ProductCommercialVideo } from "./ProductCommercialVideo";
import { COMPOSITION_ID, FPS, dimensionsFor, msToFrames } from "./constants";

const defaultStoryProps: StoryVideoProps = {
  audioUrl: null,
  durationMs: 5000,
  aspectRatio: "16:9",
  words: [],
  scenes: [],
};

const defaultFootballProps: FootballVideoProps = {
  audioUrl: null,
  durationMs: 15000,
  words: [],
  scenes: [],
  config: {
    backgroundColor: "#0A1C3E",
    backgroundTheme: "navy",
    backgroundScrollSpeed: 0.35,
    mediaAspectRatio: "3:4",
    showFrameBorders: true,
    frameBorderColor: "#FFFFFF",
    showTicker: true,
    tickerText: "SIÊU KINH ĐIỂN LA LIGA",
    tickerSocialText: "f  |  yt  |  tiktok  |  @nguoidabong  |  NGƯỜI ĐÁ BÓNG",
    dateText: "26/10/2026",
    categoryText: "EL CLASICO:",
    categoryColor: "#FFD600",
    headlines: ["Barca 1 - 2 Real Madrid:", "Mbappé lập cú đúp nhấn chìm Camp Nou!"],
    headlineColor: "#FFFFFF",
    headlineFontSize: 42,
    watermarkLogoUrl: "",
    watermarkText: "NGƯỜI ĐÁ BÓNG",
    bgmUrl: "",
    bgmVolume: 0.14,
    enableTransitionSfx: true,
    sfxBaseUrl: "",
    enableFlashOnTransition: true,
    showCaptions: false,
    backgroundTileUrl: "",
  },
};

const defaultProductProps = {
  audioUrl: null,
  bgmUrl: null,
  bgmVolume: 0.12,
  durationMs: 35000,
  aspectRatio: "9:16" as const,
  words: [],
  scenes: [
    {
      id: "prod-scene-1",
      projectId: "smart-trashcan",
      sceneIndex: 1,
      startMs: 0,
      endMs: 6000,
      transcriptText: "Bạn chán ngấy những chiếc thùng rác vừa xấu, vừa bất tiện trong bếp?",
      setting: "Phòng bếp hiện đại",
      characters: [],
      imagePrompt: "Hero 45-degree angle white pedal trash can in luxury kitchen",
      imageUrl: "/product-trashcan/angle_3d_exterior.png",
      cameraEffect: "zoom_in" as const,
      transition: "fade" as const,
      showCaption: true,
    },
    {
      id: "prod-scene-2",
      projectId: "smart-trashcan",
      sceneIndex: 2,
      startMs: 6000,
      endMs: 13000,
      transcriptText: "Thiết kế nắp cánh bướm mở đôi siêu thông minh, đặt dưới gầm bàn vẫn mở thoải mái nha.",
      setting: "Cận cảnh nắp mở đôi",
      characters: [],
      imagePrompt: "Butterfly split lid open outward top-down perspective",
      imageUrl: "/product-trashcan/angle_top_pedal_open.png",
      cameraEffect: "zoom_out" as const,
      transition: "slide" as const,
      showCaption: true,
    },
    {
      id: "prod-scene-3",
      projectId: "smart-trashcan",
      sceneIndex: 3,
      startMs: 13000,
      endMs: 20000,
      transcriptText: "Bàn đạp trợ lực bằng inox cực êm, chỉ một chạm nhẹ là mở tức thì mà không lo bẩn tay.",
      setting: "Bàn đạp inox",
      characters: [],
      imagePrompt: "Macro close-up shot of the stainless steel foot pedal",
      imageUrl: "/product-trashcan/angle_3d_exterior.png",
      cameraEffect: "pan_right" as const,
      transition: "fade" as const,
      showCaption: true,
    },
    {
      id: "prod-scene-4",
      projectId: "smart-trashcan",
      sceneIndex: 4,
      startMs: 20000,
      endMs: 27000,
      transcriptText: "Bên trong có sẵn hai quai gài túi riêng biệt, phân loại rác tái chế và rác thường cực tiện lợi.",
      setting: "Lòng thùng 2 ngăn",
      characters: [],
      imagePrompt: "Overhead view of dual compartment trash bag handles",
      imageUrl: "/product-trashcan/angle_interior_compartments.png",
      cameraEffect: "zoom_in" as const,
      transition: "slide" as const,
      showCaption: true,
    },
    {
      id: "prod-scene-5",
      projectId: "smart-trashcan",
      sceneIndex: 5,
      startMs: 27000,
      endMs: 35000,
      transcriptText: "Màu trắng tinh tế, chuẩn gu nhà hiện đại. Nhấn ngay vào giỏ hàng bên dưới để rước em nó về nhé!",
      setting: "Toàn cảnh phòng khách",
      characters: [],
      imagePrompt: "Warm ambient modern living room with white trash bin",
      imageUrl: "/product-trashcan/angle_3d_exterior.png",
      cameraEffect: "static" as const,
      transition: "fade" as const,
      showCaption: true,
    },
  ],
};

/** Remotion root used by Studio and server-side rendering. */
export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Product-Commercials">
      <Composition
        id="ProductCommercialVideo"
        component={ProductCommercialVideo as any}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={1050}
        defaultProps={defaultProductProps as any}
        calculateMetadata={({ props }: any) => ({
          durationInFrames: Math.max(30, msToFrames(props?.durationMs || 35000)),
          width: 1080,
          height: 1920,
        })}
      />
    </Folder>

    <Folder name="Football-Shorts">
      <Composition
        id="FootballShortVideo"
        component={FootballShortVideo}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={450}
        defaultProps={defaultFootballProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(30, msToFrames(props.durationMs)),
          width: 1080,
          height: 1920,
        })}
      />
      <Composition
        id="VtvNewsTemplate"
        component={VtvNewsVideo}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={450}
        defaultProps={defaultFootballProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(30, msToFrames(props.durationMs)),
          width: 1080,
          height: 1920,
        })}
      />
    </Folder>

    <Folder name="Storytoon-2D">
      <Composition
        id={COMPOSITION_ID}
        component={StoryVideo}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={150}
        defaultProps={defaultStoryProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(30, msToFrames(props.durationMs)),
          ...dimensionsFor(props.aspectRatio),
        })}
      />
    </Folder>
  </>
);
