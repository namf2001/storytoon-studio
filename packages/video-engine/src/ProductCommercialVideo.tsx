import React from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import type { StoryVideoProps } from "@storytoon/shared-types";
import { SceneLayer } from "./SceneLayer";
import { Captions } from "./Captions";
import { msToFrames } from "./constants";

export interface ProductCommercialVideoProps extends StoryVideoProps {
  bgmUrl?: string | null;
  bgmVolume?: number;
}

/**
 * ProductCommercialVideo - Video giới thiệu sản phẩm toàn màn hình 9:16
 * Không template viền rườm rà, hỗ trợ cắt điểm In/Out và chuyển cảnh mượt mà
 */
export const ProductCommercialVideo: React.FC<ProductCommercialVideoProps> = ({
  audioUrl,
  bgmUrl,
  bgmVolume = 0.12,
  voiceVolume = 1,
  words = [],
  scenes = [],
}) => {
  const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Chuỗi các phân cảnh video / ảnh */}
      {sorted.map((s) => {
        const from = msToFrames(s.startMs) - (s.startMs === 0 ? 1 : 0);
        const dur = msToFrames(s.endMs - s.startMs);
        return (
          <Sequence key={s.id} from={Math.max(0, from)} durationInFrames={Math.max(1, dur)}>
            <SceneLayer scene={s} durationInFrames={dur} />
          </Sequence>
        );
      })}

      {/* Voice-over */}
      {audioUrl ? (
        <Audio
          src={audioUrl}
          volume={voiceVolume}
          onError={(e) => console.warn("Voice-over audio error:", e)}
        />
      ) : null}

      {/* Nhạc nền BGM */}
      {bgmUrl ? (
        <Audio
          src={bgmUrl}
          volume={bgmVolume}
          loop
          onError={(e) => console.warn("BGM audio error:", e)}
        />
      ) : null}

      {/* Phụ đề động Kinetic Subtitles */}
      <Captions words={words} scenes={sorted} />
    </AbsoluteFill>
  );
};
