import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, staticFile } from "remotion";

interface BackgroundFrameProps {
  children: React.ReactNode;
  backgroundVideoUrl?: string;
  backgroundVideoOpacity?: number;
  backgroundVideoLoopDuration?: number;
  cardBgColor?: string;
  cardBorderColor?: string;
  cardStyle?: "liquid_glass" | "solid" | "bordered";
  topHeaderHeight?: number;
}

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

export const BackgroundFrame: React.FC<BackgroundFrameProps> = ({
  children,
  backgroundVideoUrl = "/media/football-assets/bg_loop.mp4",
  backgroundVideoOpacity = 1.0,
  backgroundVideoLoopDuration,
  cardBgColor,
  cardBorderColor,
  cardStyle = "liquid_glass",
  topHeaderHeight = 140,
}) => {
  const [videoError, setVideoError] = React.useState(false);
  const isLiquidGlass = cardStyle === "liquid_glass";

  const effectiveBgColor =
    cardBgColor ||
    (isLiquidGlass ? "rgba(10, 16, 28, 0.58)" : "rgba(0, 0, 0, 0.90)");
  const effectiveBorderColor =
    cardBorderColor ||
    (isLiquidGlass ? "rgba(255, 255, 255, 0.32)" : "rgba(255, 255, 255, 0.16)");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#06090e",
        width: 1080,
        height: 1920,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ─── LAYER 0: Animated Video Background (Pinterest Loop) ───────── */}
      {backgroundVideoUrl && !videoError ? (
        <AbsoluteFill style={{ opacity: backgroundVideoOpacity, zIndex: 1 }}>
          <Loop durationInFrames={backgroundVideoLoopDuration || 450}>
            <OffthreadVideo
              src={resolveUrl(backgroundVideoUrl)}
              onError={(e) => {
                console.warn("Background video error, falling back to gradient:", e);
                setVideoError(true);
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
            />
          </Loop>
        </AbsoluteFill>
      ) : (
        /* Fallback Broadcast Gradient */
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(135deg, #005f56 0%, #0c3340 30%, #b45309 70%, #eab308 100%)",
            zIndex: 1,
          }}
        />
      )}

      {/* ─── LAYER 1: Apple iOS Liquid Glass Floating Card ─────────────── */}
      <div
        style={{
          position: "relative",
          width: 900,
          height: 1720,
          backgroundColor: effectiveBgColor,
          backdropFilter: isLiquidGlass
            ? "blur(42px) saturate(190%)"
            : "blur(24px)",
          WebkitBackdropFilter: isLiquidGlass
            ? "blur(42px) saturate(190%)"
            : "blur(24px)",
          borderRadius: 48,
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
          boxShadow: isLiquidGlass
            ? "0 35px 90px rgba(0, 0, 0, 0.65), 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1.5px 2px rgba(255, 255, 255, 0.55), inset 0 -1.5px 2px rgba(0, 0, 0, 0.35)"
            : "0 25px 60px -10px rgba(0, 0, 0, 0.95)",
          border: `1.8px solid ${effectiveBorderColor}`,
          zIndex: 5,
        }}
      >
        {/* iOS Liquid Glass Specular Top Highlight Streak */}
        {isLiquidGlass && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 48,
              right: 48,
              height: "2px",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)",
              zIndex: 25,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Top Header Area above Video */}
        <div style={{ width: "100%", height: topHeaderHeight, flexShrink: 0 }} />

        {children}
      </div>
    </AbsoluteFill>
  );
};
