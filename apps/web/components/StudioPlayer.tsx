"use client";

import { forwardRef, useEffect, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { MonitorBootPlaceholder, monitorPlayerStateProps } from "@/components/nle/MonitorStates";
import type { Project, AspectRatio } from "@storytoon/shared-types";
import { StoryVideo, FPS, dimensionsFor, msToFrames } from "@storytoon/video-engine";

interface Props { project: Project; ratio: AspectRatio }

/** Live Remotion preview of the project. */
export const StudioPlayer = forwardRef<PlayerRef, Props>(function StudioPlayer({ project, ratio }, ref) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { width, height } = dimensionsFor(ratio);

  if (!mounted) {
    return (
      <MonitorBootPlaceholder
        label="Đang khởi động Player…"
        style={{
          width: "100%",
          maxHeight: "70vh",
          aspectRatio: `${width}/${height}`,
          background: "#000",
          borderRadius: 12,
        }}
      />
    );
  }

  return (
    <Player
      ref={ref}
      component={StoryVideo}
      inputProps={{
        audioUrl: project.audioUrl,
        durationMs: project.durationMs,
        aspectRatio: ratio,
        words: project.words,
        scenes: project.scenes,
      }}
      durationInFrames={msToFrames(Math.max(project.durationMs, 1000))}
      fps={FPS}
      compositionWidth={width}
      compositionHeight={height}
      controls
      {...monitorPlayerStateProps}
      style={{
        height: ratio === "9:16" ? "100%" : "auto",
        width: ratio === "9:16" ? "auto" : "100%",
        maxHeight: "100%",
        maxWidth: "100%",
        aspectRatio: `${width}/${height}`,
        background: "#000",
        borderRadius: 8,
        margin: "0 auto",
        boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
      }}
    />
  );
});
