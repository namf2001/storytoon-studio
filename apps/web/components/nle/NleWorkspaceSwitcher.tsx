"use client";

import { Rocket, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

export type NleWorkspaceMode = "edit" | "deliver";

/**
 * Edit / Deliver switch shared by every NLE studio so the wording and
 * behaviour stay identical across Storytoon, Football and Product.
 */
export function NleWorkspaceSwitcher({
  mode,
  onChange,
  accent = "amber",
}: {
  mode: NleWorkspaceMode;
  onChange: (mode: NleWorkspaceMode) => void;
  /** Brand accent of the studio for the active "Biên tập" tab. */
  accent?: "amber" | "emerald";
}) {
  const tabs: { id: NleWorkspaceMode; label: string; icon: typeof Sliders; active: string }[] = [
    {
      id: "edit",
      label: "Biên tập",
      icon: Sliders,
      active: accent === "emerald" ? "bg-emerald-500 text-black" : "bg-amber-500 text-black",
    },
    { id: "deliver", label: "Xuất video", icon: Rocket, active: "bg-red-600 text-white" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Chế độ làm việc"
      className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950/90 p-0.5"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const selected = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
              selected ? cn(t.active, "shadow-sm") : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
