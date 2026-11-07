import React from "react";
import type { FootballVideoProps } from "@storytoon/shared-types";
import { VtvNewsTemplate } from "./vtv-news-template/VtvNewsTemplate";
import type { HeadlineLine, MediaClip, SubtitleCaption } from "./vtv-news-template/types";
import { FPS, msToFrames } from "./constants";

/** Parses #crop=X,Y,Zoom,Trim parameters from media URLs. */
function parseMediaCrop(url?: string | null) {
  if (!url) {
    return {
      cleanUrl: "",
      cropX: 50,
      cropY: 50,
      cropZoom: 1,
      trimStartSec: 0,
      isVideo: false,
    };
  }
  const [clean, hash] = url.split("#crop=");
  let cropX = 50;
  let cropY = 50;
  let cropZoom = 1;
  let trimStartSec = 0;

  if (hash) {
    const parts = hash.split("&")[0].split(",");
    if (parts.length >= 2) {
      cropX = parseFloat(parts[0]) || 50;
      cropY = parseFloat(parts[1]) || 50;
    }
    if (parts.length >= 3) {
      cropZoom = parseFloat(parts[2]) || 1;
    }
    if (parts.length >= 4) {
      trimStartSec = parseFloat(parts[3]) || 0;
    }
  }

  const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(clean);
  return { cleanUrl: clean, cropX, cropY, cropZoom, trimStartSec, isVideo };
}

/** Converts raw headline strings into styled HeadlineLines with color segments. */
function parseHeadlinesToLines(headlines: string[], categoryText?: string): HeadlineLine[] {
  if (!headlines || headlines.length === 0) {
    return [
      {
        segments: [
          { text: categoryText ? categoryText.toUpperCase() : "BẢN TIN BÓNG ĐÁ:", color: "yellow" },
        ],
      },
      {
        segments: [
          { text: "ĐIỂM TIN NÓNG NHẤT ", color: "white" },
          { text: "HÔM NAY", color: "red" },
        ],
      },
    ];
  }

  return headlines.map((line, idx) => {
    // If the line has colon, split into category/subject and highlight
    if (line.includes(":")) {
      const parts = line.split(":");
      return {
        segments: [
          { text: `${parts[0].trim()}: `, color: idx === 0 ? "yellow" : "cyan" },
          { text: parts.slice(1).join(":").trim(), color: idx === 0 ? "white" : "yellow" },
        ],
      };
    }

    // Default colorful segments
    if (idx === 0) {
      return {
        segments: [{ text: line.toUpperCase(), color: "yellow" }],
      };
    } else if (idx === 1) {
      const words = line.split(" ");
      if (words.length > 3) {
        const mid = Math.ceil(words.length / 2);
        return {
          segments: [
            { text: words.slice(0, mid).join(" ") + " ", color: "white" },
            { text: words.slice(mid).join(" "), color: "red" },
          ],
        };
      }
      return {
        segments: [{ text: line.toUpperCase(), color: "red" }],
      };
    }

    return {
      segments: [{ text: line.toUpperCase(), color: "white" }],
    };
  });
}

/**
 * VtvNewsVideo - Remotion composition wrapper for the Liquid Glass News Reel template.
 * Conforms to the standard FootballVideoProps so it can be swapped with FootballShortVideo.
 */
export const VtvNewsVideo: React.FC<FootballVideoProps> = ({
  audioUrl,
  durationMs,
  words,
  scenes,
  config,
  voiceVolume = 1,
}) => {
  // 1. Map scenes to MediaClip[]
  const mediaClips: MediaClip[] = scenes.map((sc, idx) => {
    const fromFrame = msToFrames(sc.startMs);
    const toFrame = msToFrames(sc.endMs);
    const dur = Math.max(15, toFrame - fromFrame);
    const parsed = parseMediaCrop(sc.imageUrl);

    let motion: MediaClip["motion"] = "zoom-in";
    if (sc.cameraEffect === "zoom_out") motion = "zoom-out";
    else if (sc.cameraEffect === "pan_left") motion = "pan-left";
    else if (sc.cameraEffect === "pan_right") motion = "pan-right";
    else if (sc.cameraEffect === "static") motion = "none";

    let transition: MediaClip["transition"] = "slide";
    if (sc.transition === "fade") transition = "fade";
    else if (sc.transition === "wipe") transition = "wipe";
    else if (sc.transition === "flip") transition = "flip";

    return {
      scene: sc,
      type: parsed.isVideo ? "video" : "image",
      src: parsed.cleanUrl || "/storage/football-assets/nguoi_da_bong_logo.png",
      startFrame: fromFrame,
      durationInFrames: dur,
      credit: sc.setting || undefined,
      motion,
      transition,
      scale: 1.05 * (parsed.cropZoom || 1),
    };
  });

  // 2. Map words to SubtitleCaption[]
  const captions: SubtitleCaption[] =
    config.showCaptions !== false
      ? (words || []).map((w) => ({
          fromFrame: msToFrames(w.startMs),
          durationInFrames: Math.max(1, msToFrames(w.endMs - w.startMs)),
          text: w.text,
        }))
      : [];

  // 3. Map headlines
  const headlines = parseHeadlinesToLines(config.headlines || [], config.categoryText);

  // 4. Map hashtags
  const hashtags = config.hashtags?.length
    ? config.hashtags
    : config.categoryText
      ? [config.categoryText.replace(":", "").trim()]
      : ["NGƯỜI ĐÁ BÓNG"];

  const normalizeMediaUrl = (url?: string | null, fallback = "") => {
    if (!url) return fallback;
    if (url.startsWith("/storage/")) {
      return url.replace("/storage/", "/media/");
    }
    return url;
  };

  const bgVideo =
    config.backgroundVideoUrl === "none"
      ? ""
      : normalizeMediaUrl(
          config.backgroundVideoUrl,
          "/media/football-assets/bg_loop.mp4"
        );
  const watermarkUrl = normalizeMediaUrl(
    config.watermarkLogoUrl,
    "/media/football-assets/nguoi_da_bong_logo.png"
  );
  const bgmUrl = normalizeMediaUrl(
    config.bgmUrl,
    "/media/football-assets/bgm.mp3"
  );

  return (
    <VtvNewsTemplate
      audioSrc={audioUrl || undefined}
      audioVolume={voiceVolume}
      bgmSrc={bgmUrl}
      bgmVolume={config.bgmVolume ?? 0.16}
      backgroundVideoUrl={bgVideo}
      backgroundVideoOpacity={config.backgroundVideoOpacity ?? 1.0}
      cardStyle={config.cardStyle || "liquid_glass"}
      hashtags={hashtags}
      headlines={headlines}
      mediaClips={mediaClips}
      captions={captions}
      watermarkLogoUrl={watermarkUrl}
      watermarkOpacity={0.14}
      mediaAspectRatio={config.mediaAspectRatio === "1:1" ? "1:1" : "16:9"}
    />
  );
};
