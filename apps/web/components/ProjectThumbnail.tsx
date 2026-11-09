"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/**
 * Small preview of a project's first scene. Handles both still images and
 * video clips (shows a frame near the start), and falls back to an icon.
 */
export function ProjectThumbnail({
  url,
  className,
}: {
  url?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const clean = url ? url.split("#")[0] : "";
  const isVideo = VIDEO_EXT.test(clean.split("?")[0]);

  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-muted/60 ring-1 ring-border",
        className
      )}
    >
      {!clean || failed ? (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
          <Film className="h-5 w-5" />
        </div>
      ) : isVideo ? (
        <video
          src={`${clean}#t=0.5`}
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clean}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
