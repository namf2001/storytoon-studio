"use client";

import { forwardRef, useEffect, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { MonitorBootPlaceholder, monitorPlayerStateProps } from "@/components/nle/MonitorStates";
import type { FootballBroadcastConfig, Project } from "@storytoon/shared-types";
import { FootballShortVideo, VtvNewsVideo, FPS, msToFrames } from "@storytoon/video-engine";

interface AudioMix {
  /** Voice-over gain, 0 = muted. */
  voice: number;
  /** Background-music gain, 0 = muted. */
  bgm: number;
}

interface Props {
  project: Project;
  config: FootballBroadcastConfig;
  /** Live track mix from the timeline (overrides config.bgmVolume). */
  mix?: AudioMix;
}

/** Live Remotion 9:16 Program Monitor of the Football Broadcast Short. */
export const FootballPlayer = forwardRef<PlayerRef, Props>(function FootballPlayer(
  { project, config, mix },
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
    background: "#0A1C3E",
    borderRadius: 10,
    margin: "0 auto",
    boxShadow: "0 16px 48px rgba(0,0,0,0.8)",
  };

  if (!mounted) {
    return (
      <MonitorBootPlaceholder
        label="Đang khởi động Program Monitor…"
        style={{
          ...playerStyle,
        }}
      />
    );
  }

  const isVtvNews = config.templateId === "vtv_news_template";
  const TemplateComponent = isVtvNews ? VtvNewsVideo : FootballShortVideo;

  return (
    <Player
      key={config.templateId || "broadcast"}
      ref={ref}
      component={TemplateComponent}
      inputProps={{
        audioUrl: project.audioUrl,
        durationMs: project.durationMs,
        words: project.words ?? [],
        scenes: project.scenes ?? [],
        config: mix ? { ...config, bgmVolume: mix.bgm } : config,
        voiceVolume: mix ? mix.voice : 1,
      }}
      durationInFrames={msToFrames(Math.max(project.durationMs, 1000))}
      fps={FPS}
      compositionWidth={1080}
      compositionHeight={1920}
      controls
      {...monitorPlayerStateProps}
      style={playerStyle}
    />
  );
});
