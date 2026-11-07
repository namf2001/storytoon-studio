"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Covers the NLE workspace (below the 48px header) while a project is fetched,
 * so the previous / demo project is never shown in place of the requested one.
 */
export function ProjectLoadingOverlay({ label = "Đang tải dự án…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="absolute inset-x-0 bottom-0 top-12 z-40 flex flex-col gap-2 bg-surface-1 p-2"
    >
      <div className="flex min-h-0 flex-1 gap-2">
        <Skeleton className="hidden w-[22%] rounded-lg bg-zinc-900 md:block" />
        <div className="relative flex flex-1 items-center justify-center rounded-lg bg-zinc-900/70">
          <div className="flex flex-col items-center gap-2 text-sm text-zinc-300">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" aria-hidden />
            <span>{label}</span>
          </div>
        </div>
        <Skeleton className="hidden w-[22%] rounded-lg bg-zinc-900 lg:block" />
      </div>
      <div className="flex h-[34%] flex-col gap-1.5 rounded-lg bg-zinc-900/70 p-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 rounded bg-zinc-800/70" />
        ))}
      </div>
    </div>
  );
}
