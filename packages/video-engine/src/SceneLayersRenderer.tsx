import React from "react";
import {
  interpolate,
  OffthreadVideo,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import {
  parseMediaCrop,
  type CameraEffect,
  type ImageLayer,
  type MediaLayer,
  type Scene,
  type SceneLayer,
  type TextLayer,
} from "@storytoon/shared-types";

const { fontFamily: beVietnamFont } = loadBeVietnamPro("normal", {
  weights: ["600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
});

const fontStack = `${beVietnamFont}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

const normalizeMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  let clean = url;
  if (clean.startsWith("/storage/")) {
    clean = clean.replace("/storage/", "/media/");
  }
  return clean;
};

/** Compute Ken Burns transformation values for a given motion effect and duration */
function computeKenBurns(
  effect: CameraEffect | undefined,
  frame: number,
  durationFrames: number,
  baseScale: number
) {
  const dur = Math.max(durationFrames, 15);
  let scale = 1.04;
  let tx = 0;
  let ty = 0;

  switch (effect) {
    case "zoom_in":
      scale = interpolate(frame, [0, dur], [1.0, 1.12], { extrapolateRight: "clamp" });
      break;
    case "zoom_out":
      scale = interpolate(frame, [0, dur], [1.12, 1.0], { extrapolateRight: "clamp" });
      break;
    case "pan_left":
      tx = interpolate(frame, [0, dur], [28, -28], { extrapolateRight: "clamp" });
      scale = 1.06;
      break;
    case "pan_right":
      tx = interpolate(frame, [0, dur], [-28, 28], { extrapolateRight: "clamp" });
      scale = 1.06;
      break;
    case "shake":
      tx = Math.sin(frame * 1.1) * 6;
      ty = Math.cos(frame * 1.4) * 5;
      scale = 1.06;
      break;
    case "static":
    default:
      scale = 1.0;
      break;
  }

  return {
    scale: scale * baseScale,
    tx,
    ty,
  };
}

/** Render a single media layer (Background or Picture-in-Picture) */
export const SingleLayerMedia: React.FC<{
  layer: MediaLayer;
  frame: number;
  durationFrames: number;
  isBackground?: boolean;
}> = ({ layer, frame, durationFrames, isBackground = true }) => {
  const rawUrl = normalizeMediaUrl(layer.mediaUrl);
  const parsed = parseMediaCrop(rawUrl);
  const cleanUrl = parsed.cleanUrl;
  const isVideo = layer.mediaType === "video" || parsed.isVideo || cleanUrl.match(/\.(mp4|webm|mov)$/i);

  const cropX = layer.cropX ?? parsed.cropX;
  const cropY = layer.cropY ?? parsed.cropY;
  const cropZoom = layer.cropZoom ?? parsed.cropZoom;
  const trimSec = layer.trimStartSec ?? parsed.trimStartSec;

  const isAutoFit = layer.autoFitSpeed ?? parsed.autoFitSpeed ?? false;
  const sourceDurationSec =
    layer.sourceDurationSec ??
    parsed.sourceDurationSec ??
    (cleanUrl.includes("raw_") ? 7.98 : undefined);
  let playbackRate = layer.playbackRate ?? parsed.playbackRate ?? 1.0;
  if (isAutoFit && sourceDurationSec && sourceDurationSec > 0 && durationFrames > 0) {
    const sceneDurSec = durationFrames / 30;
    const usableSourceDur = Math.max(0.1, sourceDurationSec - (trimSec || 0));
    playbackRate = Math.min(
      5.0,
      Math.max(0.2, Number((usableSourceDur / sceneDurSec).toFixed(3)))
    );
  }

  const motion = layer.motion || "zoom_in";
  const { scale, tx, ty } = computeKenBurns(motion, frame, durationFrames, cropZoom);
  const objPos = `${cropX}% ${cropY}%`;

  const containerStyle: React.CSSProperties = isBackground
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        opacity: layer.opacity ?? 1,
      }
    : {
        position: "absolute",
        left: `${layer.position?.x ?? 50}%`,
        top: `${layer.position?.y ?? 50}%`,
        width: layer.size?.width ? `${layer.size.width}%` : "60%",
        height: layer.size?.height ? `${layer.size.height}%` : "auto",
        aspectRatio: "16/9",
        transform: "translate(-50%, -50%)",
        borderRadius: layer.borderRadius ?? 12,
        border: layer.border ? `${layer.border.width}px solid ${layer.border.color}` : undefined,
        boxShadow: layer.shadow ? "0 16px 36px rgba(0,0,0,0.6)" : undefined,
        overflow: "hidden",
        opacity: layer.opacity ?? 1,
      };

  if (!cleanUrl) {
    return (
      <div
        style={{
          ...containerStyle,
          background: "linear-gradient(135deg, #090e17 0%, #1e293b 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {isVideo ? (
        <OffthreadVideo
          src={cleanUrl}
          startFrom={Math.round(trimSec * 30)}
          playbackRate={playbackRate}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.fit || "cover",
            objectPosition: objPos,
            transformOrigin: objPos,
            transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          }}
        />
      ) : (
        <img
          src={cleanUrl}
          alt={layer.name || "Media"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.fit || "cover",
            objectPosition: objPos,
            transformOrigin: objPos,
            transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          }}
        />
      )}
    </div>
  );
};

/** Render an image overlay (Player Cutout, Badge, Sticker, Photo Card) */
export const SingleLayerImage: React.FC<{
  layer: ImageLayer;
  frame: number;
  fps: number;
}> = ({ layer, frame, fps }) => {
  const startOffsetMs = layer.startOffsetMs ?? 0;
  const startFrame = Math.round((startOffsetMs / 1000) * fps);
  const relFrame = Math.max(0, frame - startFrame);

  if (frame < startFrame) {
    return null;
  }

  let animTransform = "";
  let animOpacity = layer.opacity ?? 1;

  const anim = layer.animation || "pop_in";
  if (anim === "pop_in") {
    const spr = spring({
      frame: relFrame,
      fps,
      config: { damping: 11, stiffness: 120, mass: 0.8 },
    });
    animTransform = `scale(${spr})`;
    animOpacity = interpolate(relFrame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "slide_up") {
    const yOff = interpolate(relFrame, [0, 10], [120, 0], { extrapolateRight: "clamp" });
    animTransform = `translateY(${yOff}px)`;
    animOpacity = interpolate(relFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "slide_left") {
    const xOff = interpolate(relFrame, [0, 10], [140, 0], { extrapolateRight: "clamp" });
    animTransform = `translateX(${xOff}px)`;
    animOpacity = interpolate(relFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "slide_right") {
    const xOff = interpolate(relFrame, [0, 10], [-140, 0], { extrapolateRight: "clamp" });
    animTransform = `translateX(${xOff}px)`;
    animOpacity = interpolate(relFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "fade_in") {
    animOpacity = interpolate(relFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "float") {
    const floatY = Math.sin(relFrame * 0.08) * 8;
    animTransform = `translateY(${floatY}px)`;
  }

  const rawUrl = normalizeMediaUrl(layer.imageUrl);
  const posX = layer.position?.x ?? 50;
  const posY = layer.position?.y ?? 50;
  const widthPct = layer.size?.width ?? 40;
  const rotation = layer.rotation ?? 0;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        width: `${widthPct}%`,
        height: layer.size?.height ? `${layer.size.height}%` : "auto",
        transform: `translate(-50%, -50%) rotate(${rotation}deg) ${animTransform}`,
        opacity: animOpacity,
        zIndex: 20,
        pointerEvents: "none",
        filter: layer.shadow
          ? "drop-shadow(0 14px 28px rgba(0,0,0,0.65))"
          : undefined,
      }}
    >
      <img
        src={rawUrl}
        alt={layer.name || "Overlay Image"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          borderRadius: layer.borderRadius ?? 0,
          border: layer.border
            ? `${layer.border.width}px solid ${layer.border.color}`
            : undefined,
        }}
      />
    </div>
  );
};

/** Render a text callout, breaking news badge, stat box, or quote card */
export const SingleLayerText: React.FC<{
  layer: TextLayer;
  frame: number;
  fps: number;
}> = ({ layer, frame, fps }) => {
  const startOffsetMs = layer.startOffsetMs ?? 0;
  const startFrame = Math.round((startOffsetMs / 1000) * fps);
  const relFrame = Math.max(0, frame - startFrame);

  if (frame < startFrame) {
    return null;
  }

  let animTransform = "";
  let animOpacity = 1;

  const anim = layer.animation || "slide_up";
  if (anim === "pop_in" || anim === "scale_spring") {
    const spr = spring({
      frame: relFrame,
      fps,
      config: { damping: 10, stiffness: 140, mass: 0.7 },
    });
    animTransform = `scale(${spr})`;
    animOpacity = interpolate(relFrame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "slide_up") {
    const yOff = interpolate(relFrame, [0, 8], [60, 0], { extrapolateRight: "clamp" });
    animTransform = `translateY(${yOff}px)`;
    animOpacity = interpolate(relFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "slide_down") {
    const yOff = interpolate(relFrame, [0, 8], [-60, 0], { extrapolateRight: "clamp" });
    animTransform = `translateY(${yOff}px)`;
    animOpacity = interpolate(relFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  } else if (anim === "fade_in") {
    animOpacity = interpolate(relFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  }

  const posX = layer.position?.x ?? 50;
  const posY = layer.position?.y ?? 80;
  const preset = layer.stylePreset || "headline_box";

  const textColor = layer.color || "#FFFFFF";
  const fontSize = layer.fontSize || 34;

  let cardStyle: React.CSSProperties = {
    fontFamily: fontStack,
    color: textColor,
    textAlign: layer.textAlign || "center",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxWidth: layer.size?.maxWidth ? `${layer.size.maxWidth}px` : "90%",
  };

  if (preset === "headline_box") {
    cardStyle = {
      ...cardStyle,
      backgroundColor: layer.backgroundColor || "rgba(10, 20, 40, 0.92)",
      border: "2px solid rgba(255, 255, 255, 0.28)",
      borderRadius: 16,
      padding: "10px 24px",
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.65)",
    };
  } else if (preset === "neon_tag") {
    cardStyle = {
      ...cardStyle,
      backgroundColor: "rgba(0, 0, 0, 0.88)",
      border: "2px solid #00E5FF",
      borderRadius: 30,
      padding: "8px 22px",
      boxShadow: "0 0 20px rgba(0, 229, 255, 0.45)",
    };
  } else if (preset === "quote_card") {
    cardStyle = {
      ...cardStyle,
      backgroundColor: "rgba(15, 23, 42, 0.94)",
      borderLeft: "6px solid #FFD600",
      borderRadius: "0 14px 14px 0",
      padding: "12px 24px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.6)",
      fontStyle: "italic",
    };
  } else if (preset === "stat_badge") {
    cardStyle = {
      ...cardStyle,
      backgroundColor: "rgba(186, 12, 47, 0.92)",
      borderRadius: 14,
      padding: "8px 20px",
      border: "1.5px solid rgba(255, 214, 0, 0.6)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
      textTransform: "uppercase",
      letterSpacing: 1,
    };
  } else if (preset === "simple") {
    cardStyle = {
      ...cardStyle,
      textShadow: "0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)",
    };
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) ${animTransform}`,
        opacity: animOpacity,
        zIndex: 25,
        pointerEvents: "none",
        width: layer.size?.width ? `${layer.size.width}%` : "auto",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            fontSize,
            fontWeight: layer.fontWeight === "extra_bold" ? 800 : layer.fontWeight === "black" ? 900 : 700,
            lineHeight: 1.25,
          }}
        >
          {layer.text}
        </div>
        {layer.subtitle && (
          <div
            style={{
              fontSize: Math.round(fontSize * 0.65),
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.85)",
              letterSpacing: 0.3,
            }}
          >
            {layer.subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

/** Render a Split Side-by-Side comparison scene */
export const SplitCompareScene: React.FC<{
  scene: Scene;
  frame: number;
  durationFrames: number;
  fps: number;
}> = ({ scene, frame, durationFrames, fps }) => {
  const mediaLayers = (scene.layers || []).filter(
    (l): l is MediaLayer => l.type === "media"
  );
  const leftLayer = mediaLayers[0];
  const rightLayer = mediaLayers[1];

  const leftUrl = normalizeMediaUrl(leftLayer?.mediaUrl || scene.imageUrl);
  const rightUrl = normalizeMediaUrl(rightLayer?.mediaUrl || scene.imageUrl);

  const leftParsed = parseMediaCrop(leftUrl);
  const rightParsed = parseMediaCrop(rightUrl);

  const textOverlays = (scene.layers || []).filter(
    (l): l is TextLayer => l.type === "text"
  );

  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "flex" }}>
      {/* Left Half */}
      <div style={{ width: "50%", height: "100%", position: "relative", overflow: "hidden", borderRight: "3px solid #FFD600" }}>
        {leftParsed.isVideo ? (
          <OffthreadVideo
            src={leftParsed.cleanUrl}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${leftParsed.cropX}% ${leftParsed.cropY}%` }}
          />
        ) : (
          <img
            src={leftParsed.cleanUrl}
            alt="Left"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${leftParsed.cropX}% ${leftParsed.cropY}%` }}
          />
        )}
      </div>

      {/* Right Half */}
      <div style={{ width: "50%", height: "100%", position: "relative", overflow: "hidden" }}>
        {rightParsed.isVideo ? (
          <OffthreadVideo
            src={rightParsed.cleanUrl}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${rightParsed.cropX}% ${rightParsed.cropY}%` }}
          />
        ) : (
          <img
            src={rightParsed.cleanUrl}
            alt="Right"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${rightParsed.cropX}% ${rightParsed.cropY}%` }}
          />
        )}
      </div>

      {/* Center VS Badge */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 58,
          height: 58,
          borderRadius: "50%",
          backgroundColor: "#FFD600",
          color: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontStack,
          fontSize: 24,
          fontWeight: 900,
          boxShadow: "0 0 24px rgba(255, 214, 0, 0.7), 0 8px 16px rgba(0,0,0,0.6)",
          zIndex: 30,
          border: "3px solid #000000",
        }}
      >
        VS
      </div>

      {/* Text Overlays */}
      {textOverlays.map((l) => (
        <SingleLayerText key={l.id} layer={l} frame={frame} fps={fps} />
      ))}
    </div>
  );
};

