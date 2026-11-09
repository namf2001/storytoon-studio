import React, { useEffect } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { VtvNewsTemplateProps } from "./types";
import { BackgroundFrame } from "./BackgroundFrame";
import { MediaWindow } from "./MediaWindow";
import { HeadlineSection } from "./HeadlineSection";
import { loadFont } from "../load-font";

/**
 * VtvNewsTemplate - Template Video Short Thể thao / Tin tức phong cách Editorial & Broadcast
 * Phân chia theo 5 Layer rõ ràng:
 * 1. BackgroundLayer: Video nền động loop (Pinterest) & Liquid Glass Outer Frame
 * 2. MediaLayer: Khung phát hình ảnh / video B-Roll (16:9 hoặc 1:1) + Branding Badges
 * 3. HeadlineLayer: Hashtags Cyan + Tiêu đề đa màu sắc (Vàng, Đỏ, Trắng)
 * 4. WatermarkLayer: Logo kênh Người Đá Bóng chìm góc dưới bên phải
 * 5. AudioLayer: Voiceover & Background Music
 */
const resolveUrl = (url?: string) => {
  if (!url) return "";
  let clean = url;
  if (clean.startsWith("/storage/")) {
    clean = clean.replace("/storage/", "/media/");
  }
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/")) {
    return clean;
  }
  if (clean.includes("sfx/")) {
    const filename = clean.split("/").pop();
    return `/media/football-assets/sfx/${filename}`;
  }
  try {
    return staticFile(clean);
  } catch {
    return clean;
  }
};

export const VtvNewsTemplate: React.FC<VtvNewsTemplateProps> = ({
  cardBgColor,
  cardBorderColor,
  cardStyle = "liquid_glass",
  tagColor,
  hashtags = ["NGƯỜI ĐÁ BÓNG"],
  headlines = [
    {
      segments: [{ text: "HÀNG TRĂM TRẺ SƠ SINH Ở PERU", color: "yellow" }],
    },
    {
      segments: [
        { text: "MANG TÊN ", color: "white" },
        { text: "ERLING HAALAND", color: "red" },
      ],
    },
    {
      segments: [
        { text: "TÊN CỦA THỦ MÔN ", color: "white" },
        { text: "VOZINHA", color: "yellow" },
      ],
    },
    {
      segments: [{ text: "ĐƯỢC ĐẶT CHO LOÀI SÊN BIỂN MỚI", color: "yellow" }],
    },
  ],
  mediaClips = [],
  captions,
  channelName,
  channelLogoUrl,
  sourceCredit,
  badgeTitle,
  badgeSubtitle,
  badgeLogoUrl,
  watermarkLogoUrl = "/storage/football-assets/nguoi_da_bong_logo.png",
  watermarkOpacity = 0.14,
  backgroundVideoUrl = "/storage/football-assets/bg_loop.mp4",
  backgroundVideoOpacity = 1.0,
  backgroundVideoLoopDuration,
  mediaAspectRatio = "16:9",
  mediaHeight,
  topHeaderHeight,
  audioSrc,
  audioVolume = 1,
  bgmSrc,
  bgmVolume = 0.15,
}) => {
  useEffect(() => {
    loadFont();
  }, []);

  const headerHeight =
    topHeaderHeight !== undefined
      ? topHeaderHeight
      : mediaAspectRatio === "1:1"
        ? 80
        : 140;

  return (
    <AbsoluteFill>
      {/* ─── LAYER 5: Audio, BGM & Sound Effects (SFX) ──────────────── */}
      {audioSrc && (
        <Audio
          src={resolveUrl(audioSrc)}
          volume={audioVolume}
        />
      )}
      {bgmSrc && (
        <Audio
          src={resolveUrl(bgmSrc)}
          volume={bgmVolume}
          loop
        />
      )}
      {/* Intro SFX (Opening Impact) */}
      <Sequence
        from={0}
        durationInFrames={45}
        style={{
          translate: "0px 37.3px",
        }}
      >
        <Audio src={resolveUrl("sfx/shared/whoosh_1.mp3")} volume={0.35} />
      </Sequence>
      <Sequence from={2} durationInFrames={30}>
        <Audio
          src={resolveUrl("sfx/shared/camera_shutter_1.mp3")}
          volume={0.25}
        />
      </Sequence>
      {/* Scene Transition SFX */}
      {mediaClips &&
        mediaClips.map((clip, index) => {
          if (index === 0) return null;
          const start = clip.startFrame || 0;
          const sfxType = index % 3;
          let sfxFile = "sfx/shared/whoosh_1.mp3";
          let vol = 0.35;

          if (sfxType === 1) {
            sfxFile = "sfx/shared/whoosh_2.mp3";
            vol = 0.35;
          } else if (sfxType === 2) {
            sfxFile = "sfx/shared/camera_shutter_1.mp3";
            vol = 0.3;
          }

          return (
            <Sequence key={`sfx-${index}`} from={start} durationInFrames={40}>
              <Audio src={resolveUrl(sfxFile)} volume={vol} />
            </Sequence>
          );
        })}
      {/* ─── LAYER 0 & 1: Dynamic Background & Floating Card Container ─ */}
      <BackgroundFrame
        backgroundVideoUrl={backgroundVideoUrl}
        backgroundVideoOpacity={backgroundVideoOpacity}
        backgroundVideoLoopDuration={backgroundVideoLoopDuration}
        cardBgColor={cardBgColor}
        cardBorderColor={cardBorderColor}
        cardStyle={cardStyle}
        topHeaderHeight={headerHeight}
      >
        {/* ─── LAYER 2: Media Window (Video / B-Roll / Badges) ───────── */}
        <MediaWindow
          mediaClips={mediaClips}
          channelName={channelName}
          channelLogoUrl={channelLogoUrl}
          sourceCredit={sourceCredit}
          badgeTitle={badgeTitle}
          badgeSubtitle={badgeSubtitle}
          badgeLogoUrl={badgeLogoUrl}
          mediaAspectRatio={mediaAspectRatio}
          mediaHeight={mediaHeight}
        />

        {/* ─── LAYER 3 & 4: Headline Text & Watermark Overlay ────────── */}
        <HeadlineSection
          hashtags={hashtags}
          headlines={headlines}
          captions={captions}
          watermarkLogoUrl={watermarkLogoUrl}
          watermarkOpacity={watermarkOpacity}
          tagColor={tagColor}
        />
      </BackgroundFrame>
    </AbsoluteFill>
  );
};
