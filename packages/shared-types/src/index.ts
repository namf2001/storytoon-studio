/** Aspect ratio supported for export. */
export type AspectRatio = "16:9" | "9:16";

/** Aspect ratio for the B-Roll media frame inside a 9:16 broadcast video. */
export type MediaAspectRatio = "3:4" | "4:3" | "16:9" | "1:1";

/** Per-scene crop and trim settings when fitting source media (e.g. 9:16) into a target frame (e.g. 3:4 or 4:3). */
export interface MediaCropConfig {
  cropX: number;
  cropY: number;
  cropZoom: number;
  trimStartSec: number;
  playbackRate?: number; // Video playback speed multiplier (e.g. 1.0, 1.43)
  autoFitSpeed?: boolean; // When true, automatically speeds up/slows down video to fill scene duration
  sourceDurationSec?: number; // Duration of source video clip in seconds (e.g. 7.98)
}

/** Parsed media URL with clean source URL, video flag, and crop/trim parameters. */
export interface ParsedSceneMedia extends MediaCropConfig {
  cleanUrl: string;
  isVideo: boolean;
}

/** Parse crop & video metadata encoded in a scene media URL (#crop=x,y,zoom,trim or ?crop=...). */
export function parseMediaCrop(url?: string | null): ParsedSceneMedia {
  const defaults: ParsedSceneMedia = {
    cleanUrl: "",
    isVideo: false,
    cropX: 50,
    cropY: 50,
    cropZoom: 1,
    trimStartSec: 0,
    playbackRate: 1,
    autoFitSpeed: false,
    sourceDurationSec: undefined,
  };
  if (!url) return defaults;

  const [beforeHash, hashPart = ""] = url.split("#");
  const [basePath, queryPart = ""] = beforeHash.split("?");

  // Normalize duplicate slashes in path (e.g. /media//product-shopee -> /media/product-shopee)
  const normalizedBasePath = basePath
    .replace(/^(\/\/+)/, "/")
    .replace(/([^:\/]\/)\/+/g, "$1");

  const params = new URLSearchParams(hashPart || queryPart);
  const cropRaw = params.get("crop");
  let cropX = 50;
  let cropY = 50;
  let cropZoom = 1;
  let trimStartSec = 0;

  if (cropRaw) {
    const parts = cropRaw.split(",").map((n) => parseFloat(n));
    if (!Number.isNaN(parts[0])) cropX = Math.max(0, Math.min(100, parts[0]));
    if (!Number.isNaN(parts[1])) cropY = Math.max(0, Math.min(100, parts[1]));
    if (!Number.isNaN(parts[2])) cropZoom = Math.max(1, Math.min(4.0, parts[2]));
    if (!Number.isNaN(parts[3])) trimStartSec = Math.max(0, parts[3]);
  }

  const speedRaw = params.get("speed") || params.get("playbackRate");
  let playbackRate: number | undefined = undefined;
  if (speedRaw) {
    const parsedSpeed = parseFloat(speedRaw);
    if (!Number.isNaN(parsedSpeed) && parsedSpeed > 0) {
      playbackRate = Math.max(0.1, Math.min(10, parsedSpeed));
    }
  }

  const autoFitRaw = params.get("autofit");
  const autoFitSpeed = autoFitRaw === "1" || autoFitRaw === "true";

  const srcDurRaw = params.get("srcdur") || params.get("dur");
  let sourceDurationSec: number | undefined = undefined;
  if (srcDurRaw) {
    const parsedDur = parseFloat(srcDurRaw);
    if (!Number.isNaN(parsedDur) && parsedDur > 0) {
      sourceDurationSec = parsedDur;
    }
  }

  const lower = normalizedBasePath.toLowerCase();
  const isVideo =
    params.get("v") === "1" ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov");

  return {
    cleanUrl: normalizedBasePath,
    isVideo,
    cropX,
    cropY,
    cropZoom,
    trimStartSec,
    playbackRate,
    autoFitSpeed,
    sourceDurationSec,
  };
}