/**
 * Main Scene Layers Renderer:
 * Coordinates all layers (Media Background, Overlay Images, Stickers, Text Callouts).
 * Automatically falls back to standard single-media if no layers exist.
 */
export const SceneLayersRenderer: React.FC<{
  scene: Scene;
  durationFrames: number;
  flashOnTransition?: boolean;
  isFirst?: boolean;
}> = ({ scene, durationFrames, flashOnTransition = false, isFirst = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity =
    !isFirst && flashOnTransition
      ? interpolate(frame, [0, 6], [0.85, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // Split Compare Layout
  if (scene.layoutType === "split_compare") {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
        <SplitCompareScene
          scene={scene}
          frame={frame}
          durationFrames={durationFrames}
          fps={fps}
        />
        {flashOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#FFFFFF",
              opacity: flashOpacity,
              pointerEvents: "none",
              zIndex: 50,
            }}
          />
        )}
      </div>
    );
  }

  // Multi-layer composition
  const layers = (scene.layers && scene.layers.length > 0)
    ? scene.layers.filter((l) => l.visible !== false)
    : ([
        {
          id: `media-default-${scene.id}`,
          type: "media",
          mediaUrl: scene.imageUrl || "",
          motion: scene.cameraEffect,
        } as MediaLayer,
      ]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {layers.map((layer, idx) => {
        if (layer.type === "media") {
          return (
            <SingleLayerMedia
              key={layer.id || `media-${idx}`}
              layer={layer}
              frame={frame}
              durationFrames={durationFrames}
              isBackground={idx === 0}
            />
          );
        }
        if (layer.type === "image") {
          return (
            <SingleLayerImage
              key={layer.id || `img-${idx}`}
              layer={layer}
              frame={frame}
              fps={fps}
            />
          );
        }
        if (layer.type === "text") {
          return (
            <SingleLayerText
              key={layer.id || `text-${idx}`}
              layer={layer}
              frame={frame}
              fps={fps}
            />
          );
        }
        return null;
      })}

      {flashOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#FFFFFF",
            opacity: flashOpacity,
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      )}
    </div>
  );
};
