import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Loop,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { MediaClip } from "./types";
import { SceneLayersRenderer } from "../SceneLayersRenderer";
import { BeVietnamPro, OswaldFont } from "../load-font";

interface MediaWindowProps {
  mediaClips?: MediaClip[];
  channelName?: string;
  channelLogoUrl?: string;
  sourceCredit?: string;
  badgeTitle?: string;
  badgeSubtitle?: string;
  badgeLogoUrl?: string;
  showBadge?: boolean;
  mediaAspectRatio?: "1:1" | "16:9" | "custom";
  mediaHeight?: number;
}

const TRANSITION_DURATION = 15;

const getTransitionPresentation = (
  transitionType?: string,
  index: number = 0,
  width: number = 1080,
  height: number = 700,
) => {
  switch (transitionType) {
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: index % 2 === 0 ? "from-right" : "from-left" });
    case "wipe":
      return wipe({
        direction: index % 2 === 0 ? "from-left" : "from-top-left",
      });
    case "flip":
      return flip({
        direction: index % 2 === 0 ? "from-right" : "from-left",
        perspective: 1200,
      });
    case "clock-wipe":
      return clockWipe({ width, height });
    case "iris":
      return iris({ width, height });
    default: {
      const presentations = [
        slide({ direction: "from-right" }),
        fade(),
        wipe({ direction: "from-left" }),
        flip({ direction: "from-right", perspective: 1200 }),
        slide({ direction: "from-bottom" }),
        clockWipe({ width, height }),
        iris({ width, height }),
        slide({ direction: "from-left" }),
      ];
      return presentations[index % presentations.length];
    }
  }
};

const resolveUrl = (url?: string) => {
  if (!url) return "";
  let clean = url;
  if (clean.startsWith("/storage/")) {
    clean = clean.replace("/storage/", "/media/");
  }
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/")) {
    return clean;
  }
  try {
    return staticFile(clean);
  } catch {
    return clean;
  }
};

