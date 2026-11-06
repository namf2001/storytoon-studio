import React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HeadlineLine, SubtitleCaption } from "./types";
import { OswaldFont, BeVietnamPro } from "../load-font";

interface HeadlineSectionProps {
  hashtags?: string[];
  headlines?: HeadlineLine[];
  captions?: SubtitleCaption[];
  watermarkLogoUrl?: string;
  watermarkOpacity?: number;
  tagColor?: string;
}

const HIGHLIGHT_KEYWORDS = new Set([
  "VIỆT",
  "NAM",
  "MALAYSIA",
  "DERBY",
  "ĐÌNH",
  "BẮC",
  "KIM",
  "SANG-SIK",
  "12",
  "NĂM",
  "MƯỜI",
  "HAI",
  "NHẬP",
  "TỊCH",
  "HCĐ",
  "WORLD",
  "CUP",
  "CHẤN",
  "THƯƠNG",
  "BERGSON",
  "BẤT",
  "BẠI",
  "TIÊN",
  "TRI",
  "COMMENT",
  "CHIẾN",
  "THẮNG",
]);

const COLOR_MAP: Record<string, string> = {
  yellow: "#FFD600",
  red: "#FF3B30",
  white: "#FFFFFF",
  cyan: "#00E5FF",
  orange: "#FF9100",
  green: "#00E676",
  black: "#000000",
  dark: "#0F172A",
  pink: "#F4B5CD",
  hotpink: "#FF1493",
};

const YouTubeIcon: React.FC<{ size?: number }> = ({ size = 36 }) => {
  const height = Math.round(size * (26 / 38));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 38 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      <rect width="38" height="26" rx="6" fill="#FF0000" />
      <path d="M15 6.5L26 13L15 19.5V6.5Z" fill="white" />
    </svg>
  );
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

export const HeadlineSection: React.FC<HeadlineSectionProps> = ({
  hashtags = ["NGƯỜI ĐÁ BÓNG"],
  headlines = [],
  captions,
  watermarkLogoUrl = "/storage/football-assets/nguoi_da_bong_logo.png",
  watermarkOpacity = 0.14,
  tagColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find active subtitle chunk
  const activeCaption = captions?.find(
    (c) => frame >= c.fromFrame && frame < c.fromFrame + c.durationInFrames,
  );

  const captionProgress = activeCaption
    ? spring({
        frame: frame - activeCaption.fromFrame,
        fps,
        config: { damping: 14, stiffness: 140, mass: 0.7 },
      })
    : 1;

  const captionScale = interpolate(captionProgress, [0, 1], [0.94, 1.0]);

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        width: "100%",
        backgroundColor: "transparent",
        borderRadius: "0 0 48px 48px",
        padding: "50px 85px 60px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        overflow: "hidden",
      }}
    >
      {/* Background Watermark Logo with reduced opacity */}
      {watermarkLogoUrl && (
        <div
          style={{
            position: "absolute",
            right: -120,
            bottom: -50,
            width: 780,
            height: 780,
            pointerEvents: "none",
            zIndex: 1,
            opacity: watermarkOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={resolveUrl(watermarkLogoUrl)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {/* Channel / Category tags with YouTube icon */}
      {hashtags && hashtags.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
            marginBottom: 36,
            zIndex: 2,
          }}
        >
          {hashtags.map((tag, idx) => {
            const cleanTag = tag.replace(/^#/, "");
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <YouTubeIcon size={38} />
                <span
                  style={{
                    fontFamily: BeVietnamPro,
                    fontSize: 28,
                    fontWeight: 900,
                    color: tagColor || "#00E5FF",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  {cleanTag}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Multi-line Headline Content (Full Width) */}
      <div
        style={{
          zIndex: 2,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {headlines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            style={{
              fontFamily: `${OswaldFont}, ${BeVietnamPro}, sans-serif`,
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.28,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              wordBreak: "break-word",
            }}
          >
            {line.segments.map((seg, segIdx) => {
              const textColor =
                COLOR_MAP[seg.color || "yellow"] || seg.color || "#FFD600";

              return (
                <span
                  key={segIdx}
                  style={{
                    color: textColor,
                    fontWeight: seg.isBold !== false ? 800 : 700,
                  }}
                >
                  {seg.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {/* ─── Dynamic Live Subtitle Banner (Broadcast Karaoke Pill) ─── */}
      {activeCaption && (
        <div
          style={{
            zIndex: 3,
            marginTop: 36,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            backgroundColor: "rgba(10, 16, 28, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "2px solid rgba(255, 255, 255, 0.35)",
            borderRadius: 22,
            padding: "12px 28px",
            boxShadow:
              "0 14px 35px rgba(0, 0, 0, 0.6), inset 0 1.5px 2px rgba(255, 255, 255, 0.4)",
            transform: `scale(${captionScale})`,
            transformOrigin: "left center",
          }}
        >
          {/* Pulsing Red Live Broadcast Dot */}
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: "#FF3B30",
              boxShadow: "0 0 12px #FF3B30",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: BeVietnamPro,
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.32,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "#FFFFFF",
            }}
          >
            {activeCaption.text.split(" ").map((w, wIdx) => {
              const clean = w.replace(/[.,!?;:()"]/g, "").toUpperCase();
              const isHighlight = HIGHLIGHT_KEYWORDS.has(clean);
              return (
                <span
                  key={wIdx}
                  style={{
                    color: isHighlight ? "#FFD600" : "#FFFFFF",
                    fontWeight: isHighlight ? 900 : 800,
                    marginRight: 8,
                    textShadow: isHighlight
                      ? "0 0 14px rgba(255, 214, 0, 0.5)"
                      : "none",
                  }}
                >
                  {w}
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
};
