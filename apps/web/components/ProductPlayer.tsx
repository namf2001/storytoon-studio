"use client";

import { forwardRef, useEffect, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { Project } from "@storytoon/shared-types";
import { ProductCommercialVideo, FPS, msToFrames } from "@storytoon/video-engine";

interface Props {
  project: Project;
  bgmUrl?: string | null;
  bgmVolume?: number;
}

/** Live Remotion 9:16 Program Monitor for Fullscreen Product Commercial. */
export const ProductPlayer = forwardRef<PlayerRef, Props>(function ProductPlayer(
  { project, bgmUrl, bgmVolume = 0.12 },
  ref
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const playerStyle: React.CSSProperties = {
    height: "100%",
    maxHeight: "100%",
    aspectRatio: "9/16",
    width: "auto",
    maxWidth: "100%",
    background: "#000000",
    borderRadius: 12,
    margin: "0 auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
  };

  if (!mounted) {
    return (
      <div
        style={{
          ...playerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 12,
        }}
      >
        Đang khởi động Program Monitor...
      </div>
    );
  }

  return (
    <Player
      key={project.audioUrl || "product-player"}
      ref={ref}
      component={ProductCommercialVideo as any}
      inputProps={{
        audioUrl: project.audioUrl,
        durationMs: project.durationMs,
        aspectRatio: project.aspectRatio || "9:16",
        words: project.words ?? [],
        scenes: project.scenes ?? [],
        bgmUrl,
        bgmVolume,
      }}
      durationInFrames={msToFrames(Math.max(project.durationMs, 1000))}
      fps={FPS}
      compositionWidth={1080}
      compositionHeight={1920}
      controls
      style={playerStyle}
    />
  );
});
