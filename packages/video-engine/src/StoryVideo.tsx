import React from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import type { StoryVideoProps } from "@storytoon/shared-types";
import { SceneLayer } from "./SceneLayer";
import { Captions } from "./Captions";
import { msToFrames } from "./constants";

/** Main composition: scene images + voiceover + kinetic captions. */
export const StoryVideo: React.FC<StoryVideoProps> = ({ audioUrl, words, scenes, voiceVolume = 1 }) => {
  const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sorted.map((s) => {
        const from = msToFrames(s.startMs) - (s.startMs === 0 ? 1 : 0);
        const dur = msToFrames(s.endMs - s.startMs);
        return (
          <Sequence key={s.id} from={Math.max(0, from)} durationInFrames={dur}>
            <SceneLayer scene={s} durationInFrames={dur} />
          </Sequence>
        );
      })}
      {audioUrl ? <Audio src={audioUrl} volume={voiceVolume} /> : null}
      <Captions words={words} scenes={sorted} />
    </AbsoluteFill>
  );
};
