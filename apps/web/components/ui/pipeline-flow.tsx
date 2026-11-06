"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Clapperboard,
  FileText,
  Mic,
  Sparkles,
  Subtitles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineNodeData extends Record<string, unknown> {
  step: string;
  title: string;
  subtitle: string;
  badge: string;
  accent: "amber" | "cyan" | "emerald" | "purple" | "rose";
  active?: boolean;
}

const ACCENT_MAP: Record<
  PipelineNodeData["accent"],
  { border: string; bg: string; text: string; dot: string }
> = {
  amber: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  cyan: {
    border: "border-cyan-500/40",
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    dot: "bg-cyan-400",
  },
  emerald: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  purple: {
    border: "border-purple-500/40",
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    dot: "bg-purple-400",
  },
  rose: {
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
};

function StudioStepNode({ data }: NodeProps<Node<PipelineNodeData>>) {
  const style = ACCENT_MAP[data.accent] ?? ACCENT_MAP.amber;
  return (
    <div
      className={cn(
        "w-48 rounded-xl border bg-[#121218]/95 px-3 py-2.5 shadow-lg backdrop-blur-xs transition-all",
        style.border,
        data.active && "ring-2 ring-amber-400/60 shadow-amber-500/10"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-zinc-700 !bg-zinc-400"
      />
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          {data.step}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
            style.bg,
            style.text
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
          {data.badge}
        </span>
      </div>
      <div className="mt-1 text-xs font-bold text-zinc-100">{data.title}</div>
      <div className="mt-0.5 truncate text-[10px] text-zinc-400">
        {data.subtitle}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-zinc-700 !bg-amber-400"
      />
    </div>
  );
}

const nodeTypes = { studioStep: StudioStepNode };

interface AiPipelineFlowProps {
  wordCount: number;
  selectedVoice: string;
  aspectRatio: string;
  busy?: boolean;
  className?: string;
}

/**
 * Interactive Node-based AI Workflow Visualizer powered by `@xyflow/react`.
 * Visualizes the 5-step Storytoon AI Worker pipeline in real time.
 */
export function AiPipelineFlow({
  wordCount,
  selectedVoice,
  aspectRatio,
  busy = false,
  className,
}: AiPipelineFlowProps) {
  const estDurationSec = Math.max(5, Math.round(wordCount / 2.8));
  const estScenes = Math.max(1, Math.ceil(estDurationSec / 6));

  const nodes: Node<PipelineNodeData>[] = useMemo(
    () => [
      {
        id: "script",
        type: "studioStep",
        position: { x: 10, y: 24 },
        data: {
          step: "BƯỚC 01",
          title: "Kịch bản đầu vào",
          subtitle:
            wordCount > 0
              ? `${wordCount} từ (~${estDurationSec}s thời lượng)`
              : "Đang chờ nhập nội dung...",
          badge: wordCount > 0 ? "Sẵn sàng" : "Trống",
          accent: "amber",
          active: wordCount > 0,
        },
      },
      {
        id: "tts",
        type: "studioStep",
        position: { x: 230, y: 24 },
        data: {
          step: "BƯỚC 02",
          title: "VieNeu-TTS Voice",
          subtitle: `Giọng đọc: ${selectedVoice}`,
          badge: busy ? "Đang đọc..." : "Local TTS",
          accent: "cyan",
          active: busy,
        },
      },
      {
        id: "whisper",
        type: "studioStep",
        position: { x: 450, y: 24 },
        data: {
          step: "BƯỚC 03",
          title: "Whisper Word-Sync",
          subtitle: "Tách phụ đề từng từ (ms)",
          badge: "faster-whisper",
          accent: "purple",
          active: busy,
        },
      },
      {
        id: "director",
        type: "studioStep",
        position: { x: 670, y: 24 },
        data: {
          step: "BƯỚC 04",
          title: "AI Chia Phân Cảnh",
          subtitle: `Dự kiến ~${estScenes} cảnh + Image Prompt`,
          badge: "Gemini AI",
          accent: "emerald",
          active: busy,
        },
      },
      {
        id: "remotion",
        type: "studioStep",
        position: { x: 890, y: 24 },
        data: {
          step: "BƯỚC 05",
          title: "Remotion NLE Studio",
          subtitle: `Khung hình ${aspectRatio} · 1080p MP4`,
          badge: aspectRatio,
          accent: "rose",
          active: false,
        },
      },
    ],
    [wordCount, estDurationSec, selectedVoice, busy, estScenes, aspectRatio]
  );

  const edges: Edge[] = useMemo(
    () => [
      {
        id: "e1-2",
        source: "script",
        target: "tts",
        animated: wordCount > 0 || busy,
        style: { stroke: "#f59e0b", strokeWidth: 1.5 },
      },
      {
        id: "e2-3",
        source: "tts",
        target: "whisper",
        animated: busy,
        style: { stroke: "#06b6d4", strokeWidth: 1.5 },
      },
      {
        id: "e3-4",
        source: "whisper",
        target: "director",
        animated: busy,
        style: { stroke: "#a855f7", strokeWidth: 1.5 },
      },
      {
        id: "e4-5",
        source: "director",
        target: "remotion",
        animated: busy,
        style: { stroke: "#10b981", strokeWidth: 1.5 },
      },
    ],
    [wordCount, busy]
  );

  return (
    <div
      className={cn(
        "relative h-32 w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-[#0c0c10]",
        className
      )}
    >
      <div className="pointer-events-none absolute left-3 top-2 z-10 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span>Sơ đồ Pipeline Sản Xuất Tự Động (React Flow)</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#27272a" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
