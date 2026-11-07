"use client";

import React from "react";
import { ChevronRight, Clapperboard, FileText, Mic, Subtitles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  done?: boolean;
  active?: boolean;
}

interface AiPipelineFlowProps {
  wordCount: number;
  selectedVoice: string;
  aspectRatio: string;
  /** Scene-splitting model as reported by the AI worker (/health). */
  sceneModel: string;
  whisperModel?: string;
  busy?: boolean;
  className?: string;
}

/**
 * Compact 5-step strip of the production pipeline. Wraps to a vertical list on
 * small screens; the model names come from the worker so they never drift.
 */
export function AiPipelineFlow({
  wordCount,
  selectedVoice,
  aspectRatio,
  sceneModel,
  whisperModel,
  busy = false,
  className,
}: AiPipelineFlowProps) {
  const estDurationSec = Math.max(5, Math.round(wordCount / 2.8));
  const estScenes = Math.max(1, Math.ceil(estDurationSec / 6));
  const hasScript = wordCount > 0;

  const steps: Step[] = [
    {
      title: "Kịch bản",
      detail: hasScript ? `${wordCount} từ · ~${estDurationSec}s` : "Chưa nhập",
      icon: FileText,
      done: hasScript,
    },
    { title: "Giọng đọc", detail: selectedVoice, icon: Mic, active: busy },
    {
      title: "Phụ đề từng từ",
      detail: whisperModel ? `Whisper ${whisperModel}` : "Whisper",
      icon: Subtitles,
      active: busy,
    },
    {
      title: "Chia phân cảnh",
      detail: hasScript ? `~${estScenes} cảnh · ${sceneModel}` : sceneModel,
      icon: Wand2,
      active: busy,
    },
    { title: "Dựng video", detail: `${aspectRatio} · 1080p MP4`, icon: Clapperboard },
  ];

  return (
    <ol
      aria-label="Các bước tạo video"
      className={cn(
        // Ẩn trên điện thoại để form tạo dự án nằm gần đầu trang
        "hidden gap-1.5 rounded-xl border border-border bg-card p-2 sm:flex sm:flex-row sm:items-stretch",
        className
      )}
    >
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.title} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2",
                s.active ? "bg-primary/10 ring-1 ring-primary/40" : "bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  s.done || s.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
                aria-hidden
              >
                <Icon className={cn("h-3.5 w-3.5", s.active && "animate-pulse")} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">
                  {i + 1}. {s.title}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground" title={s.detail}>
                  {s.detail}
                </span>
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight
                className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/60 sm:block"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
