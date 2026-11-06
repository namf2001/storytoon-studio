import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { parseMediaCrop, type Scene } from "@storytoon/shared-types";
import { ProductCallout } from "./ProductCallout";

const TRANSITION_FRAMES = 10;

/** Renders one scene image or video with camera motion, crop region, and enter transition. */
export const SceneLayer: React.FC<{ scene: Scene; durationInFrames: number }> = ({
  scene,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  const media = parseMediaCrop(scene.imageUrl);

  // Auto-fit video speed calculation:
  // If autoFitSpeed is enabled, calculate speed multiplier = usableSourceDuration / sceneDuration
  const isAutoFit = scene.autoFitSpeed ?? media.autoFitSpeed ?? false;
  const sourceDurationSec =
    scene.sourceDurationSec ??
    media.sourceDurationSec ??
    (media.cleanUrl.includes("raw_") ? 7.98 : undefined);
  const sceneDurationSec = durationInFrames / fps;

  let calculatedPlaybackRate = scene.playbackRate ?? media.playbackRate ?? 1.0;
  if (isAutoFit && sourceDurationSec && sourceDurationSec > 0 && sceneDurationSec > 0) {
    const usableSourceDur = Math.max(0.1, sourceDurationSec - (media.trimStartSec || 0));
    calculatedPlaybackRate = Math.min(
      5.0,
      Math.max(0.2, Number((usableSourceDur / sceneDurationSec).toFixed(3)))
    );
  }

  let scale = 1.04;
  let tx = 0;
  let ty = 0;
  switch (scene.cameraEffect) {
    case "zoom_in": scale = 1 + 0.12 * p; break;
    case "zoom_out": scale = 1.12 - 0.12 * p; break;
    case "pan_left": scale = 1.12; tx = interpolate(p, [0, 1], [0.04, -0.04]) * width; break;
    case "pan_right": scale = 1.12; tx = interpolate(p, [0, 1], [-0.04, 0.04]) * width; break;
    case "shake":
      scale = 1.06;
      tx = Math.sin(frame * 1.7) * 6;
      ty = Math.cos(frame * 2.3) * 6;
      break;
    case "static":
      scale = 1.0;
      break;
  }

  const finalScale = scale * media.cropZoom;
  const objPos = `${media.cropX}% ${media.cropY}%`;

  let opacity = 1;
  let slideX = 0;
  let rotateY = 0;
  let clipPath = "none";
  if (scene.transition === "fade") {
    opacity = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  } else if (scene.transition === "slide") {
    slideX = interpolate(frame, [0, TRANSITION_FRAMES], [width, 0], { extrapolateRight: "clamp" });
  } else if (scene.transition === "wipe") {
    const wipePct = interpolate(frame, [0, TRANSITION_FRAMES], [100, 0], { extrapolateRight: "clamp" });
    clipPath = `inset(0 ${wipePct}% 0 0)`;
  } else if (scene.transition === "flip") {
    rotateY = interpolate(frame, [0, TRANSITION_FRAMES], [90, 0], { extrapolateRight: "clamp" });
    opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  }

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: objPos,
    transformOrigin: objPos,
    transform: `translate(${tx}px, ${ty}px) scale(${finalScale})`,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111",
        opacity,
        clipPath,
        transform: `perspective(1200px) translateX(${slideX}px) rotateY(${rotateY}deg)`,
        overflow: "hidden",
      }}
    >
      {media.cleanUrl ? (
        media.isVideo ? (
          <OffthreadVideo
            src={media.cleanUrl}
            startFrom={Math.round(media.trimStartSec * fps)}
            playbackRate={calculatedPlaybackRate}
            muted
            style={mediaStyle}
            onError={(e) => console.warn("Video playback warning:", e)}
          />
        ) : (
          <Img src={media.cleanUrl} style={mediaStyle} />
        )
      ) : (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", color: "#777", fontSize: 40, padding: 80, textAlign: "center", fontFamily: "sans-serif" }}>
          Scene {scene.sceneIndex} — chưa có media
          <div style={{ fontSize: 24, marginTop: 20, color: "#555" }}>{scene.setting}</div>
        </AbsoluteFill>
      )}
      {/* Product Feature Callout Title (Theo font & style mẫu 2 dòng) */}
      <ProductCallout
        tag={scene.calloutTag}
        text={scene.calloutText}
        position={scene.calloutPosition}
        theme={scene.calloutTheme}
        durationInFrames={durationInFrames}
      />
    </AbsoluteFill>
  );
};
