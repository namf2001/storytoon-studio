import type { Scene } from "@storytoon/shared-types";

export type HighlightColor =
  | "yellow"
  | "red"
  | "white"
  | "cyan"
  | "orange"
  | "green"
  | string;

export interface HighlightSegment {
  text: string;
  color?: HighlightColor;
  isBold?: boolean;
}

export interface HeadlineLine {
  segments: HighlightSegment[];
}

export interface MediaClip {
  scene?: Scene;
  type: "image" | "video";
  src: string;
  credit?: string;
  startFrame: number;
  durationInFrames: number;
  scale?: number;
  objectFit?: "cover" | "contain";
  volume?: number | ((frame: number) => number);
  muted?: boolean;
  loop?: boolean;
  playbackRate?: number;
  positionBadge?: string;
  playerName?: string;
  priceTag?: string;
  transition?:
    | "fade"
    | "slide"
    | "wipe"
    | "flip"
    | "clock-wipe"
    | "iris"
    | "none"
    | "auto";
  motion?:
    | "zoom-in"
    | "zoom-out"
    | "pan-left"
    | "pan-right"
    | "float"
    | "none";
}

export interface SubtitleCaption {
  fromFrame: number;
  durationInFrames: number;
  text: string;
}

export interface VtvNewsTemplateProps {
  cardBgColor?: string;
  cardBorderColor?: string;
  cardStyle?: "liquid_glass" | "solid" | "bordered";
  tagColor?: string;
  hashtags?: string[];
  headlines?: HeadlineLine[];
  mediaClips?: MediaClip[];
  captions?: SubtitleCaption[];
  channelName?: string;
  channelLogoUrl?: string;
  sourceCredit?: string;
  badgeTitle?: string;
  badgeSubtitle?: string;
  badgeLogoUrl?: string;
  watermarkLogoUrl?: string;
  watermarkOpacity?: number;
  backgroundVideoUrl?: string;
  backgroundVideoOpacity?: number;
  backgroundVideoLoopDuration?: number;
  mediaAspectRatio?: "1:1" | "16:9" | "custom";
  mediaHeight?: number;
  topHeaderHeight?: number;
  audioSrc?: string;
  bgmSrc?: string;
  bgmVolume?: number;
}
