import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import {
   parseMediaCrop,
  type FootballVideoProps,
  type Scene,
} from "@storytoon/shared-types";
import { SceneLayersRenderer } from "./SceneLayersRenderer";
import { msToFrames } from "./constants";

const { fontFamily: beVietnamFont } = loadBeVietnamPro("normal", {
  weights: ["600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
});

const HIGHLIGHT_KEYWORDS = new Set([
  "VIỆT", "NAM", "MALAYSIA", "AFF", "CUP", "WORLD", "SEA", "GAMES",
  "PARK", "THẮNG", "THUA", "BẠI", "KỶ", "LỤC", "RONALDO", "MESSI",
  "HAALAND", "MBAPPE", "REAL", "MADRID", "BARCA", "MAN", "CITY",
  "PSG", "MU", "CHAMPIONS", "LEAGUE", "C1", "ĐỊA", "CHẤN", "ĐIÊN",
  "RỒ", "NGƯỢC", "DÒNG", "SIÊU", "PHẨM", "HUỶ", "DIỆT", "VÔ", "ĐỊCH",
]);

const SFX_ROTATION = [
  "whoosh_fast.mp3",
  "camera_shutter_1.mp3",
  "swoosh_1.mp3",
  "sub_bass_1.mp3",
  "whoosh_2.mp3",
  "whoosh_1.mp3",
];

const SingleFootballClip: React.FC<{
  scene: Scene;
  durationFrames: number;
  flashOnTransition: boolean;
  isFirst: boolean;
}> = ({ scene, durationFrames, flashOnTransition, isFirst }) => {
  const frame = useCurrentFrame();
  const dur = Math.max(durationFrames, 15);
  const effect = scene.cameraEffect || "zoom_in";
  const media = parseMediaCrop(scene.imageUrl);

  let scale = 1.04;
  let tx = 0;
  let ty = 0;

  if (effect === "zoom_in") {
    scale = interpolate(frame, [0, dur], [1.0, 1.1], { extrapolateRight: "clamp" });
  } else if (effect === "zoom_out") {
    scale = interpolate(frame, [0, dur], [1.1, 1.0], { extrapolateRight: "clamp" });
  } else if (effect === "pan_left") {
    tx = interpolate(frame, [0, dur], [24, -24], { extrapolateRight: "clamp" });
    scale = 1.06;
  } else if (effect === "pan_right") {
    tx = interpolate(frame, [0, dur], [-24, 24], { extrapolateRight: "clamp" });
    scale = 1.06;
  } else if (effect === "shake") {
    tx = Math.sin(frame * 1.1) * 6;
    ty = Math.cos(frame * 1.4) * 5;
    scale = 1.06;
  } else if (effect === "static") {
    scale = 1.0;
  }

  const finalScale = scale * media.cropZoom;
  const objPos = `${media.cropX}% ${media.cropY}%`;

  let enterOpacity = 1;
  let enterTranslateX = 0;
  let enterTranslateY = 0;
  let enterRotateY = 0;
  let clipPath = "none";

  if (!isFirst) {
    if (scene.transition === "fade") {
      enterOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
    } else if (scene.transition === "slide") {
      enterTranslateX = interpolate(frame, [0, 12], [1080, 0], { extrapolateRight: "clamp" });
    } else if (scene.transition === "wipe") {
      const wipePct = interpolate(frame, [0, 14], [100, 0], { extrapolateRight: "clamp" });
      clipPath = `inset(0 ${wipePct}% 0 0)`;
    } else if (scene.transition === "flip") {
      enterRotateY = interpolate(frame, [0, 14], [90, 0], { extrapolateRight: "clamp" });
      enterOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
    }
  }

  const flashOpacity =
    !isFirst && flashOnTransition
      ? interpolate(frame, [0, 6], [0.85, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        opacity: enterOpacity,
        clipPath,
        transform: `perspective(1200px) translate(${enterTranslateX}px, ${enterTranslateY}px) rotateY(${enterRotateY}deg)`,
      }}
    >
      {scene.layers && scene.layers.length > 0 ? (
        <SceneLayersRenderer
          scene={scene}
          durationFrames={dur}
          flashOnTransition={false}
          isFirst={isFirst}
        />
      ) : media.cleanUrl ? (
        media.isVideo ? (
          <OffthreadVideo
            src={media.cleanUrl}
            startFrom={Math.round(media.trimStartSec * 30)}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: objPos,
              transformOrigin: objPos,
              transform: `scale(${finalScale}) translate(${tx}px, ${ty}px)`,
            }}
          />
        ) : (
          <img
            src={media.cleanUrl}
            alt={`Scene ${scene.sceneIndex}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: objPos,
              transformOrigin: objPos,
              transform: `scale(${finalScale}) translate(${tx}px, ${ty}px)`,
            }}
          />
        )
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            textAlign: "center",
            color: "#94a3b8",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFD600", marginBottom: 12 }}>
            CẢNH #{scene.sceneIndex} — CHƯA CÓ MEDIA B-ROLL
          </div>
          <div style={{ fontSize: 24, maxWidth: 820, lineHeight: 1.4, color: "#e2e8f0" }}>
            “{scene.transcriptText}”
          </div>
        </div>
      )}

      {flashOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#FFFFFF",
            opacity: flashOpacity,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

/**
 * FootballShortVideo - Broadcast 9:16 composition matching football broadcast news format.
 */
export const FootballShortVideo: React.FC<FootballVideoProps> = ({
  audioUrl,
  words,
  scenes,
  config,
  voiceVolume = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const ratio = config.mediaAspectRatio || "3:4";
  const videoHeight =
    ratio === "3:4" ? 1040 : ratio === "1:1" ? 900 : ratio === "4:3" ? 810 : 608;
  const videoY =
    ratio === "3:4" ? 130 : ratio === "1:1" ? 170 : ratio === "4:3" ? 200 : 250;
  const timelineLineHeight =
    ratio === "3:4" ? 270 : ratio === "1:1" ? 310 : ratio === "4:3" ? 360 : 440;

  const contentTop = videoY + videoHeight + 45;
  const dateHeight = config.dateText ? 42 : 0;
  const timelineDotY = contentTop + dateHeight + 6;

  // Timeline Indicator spring
  const dotScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const currentLineHeight = interpolate(frame, [10, 32], [0, timelineLineHeight], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineOpacity = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline entry fade
  const textFade = interpolate(frame, [6, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textTranslateX = interpolate(frame, [6, 22], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Diagonal scrolling background offset
  const offsetX = (frame * (config.backgroundScrollSpeed ?? 0.35)) % 296;
  const offsetY = (frame * (config.backgroundScrollSpeed ?? 0.35) * (291 / 296)) % 291;

  // Active 6-word live broadcast caption chunk
  const activeWordIdx = words.findIndex((w) => nowMs >= w.startMs && nowMs <= w.endMs);
  const chunkStart = activeWordIdx >= 0 ? Math.floor(activeWordIdx / 6) * 6 : -1;
  const activeChunk = chunkStart >= 0 ? words.slice(chunkStart, chunkStart + 6) : [];

  // Watermark fade-in
  const watermarkOpacity = interpolate(frame, [15, 35], [0, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontStack = `${beVietnamFont}, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Be Vietnam Pro', Montserrat, Arial, sans-serif`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: config.backgroundColor || "#0A1C3E",
        width: 1080,
        height: 1920,
        overflow: "hidden",
      }}
    >
      {/* 0. BROADCAST DIAGONAL STRIPED BACKGROUND */}
      {config.backgroundTileUrl ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: config.backgroundColor || "#0A1C3E",
            backgroundImage: `url(${config.backgroundTileUrl})`,
            backgroundRepeat: "repeat",
            backgroundPosition: `${offsetX}px ${offsetY}px`,
            zIndex: 0,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              config.backgroundTheme === "crimson"
                ? "repeating-linear-gradient(-45deg, #BA0C2F, #BA0C2F 24px, #9e0826 24px, #9e0826 48px)"
                : "repeating-linear-gradient(-45deg, #0A1C3E, #0A1C3E 24px, #0d234c 24px, #0d234c 48px)",
            zIndex: 0,
          }}
        />
      )}

      {/* 1. VOICEOVER, BGM & TRANSITION SFX */}
      {audioUrl && <Audio src={audioUrl} volume={voiceVolume} />}
      {config.bgmUrl && (
        <Audio src={config.bgmUrl} volume={config.bgmVolume ?? 0.14} loop />
      )}
      {config.enableTransitionSfx &&
        config.sfxBaseUrl &&
        scenes.map((sc, idx) => {
          const sfxFile = SFX_ROTATION[idx % SFX_ROTATION.length];
          const fromFrame = msToFrames(sc.startMs);
          return (
            <Sequence key={`sfx-${sc.id}`} from={fromFrame} durationInFrames={36}>
              <Audio src={`${config.sfxBaseUrl}/${sfxFile}`} volume={0.28} />
            </Sequence>
          );
        })}

      {/* 2. TOP MEDIA / B-ROLL CONTAINER (4:3 or 16:9) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: videoY,
          width: "100%",
          height: videoHeight,
          overflow: "hidden",
          backgroundColor: "#000000",
          boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          zIndex: 5,
        }}
      >
        {config.showFrameBorders && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 6,
                backgroundColor: config.frameBorderColor || "#FFFFFF",
                zIndex: 30,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: 6,
                backgroundColor: config.frameBorderColor || "#FFFFFF",
                zIndex: 30,
              }}
            />
          </>
        )}

        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {scenes.map((sc, idx) => {
            const from = msToFrames(sc.startMs);
            const dur = Math.max(1, msToFrames(sc.endMs - sc.startMs));
            return (
              <Sequence key={sc.id} from={from} durationInFrames={dur}>
                <SingleFootballClip
                  scene={sc}
                  durationFrames={dur}
                  flashOnTransition={config.enableFlashOnTransition}
                  isFirst={idx === 0}
                />
              </Sequence>
            );
          })}
        </div>

        {/* Broadcast Social / News Ticker Bar */}
        {config.showTicker && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: 48,
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              boxSizing: "border-box",
              borderTop: "2px solid #E2E8F0",
              zIndex: 20,
            }}
          >
            <div
              style={{
                backgroundColor: "#0088CC",
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: 800,
                padding: "2px 10px",
                borderRadius: 3,
                fontFamily: fontStack,
                textTransform: "uppercase",
              }}
            >
              {config.tickerText || "TIN NÓNG BÓNG ĐÁ"}
            </div>
            <div
              style={{
                color: "#475569",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: fontStack,
                letterSpacing: 0.5,
              }}
            >
              {config.tickerSocialText || "f  |  yt  |  tiktok  |  @nguoidabong  |  NGƯỜI ĐÁ BÓNG"}
            </div>
          </div>
        )}
      </div>

      {/* 3. TIMELINE INDICATOR (WHITE PIN & VERTICAL LINE) */}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: timelineDotY,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            transform: `scale(${dotScale})`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        />
        <div
          style={{
            width: 5,
            height: currentLineHeight,
            backgroundColor: "#FFFFFF",
            opacity: lineOpacity,
            borderRadius: 3,
            marginTop: -2,
          }}
        />
      </div>

      {/* 4. HEADLINE & METADATA CONTENT PANEL */}
      <div
        style={{
          position: "absolute",
          left: 135,
          top: contentTop,
          width: 875,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          opacity: textFade,
          transform: `translateX(${textTranslateX}px)`,
          zIndex: 10,
        }}
      >
        {config.dateText && (
          <div
            style={{
              fontFamily: fontStack,
              fontSize: 30,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.95)",
              letterSpacing: 0.3,
              marginBottom: 4,
            }}
          >
            {config.dateText}
          </div>
        )}

        {config.categoryText && (
          <div
            style={{
              fontFamily: fontStack,
              fontSize: config.headlineFontSize || 44,
              fontWeight: 800,
              color: config.categoryColor || "#FFD600",
              lineHeight: 1.25,
              letterSpacing: -0.5,
            }}
          >
            {config.categoryText}
          </div>
        )}

        {config.headlines?.map((line, idx) => (
          <div
            key={`hl-${idx}`}
            style={{
              fontFamily: fontStack,
              fontSize: config.headlineFontSize || 44,
              fontWeight: 800,
              color: config.headlineColor || "#FFFFFF",
              lineHeight: 1.22,
              letterSpacing: -0.5,
            }}
          >
            {line}
          </div>
        ))}

        {/* Live Broadcast Karaoke Pill */}
        {config.showCaptions && activeChunk.length > 0 && (
          <div
            style={{
              marginTop: 20,
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              backgroundColor: "rgba(10, 28, 62, 0.9)",
              border: "2px solid rgba(255, 255, 255, 0.35)",
              borderRadius: 20,
              padding: "10px 22px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.55)",
              maxWidth: 820,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#FF3B30",
                boxShadow: "0 0 12px #FF3B30",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: fontStack,
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1.3,
                textTransform: "uppercase",
                color: "#FFFFFF",
              }}
            >
              {activeChunk.map((w, idx) => {
                const clean = w.text.replace(/[.,!?;:()"]/g, "").toUpperCase();
                const isCurrent = nowMs >= w.startMs && nowMs <= w.endMs;
                const isKeyword = HIGHLIGHT_KEYWORDS.has(clean);
                return (
                  <span
                    key={idx}
                    style={{
                      color: isCurrent || isKeyword ? "#FFD600" : "#FFFFFF",
                      fontWeight: isCurrent || isKeyword ? 900 : 800,
                      marginRight: 8,
                      textDecoration: isCurrent ? "underline" : "none",
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </span>
          </div>
        )}
      </div>

      {/* 5. WATERMARK LOGO (REPLACES THE NUMBER 24) */}
      <div
        style={{
          position: "absolute",
          right: 75,
          bottom: 240,
          zIndex: 15,
          opacity: watermarkOpacity,
          pointerEvents: "none",
        }}
      >
        {config.watermarkLogoUrl ? (
          <img
            src={config.watermarkLogoUrl}
            alt="Watermark"
            style={{
              width: 175,
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.35))",
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: fontStack,
              fontWeight: 900,
              fontSize: 36,
              color: "#FFFFFF",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {config.watermarkText || "NGƯỜI ĐÁ BÓNG"}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