/** Encode crop & trim parameters into a scene media URL hash. */
export function buildMediaUrlWithCrop(
  url: string,
  crop: Partial<MediaCropConfig>,
  forceVideo?: boolean
): string {
  const current = parseMediaCrop(url);
  if (!current.cleanUrl) return "";
  const x = Math.round(crop.cropX ?? current.cropX);
  const y = Math.round(crop.cropY ?? current.cropY);
  const z = Number((crop.cropZoom ?? current.cropZoom).toFixed(2));
  const t = Number((crop.trimStartSec ?? current.trimStartSec).toFixed(1));
  const isVid = forceVideo ?? current.isVideo;

  const autoFit = crop.autoFitSpeed ?? current.autoFitSpeed;
  const speed = crop.playbackRate ?? current.playbackRate;
  const srcDur = crop.sourceDurationSec ?? current.sourceDurationSec;

  const params: string[] = [];
  params.push(`crop=${x},${y},${z},${t}`);
  if (isVid) params.push("v=1");
  if (autoFit) params.push("autofit=1");
  if (speed !== undefined && speed !== 1 && !autoFit) params.push(`speed=${Number(speed.toFixed(2))}`);
  if (srcDur !== undefined && srcDur > 0) params.push(`srcdur=${Number(srcDur.toFixed(2))}`);

  const isDefault =
    x === 50 &&
    y === 50 &&
    z === 1 &&
    t === 0 &&
    !autoFit &&
    (speed === undefined || speed === 1) &&
    !url.startsWith("blob:");
  if (isDefault && !isVid) return current.cleanUrl;

  const hash = params.join("&");
  return `${current.cleanUrl}#${hash}`;
}

/** Lifecycle of a project. */
export type ProjectStatus =
  | "draft"
  | "processing"
  | "ready"
  | "failed"
  | "rendering"
  | "done";

/** Camera motion applied to a scene image. */
export type CameraEffect =
  | "static"
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "shake";

/** Transition used when entering a scene. */
export type Transition = "cut" | "fade" | "slide" | "wipe" | "flip";

export const CAMERA_EFFECTS: CameraEffect[] = [
  "static", "zoom_in", "zoom_out", "pan_left", "pan_right", "shake",
];
export const TRANSITIONS: Transition[] = ["cut", "fade", "slide", "wipe", "flip"];

/** A single spoken word with timing (milliseconds). */
export interface CaptionWord {
  text: string;
  startMs: number;
  endMs: number;
}

/** A character detected by the AI in the script. */
export interface Character {
  name: string;
  description: string;
}

/** Supported scene composition presets and layouts */
export type SceneLayoutType =
  | "standard"       // 1 nền toàn khung + overlays
  | "split_compare"  // So sánh 2 ảnh/video đối đầu (Trái/Phải hoặc Trên/Dưới)
  | "quote_card"     // Trích dẫn phát biểu + Avatar/Chân dung
  | "player_card"    // Thẻ cầu thủ + Chỉ số bàn thắng + Cutout
  | "breaking_badge"; // Tin nóng điểm nhấn + Băng rôn chớp nảy

/** Base interface for any layer placed inside a scene */
export interface BaseSceneLayer {
  id: string;
  name?: string;
  visible?: boolean;
}

/** Media layer: background video or picture-in-picture image */
export interface MediaLayer extends BaseSceneLayer {
  type: "media";
  mediaUrl: string;
  mediaType?: "image" | "video";
  fit?: "cover" | "contain";
  cropX?: number; // 0 - 100
  cropY?: number; // 0 - 100
  cropZoom?: number; // 1.0 - 2.5
  trimStartSec?: number;
  playbackRate?: number;
  autoFitSpeed?: boolean;
  sourceDurationSec?: number;
  blur?: number; // 0 - 20px blur for background
  opacity?: number; // 0 - 1
  motion?: CameraEffect;
  position?: { x: number; y: number }; // % (0 - 100)
  size?: { width: number; height?: number }; // % (0 - 100)
  borderRadius?: number;
  border?: { width: number; color: string };
  shadow?: boolean;
}

