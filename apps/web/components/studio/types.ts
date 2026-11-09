import type { ComponentProps, ReactNode, Ref } from "react";
import type { PlayerRef } from "@remotion/player";
import type { MediaAspectRatio, Project } from "@storytoon/shared-types";
import type { MediaPoolClip } from "@/components/nle/NleMediaPool";
import type { NleInspector } from "@/components/nle/NleInspector";
import type { RenderAndYoutubePanel } from "@/components/RenderAndYoutubePanel";
import type { TimelineAudioMix } from "@/components/nle/NleTimeline";
import type { ProjectKind } from "@/lib/project-kind";

export type StudioAccent = "emerald" | "amber";

export interface StudioPreset {
  /** Project id used in `?id=` and in the project selector. */
  id: string;
  /** Label shown in the project selector. */
  label: string;
  project: Project;
  /** Scene to select after loading (defaults to the first). */
  initialSceneId?: string;
  /** Extra side effects when the preset is loaded (e.g. apply a broadcast template). */
  onLoad?: () => void;
  /** Loadable by id but not listed in the selector (e.g. a DB project overridden by demo data). */
  hidden?: boolean;
}

export interface StudioDeliverConfig {
  compositionId: ComponentProps<typeof RenderAndYoutubePanel>["compositionId"];
  inputProps: Record<string, unknown>;
  defaultTitle: string;
  /** One-line description under the Deliver heading. */
  summary: ReactNode;
  /** Rows for the "Thông số render" card. */
  specs: [label: string, value: ReactNode][];
  /** Remotion props shown in the copyable JSON block. */
  configJson: unknown;
}

/**
 * Everything that differs between studios (Product, Football…). The shared
 * `NleStudio` owns all editing state; a variant only supplies data and the
 * few extra controls/renderers its video type needs.
 */
export interface StudioVariant {
  kind: Extract<ProjectKind, "product" | "football">;
  /** Route of the studio, e.g. "/product". */
  path: string;
  accent: StudioAccent;
  defaultVoice: string;
  defaultProjectTitle: string;
  presets: StudioPreset[];
  /** Preset opened when the URL names no project. */
  defaultPresetId: string;
  extractMediaClips: (p: Project) => MediaPoolClip[];
  mediaPool: { titlePlaceholder: string; scriptPlaceholder: string };
  /** B-roll crop frame used by the scene viewer / inspector. */
  frameAspectRatio: MediaAspectRatio;
  /** Show the crop frame overlay in the scene viewer on open. */
  showCropFrameByDefault: boolean;
  bgm: { url: string; volume: number };
  /** Program monitor player for this video type. */
  renderPlayer: (args: { ref: Ref<PlayerRef>; project: Project; mix?: TimelineAudioMix }) => ReactNode;
  /** Extra header controls (right side, before the panel toggles). */
  headerExtras?: ReactNode;
  /** Extra props for the inspector (e.g. football template tabs). */
  inspectorProps?: Partial<ComponentProps<typeof NleInspector>>;
  deliver: (project: Project, mix: TimelineAudioMix | null, voice: string) => StudioDeliverConfig;
}
