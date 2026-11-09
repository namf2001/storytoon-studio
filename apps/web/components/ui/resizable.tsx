"use client";

import { GripHorizontal, GripVertical } from "lucide-react";
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      className={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({ className, ...props }: PanelProps) {
  return <Panel className={cn("min-h-0 min-w-0", className)} {...props} />;
}

function ResizableHandle({
  withHandle,
  direction = "horizontal",
  className,
  ...props
}: SeparatorProps & {
  withHandle?: boolean;
  direction?: "horizontal" | "vertical";
}) {
  const isVerticalStack = direction === "vertical";

  return (
    <Separator
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-zinc-800/90 transition-colors hover:bg-primary/80 active:bg-primary focus-visible:outline-none z-30",
        isVerticalStack
          ? "h-2 w-full cursor-row-resize border-y border-zinc-800"
          : "w-1.5 h-full cursor-col-resize border-x border-zinc-800",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border border-zinc-600 bg-zinc-900 shadow-sm",
            isVerticalStack ? "h-2.5 w-8" : "h-7 w-3"
          )}
        >
          {isVerticalStack ? (
            <GripHorizontal className="h-2.5 w-3.5 text-zinc-300" />
          ) : (
            <GripVertical className="h-3 w-2.5 text-zinc-300" />
          )}
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