/** Image layer: cutout, sticker, club badge, photo card */
export interface ImageLayer extends BaseSceneLayer {
  type: "image";
  imageUrl: string;
  alt?: string;
  position: { x: number; y: number }; // % (0 - 100)
  size: { width: number; height?: number }; // % (0 - 100)
  rotation?: number; // -45 to 45 deg
  borderRadius?: number;
  border?: { width: number; color: string };
  shadow?: boolean;
  opacity?: number;
  animation?: "pop_in" | "slide_up" | "slide_left" | "slide_right" | "fade_in" | "float" | "none";
  startOffsetMs?: number;
  durationMs?: number;
}

/** Text layer: headline box, quote, stat badge, neon tag */
export interface TextLayer extends BaseSceneLayer {
  type: "text";
  text: string;
  subtitle?: string;
  stylePreset?: "headline_box" | "neon_tag" | "quote_card" | "stat_badge" | "simple";
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: "bold" | "extra_bold" | "black";
  textAlign?: "left" | "center" | "right";
  position: { x: number; y: number }; // % (0 - 100)
  size?: { width?: number; maxWidth?: number };
  animation?: "pop_in" | "slide_up" | "slide_down" | "fade_in" | "scale_spring" | "none";
  startOffsetMs?: number;
  durationMs?: number;
}

/** A polymorphic scene layer */
export type SceneLayer = MediaLayer | ImageLayer | TextLayer;

/** A scene produced by AI breakdown and edited by the user. */
export interface Scene {
  id: string;
  projectId: string;
  sceneIndex: number;
  startMs: number;
  endMs: number;
  transcriptText: string;
  setting: string;
  characters: string[];
  imagePrompt: string;
  imageUrl: string | null;
  cameraEffect: CameraEffect;
  transition: Transition;
  showCaption: boolean;
  layoutType?: SceneLayoutType;
  layers?: SceneLayer[];
  playbackRate?: number;
  autoFitSpeed?: boolean;
  sourceDurationSec?: number;
  calloutTag?: string;
  calloutText?: string;
  calloutPosition?: "top_center" | "top_left" | "top_right";
  calloutTheme?: "dark" | "light" | "glass";
}

/** A storytelling project. */
export interface Project {
  id: string;
  title: string;
  rawScript: string;
  audioUrl: string | null;
  captionSrtUrl: string | null;
  captionVttUrl: string | null;
  durationMs: number;
  aspectRatio: AspectRatio;
  videoType?: string;
  status: ProjectStatus;
  errorMessage: string | null;
  characters: Character[];
  words: CaptionWord[];
  scenes: Scene[];
  createdAt: string;
}

/** Input props for the Remotion composition. */
export type StoryVideoProps = {
  audioUrl: string | null;
  durationMs: number;
  aspectRatio: AspectRatio;
  words: CaptionWord[];
  scenes: Scene[];
};

/** Configuration for a Football Broadcast Short (Bản tin truyền hình / Người Đá Bóng style). */
export interface FootballBroadcastConfig {
  templateId?: "broadcast_stripes" | "vtv_news_template";
  backgroundColor: string;
  backgroundTheme: "navy" | "crimson";
  backgroundScrollSpeed: number;
  mediaAspectRatio: MediaAspectRatio;
  showFrameBorders: boolean;
  frameBorderColor: string;
  showTicker: boolean;
  tickerText: string;
  tickerSocialText: string;
  dateText: string;
  categoryText: string;
  categoryColor: string;
  headlines: string[];
  headlineColor: string;
  headlineFontSize: number;
  watermarkLogoUrl: string;
  watermarkText: string;
  bgmUrl: string;
  bgmVolume: number;
  enableTransitionSfx: boolean;
  sfxBaseUrl: string;
  enableFlashOnTransition: boolean;
  showCaptions: boolean;
  backgroundTileUrl: string;
  backgroundVideoUrl?: string;
  backgroundVideoOpacity?: number;
  cardStyle?: "liquid_glass" | "solid" | "bordered";
  hashtags?: string[];
}

/** Input props for the Football Broadcast Short Remotion composition. */
export type FootballVideoProps = {
  audioUrl: string | null;
  durationMs: number;
  words: CaptionWord[];
  scenes: Scene[];
  config: FootballBroadcastConfig;
};
