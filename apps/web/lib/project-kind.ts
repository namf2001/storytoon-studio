import { FolderKanban, ShoppingBag, Trophy, type LucideIcon } from "lucide-react";
import type { ProjectSummary } from "@/lib/api";

export type ProjectKind = "storytoon" | "football" | "product";

export interface ProjectKindMeta {
  kind: ProjectKind;
  label: string;
  icon: LucideIcon;
  /** Tailwind text color for the kind's icon / accent. */
  tone: string;
  /** Tailwind classes for a subtle tinted chip. */
  chip: string;
}

export const PROJECT_KINDS: Record<ProjectKind, ProjectKindMeta> = {
  storytoon: {
    kind: "storytoon",
    label: "Storytoon 2D",
    icon: FolderKanban,
    tone: "text-primary",
    chip: "bg-primary/15 text-primary",
  },
  football: {
    kind: "football",
    label: "Football Shorts",
    icon: Trophy,
    tone: "text-amber-400",
    chip: "bg-amber-500/15 text-amber-400",
  },
  product: {
    kind: "product",
    label: "Video Sản Phẩm",
    icon: ShoppingBag,
    tone: "text-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-400",
  },
};

/**
 * Single rule for classifying a project. Legacy rows without `videoType`
 * fall back on aspect ratio (9:16 used to mean Football).
 */
export function projectKind(p: Pick<ProjectSummary, "videoType" | "aspectRatio">): ProjectKind {
  if (p.videoType === "product") return "product";
  if (p.videoType === "football") return "football";
  if (p.videoType === "storytoon") return "storytoon";
  return p.aspectRatio === "9:16" ? "football" : "storytoon";
}

export function projectHref(p: Pick<ProjectSummary, "id" | "videoType" | "aspectRatio">): string {
  switch (projectKind(p)) {
    case "product":
      return `/product?id=${p.id}`;
    case "football":
      return `/football?id=${p.id}`;
    default:
      return `/projects/${p.id}`;
  }
}
