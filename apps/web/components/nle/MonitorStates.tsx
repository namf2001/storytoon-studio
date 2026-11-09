"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Shared loading / buffering / error states for every Remotion Program Monitor,
 * so the viewer never sits on an unexplained black frame.
 */

export function MonitorBootPlaceholder({
  style,
  label = "Đang khởi động Program Monitor…",
}: {
  style: CSSProperties;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={style}
      className="flex flex-col items-center justify-center gap-2 text-xs text-zinc-400"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary-text" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/** `renderLoading` — shown while the composition itself is still loading. */
export function renderMonitorLoading(): ReactNode {
  return (
    <div
      role="status"
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-xs text-zinc-300"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary-text" aria-hidden />
      <span>Đang tải khung dựng…</span>
    </div>
  );
}

/** `renderPoster` — overlay while video/audio media is buffering. */
export function renderMonitorBufferingPoster({ isBuffering }: { isBuffering: boolean }): ReactNode {
  if (!isBuffering) return null;
  return (
    <div
      role="status"
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-xs text-zinc-200 backdrop-blur-[1px]"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary-text" aria-hidden />
      <span>Đang tải media…</span>
    </div>
  );
}

/** `errorFallback` — the composition threw while rendering. */
export function renderMonitorError({ error }: { error: Error }): ReactNode {
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#120b0b] p-4 text-center text-xs text-red-300"
    >
      <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden />
      <span className="font-semibold">Không thể dựng bản xem trước</span>
      <span className="line-clamp-3 max-w-[90%] font-mono text-xs text-red-300/80">
        {error.message}
      </span>
    </div>
  );
}

/** Props to spread onto every `<Player>` used as a Program Monitor. */
export const monitorPlayerStateProps = {
  renderLoading: renderMonitorLoading,
  renderPoster: renderMonitorBufferingPoster,
  showPosterWhenBuffering: true,
  showPosterWhenBufferingAndPaused: true,
  errorFallback: renderMonitorError,
} as const;