const DynamicMediaImage: React.FC<{
  clip: MediaClip;
  index: number;
  durationInFrames: number;
}> = ({ clip, index, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (clip.motion === "none") {
    return (
      <Img
        src={resolveUrl(clip.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: clip.objectFit || "cover",
          transform: clip.scale ? `scale(${clip.scale})` : undefined,
          scale: 0.977,
        }}
      />
    );
  }

  // Motion Presets (Ken Burns, Pan, Tilt, Floating)
  const motionType =
    clip.motion ||
    (["zoom-in", "pan-right", "zoom-out", "pan-left"][index % 4] as
      | "zoom-in"
      | "zoom-out"
      | "pan-left"
      | "pan-right"
      | "float");

  const baseScale = clip.scale || 1.05;
  let scaleVal = baseScale;
  let translateXVal = 0;
  let translateYVal = 0;

  if (motionType === "zoom-in") {
    scaleVal = interpolate(
      frame,
      [0, durationInFrames],
      [baseScale, baseScale * 1.12],
      {
        extrapolateRight: "clamp",
      },
    );
  } else if (motionType === "zoom-out") {
    scaleVal = interpolate(
      frame,
      [0, durationInFrames],
      [baseScale * 1.12, baseScale],
      {
        extrapolateRight: "clamp",
      },
    );
  } else if (motionType === "pan-right") {
    scaleVal = interpolate(
      frame,
      [0, durationInFrames],
      [baseScale * 1.04, baseScale * 1.1],
      {
        extrapolateRight: "clamp",
      },
    );
    translateXVal = interpolate(frame, [0, durationInFrames], [-22, 22], {
      extrapolateRight: "clamp",
    });
  } else if (motionType === "pan-left") {
    scaleVal = interpolate(
      frame,
      [0, durationInFrames],
      [baseScale * 1.04, baseScale * 1.1],
      {
        extrapolateRight: "clamp",
      },
    );
    translateXVal = interpolate(frame, [0, durationInFrames], [22, -22], {
      extrapolateRight: "clamp",
    });
  } else if (motionType === "float") {
    scaleVal = baseScale * 1.06;
    translateYVal = Math.sin(frame * 0.08) * 8;
  }

  // Spring Pop Entrance on First 12 Frames
  const entranceProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const popScale = interpolate(entranceProgress, [0, 1], [0.94, 1.0]);

  // Subtle natural floating wave
  const subtleFloat = Math.sin((frame + index * 12) * 0.05) * 4;

  // Specular light streak sweep (first 25 frames)
  const streakTranslate = interpolate(frame, [0, 25], [-140, 240], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Img
        src={resolveUrl(clip.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: clip.objectFit || "cover",
          transform: `scale(${scaleVal * popScale}) translate3d(${translateXVal}px, ${translateYVal + subtleFloat}px, 0)`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      />
      {/* Specular Light Sweep Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.28) 50%, transparent 60%)",
          transform: `translateX(${streakTranslate}%)`,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};

export const MediaWindow: React.FC<MediaWindowProps> = ({
  mediaClips = [],
  channelName,
  channelLogoUrl,
  sourceCredit,
  mediaAspectRatio = "16:9",
  mediaHeight,
}) => {
  const isSquare = mediaAspectRatio === "1:1";
  const windowHeight = mediaHeight || (isSquare ? 900 : 700);

  // Build TransitionSeries children
  const transitionItems: React.ReactNode[] = [];

  if (mediaClips && mediaClips.length > 0) {
    mediaClips.forEach((clip, index) => {
      const isLast = index === mediaClips.length - 1;
      const isVideo =
        clip.type === "video" || clip.src.match(/\.(mp4|mov|webm)$/i);

      // Duration: in TransitionSeries, overlapping transitions shorten total length.
      // To preserve clip timing, we add TRANSITION_DURATION to all clips except the last.
      const seqDuration =
        (clip.durationInFrames || 300) + (isLast ? 0 : TRANSITION_DURATION);

      const videoElement = (
        <OffthreadVideo
          src={resolveUrl(clip.src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: clip.objectFit || "cover",
          }}
          playbackRate={clip.playbackRate || 1}
          muted={
            clip.muted !== undefined
              ? clip.muted
              : clip.volume !== undefined
                ? false
                : true
          }
          volume={
            clip.volume !== undefined
              ? clip.volume
              : clip.muted === false
                ? 0.7
                : 0
          }
        />
      );

      transitionItems.push(
        <TransitionSeries.Sequence
          key={`seq-${index}`}
          durationInFrames={seqDuration}
        >
          <AbsoluteFill
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: "#06090e",
            }}
          >
            {clip.scene?.layers && clip.scene.layers.length > 0 ? (
              <SceneLayersRenderer
                scene={clip.scene}
                durationFrames={seqDuration}
              />
            ) : isVideo ? (
              clip.loop ? (
                <Loop durationInFrames={120}>{videoElement}</Loop>
              ) : (
                videoElement
              )
            ) : (
              <DynamicMediaImage
                clip={clip}
                index={index}
                durationInFrames={seqDuration}
              />
            )}

            {/* Remotion Player Position & Price Overlay */}
            {(clip.positionBadge || clip.priceTag || clip.playerName) && (
              <div
                style={{
                  position: "absolute",
                  top: 28,
                  right: 110,
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                {/* Position Pill + Player Name */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: "rgba(10, 16, 28, 0.85)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    padding: "6px 16px 6px 8px",
                    borderRadius: 30,
                    border: "1.5px solid rgba(255, 255, 255, 0.25)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  {clip.positionBadge && (
                    <div
                      style={{
                        backgroundColor: "#00E5FF",
                        color: "#000000",
                        fontFamily: `${OswaldFont}, sans-serif`,
                        fontSize: 22,
                        fontWeight: 900,
                        padding: "2px 10px",
                        borderRadius: 18,
                        letterSpacing: 0.5,
                      }}
                    >
                      {clip.positionBadge}
                    </div>
                  )}
                  {clip.playerName && (
                    <span
                      style={{
                        color: "#ffffff",
                        fontFamily: `${OswaldFont}, ${BeVietnamPro}, sans-serif`,
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                      }}
                    >
                      {clip.playerName}
                    </span>
                  )}
                </div>

                {/* High-Impact Yellow Transfer Price Banner */}
                {clip.priceTag && (
                  <div
                    style={{
                      backgroundColor: "#FFD600",
                      color: "#000000",
                      fontFamily: `${OswaldFont}, sans-serif`,
                      fontSize: 32,
                      fontWeight: 900,
                      padding: "6px 20px",
                      borderRadius: 14,
                      letterSpacing: 1.2,
                      boxShadow:
                        "0 6px 20px rgba(255, 214, 0, 0.45), 0 4px 10px rgba(0,0,0,0.5)",
                      border: "2px solid #ffffff",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 24, opacity: 0.9 }}>💰</span>
                    <span>{clip.priceTag}</span>
                  </div>
                )}
              </div>
            )}
          </AbsoluteFill>
        </TransitionSeries.Sequence>,
      );

      // Insert official Remotion Transition between sequences
      if (!isLast) {
        transitionItems.push(
          <TransitionSeries.Transition
            key={`trans-${index}`}
            presentation={
              getTransitionPresentation(
                clip.transition,
                index,
                1080,
                windowHeight,
              ) as any
            }
            timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
          />,
        );
      }
    });
  }

  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        width: 1080,
        marginLeft: -90,
        marginTop: 0,
        height: windowHeight,
        backgroundColor: "#06090e",
        overflow: "hidden",
      }}
    >
      {/* Media Clips rendered via official @remotion/transitions <TransitionSeries> */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {transitionItems.length > 0 ? (
          <TransitionSeries style={{ width: "100%", height: "100%" }}>
            {transitionItems}
          </TransitionSeries>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#1e293b",
            }}
          />
        )}
      </div>

      {/* Top Left Channel & Live Badge */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 110,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {channelLogoUrl && (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #ffffff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              backgroundColor: "#000000",
            }}
          >
            <Img
              src={
                channelLogoUrl.startsWith("http")
                  ? channelLogoUrl
                  : staticFile(channelLogoUrl)
              }
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        {channelName && (
          <span
            style={{
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 800,
              fontFamily: BeVietnamPro,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              letterSpacing: 0.5,
            }}
          >
            {channelName}
          </span>
        )}
      </div>

      {/* Top Right Source Credit Badge */}
      {sourceCredit && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 110,
            zIndex: 20,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            padding: "8px 18px",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: 20,
            fontWeight: 700,
            fontFamily: BeVietnamPro,
          }}
        >
          {sourceCredit}
        </div>
      )}
    </div>
  );
};
