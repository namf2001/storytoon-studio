"use client";

import React, { useRef, useState } from "react";
import {
  STICKMAN_VIEWBOX,
  StickmanFigure,
  type RigPoint,
  type StickmanRig,
} from "@storytoon/video-engine";
import { PARTS, partById, type PartId, type RigHandle } from "./parts";

export interface EditorCanvasProps {
  rig: StickmanRig;
  selectedPart: PartId;
  showAllHandles: boolean;
  showGrid: boolean;
  onSelectPart: (part: PartId) => void;
  onDragStart: () => void;
  onChange: (next: StickmanRig) => void;
}

/**
 * EditorCanvas renders the stickman in its resting calibration pose with a coordinate grid,
 * helper guides, and draggable vector handles (inspired by mesh-avatar-studio's EditorCanvas).
 */
export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  rig,
  selectedPart,
  showAllHandles,
  showGrid,
  onSelectPart,
  onDragStart,
  onChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<{ part: PartId; handle: RigHandle } | null>(null);
  const [hoverHandle, setHoverHandle] = useState<string | null>(null);
  const [cursor, setCursor] = useState<RigPoint | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const toSvgPoint = (clientX: number, clientY: number): RigPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(-20, Math.min(180, transformed.x)),
      y: Math.max(-20, Math.min(240, transformed.y)),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toSvgPoint(e.clientX, e.clientY);
    setCursor({ x: Math.round(pt.x * 2) / 2, y: Math.round(pt.y * 2) / 2 });
    if (!dragging) return;
    const next = dragging.handle.set(rig, pt);
    onChange(next);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragging(null);
    }
  };

  const activePart = partById(selectedPart);

  // Compute zoom viewBox centered around the active part or full canvas
  const getZoomedViewBox = () => {
    if (zoom <= 1) {
      return `${STICKMAN_VIEWBOX.x} ${STICKMAN_VIEWBOX.y} ${STICKMAN_VIEWBOX.width} ${STICKMAN_VIEWBOX.height}`;
    }
    let cx = 80;
    let cy = 110;
    if (selectedPart === "head" || selectedPart === "eyes" || selectedPart === "brows" || selectedPart === "mouth" || selectedPart === "hair") {
      cx = rig.head.cx;
      cy = rig.head.cy;
    } else if (selectedPart === "leftArm") {
      cx = rig.arms.left.elbow.x;
      cy = rig.arms.left.elbow.y;
    } else if (selectedPart === "rightArm") {
      cx = rig.arms.right.elbow.x;
      cy = rig.arms.right.elbow.y;
    } else if (selectedPart === "body") {
      cx = rig.body.cx ?? ((rig.body.footLeft?.x ?? 38) + (rig.body.footRight?.x ?? 122)) / 2;
      cy = (rig.body.bottomY ?? 210) - (rig.body.ry ?? 104) / 2;
    }
    const w = STICKMAN_VIEWBOX.width / zoom;
    const h = STICKMAN_VIEWBOX.height / zoom;
    const x = Math.max(-10, Math.min(STICKMAN_VIEWBOX.width - w + 10, cx - w / 2));
    const y = Math.max(-10, Math.min(STICKMAN_VIEWBOX.height - h + 10, cy - h / 2));
    return `${x} ${y} ${w} ${h}`;
  };

  const visibleParts = showAllHandles ? PARTS : [activePart];

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Top Overlay Toolbar */}
      <div className="mb-2 flex w-full items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: activePart.color }}
          />
          <span className="font-semibold text-foreground">{activePart.label}</span>
          <span className="hidden sm:inline text-zinc-400">— {activePart.hint}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 1.6, 2.2].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] border transition-colors ${
                zoom === z
                  ? "border-primary bg-primary/20 text-primary font-bold"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Rigging Surface */}
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#f8fafc] shadow-inner flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox={getZoomedViewBox()}
          className="h-[420px] w-full max-w-[340px] touch-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setCursor(null)}
        >
          {/* Coordinate Grid */}
          {showGrid && (
            <g className="pointer-events-none">
              <defs>
                <pattern id="rig-grid-10" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                <pattern id="rig-grid-40" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="url(#rig-grid-10)" />
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.9" />
                </pattern>
              </defs>
              <rect x="-20" y="-20" width="200" height="260" fill="url(#rig-grid-40)" />
              {/* Center vertical axis */}
              <line
                x1="80"
                y1="0"
                x2="80"
                y2="220"
                stroke="#94a3b8"
                strokeWidth="0.6"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Character in Neutral Rest Pose (for accurate handle placement) */}
          <StickmanFigure
            rig={rig}
            mood="neutral"
            armPose="idle"
            bouncy={false}
            autoBlink={false}
            isSpeaking={false}
          />

          {/* Structural Wireframe Guides for Selected Part */}
          <g className="pointer-events-none">
            {selectedPart === "head" && (
              <circle
                cx={rig.head.cx}
                cy={rig.head.cy}
                r={rig.head.r}
                fill="none"
                stroke={activePart.color}
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
            )}

            {selectedPart === "mouth" && (
              <rect
                x={rig.mouth.cx - rig.mouth.width / 2}
                y={rig.mouth.cy - rig.mouth.openHeight / 2}
                width={rig.mouth.width}
                height={rig.mouth.openHeight}
                fill={activePart.color}
                fillOpacity="0.1"
                stroke={activePart.color}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {(selectedPart === "leftArm" || showAllHandles) && (
              <polyline
                points={`${rig.arms.left.shoulder.x},${rig.arms.left.shoulder.y} ${rig.arms.left.elbow.x},${rig.arms.left.elbow.y} ${rig.arms.left.hand.x},${rig.arms.left.hand.y}`}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {(selectedPart === "rightArm" || showAllHandles) && (
              <polyline
                points={`${rig.arms.right.shoulder.x},${rig.arms.right.shoulder.y} ${rig.arms.right.elbow.x},${rig.arms.right.elbow.y} ${rig.arms.right.hand.x},${rig.arms.right.hand.y}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {selectedPart === "body" && (
              <g>
                <line
                  x1={(rig.body.cx ?? 80) - (rig.body.rx ?? 42)}
                  y1={rig.body.bottomY ?? 210}
                  x2={(rig.body.cx ?? 80) + (rig.body.rx ?? 42)}
                  y2={rig.body.bottomY ?? 210}
                  stroke={activePart.color}
                  strokeWidth="1.2"
                />
                <path
                  d={`M ${(rig.body.cx ?? 80) - (rig.body.rx ?? 42)} ${rig.body.bottomY ?? 210} A ${rig.body.rx ?? 42} ${rig.body.ry ?? 104} 0 0 1 ${(rig.body.cx ?? 80) + (rig.body.rx ?? 42)} ${rig.body.bottomY ?? 210} Z`}
                  fill={activePart.color}
                  fillOpacity="0.08"
                  stroke={activePart.color}
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
                <line
                  x1={rig.body.cx ?? 80}
                  y1={rig.body.bottomY ?? 210}
                  x2={rig.body.cx ?? 80}
                  y2={(rig.body.bottomY ?? 210) - (rig.body.ry ?? 104)}
                  stroke={activePart.color}
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
              </g>
            )}
          </g>

          {/* Draggable Handles */}
          {visibleParts.map((part) => {
            const isSelected = part.id === selectedPart;
            return (
              <g key={part.id}>
                {part.handles.map((h) => {
                  const pt = h.get(rig);
                  const isHovered = hoverHandle === h.id || dragging?.handle.id === h.id;
                  const r = (isSelected ? 4.2 : 3.2) / Math.sqrt(zoom);

                  return (
                    <g
                      key={h.id}
                      transform={`translate(${pt.x}, ${pt.y})`}
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                        if (!isSelected) onSelectPart(part.id);
                        onDragStart();
                        setDragging({ part: part.id, handle: h });
                      }}
                      onPointerEnter={() => setHoverHandle(h.id)}
                      onPointerLeave={() => setHoverHandle(null)}
                    >
                      {/* Invisible larger hit target */}
                      <circle r={9 / Math.sqrt(zoom)} fill="transparent" />

                      {h.kind === "size" ? (
                        <rect
                          x={-r}
                          y={-r}
                          width={r * 2}
                          height={r * 2}
                          fill="#ffffff"
                          stroke={part.color}
                          strokeWidth={1.8 / Math.sqrt(zoom)}
                        />
                      ) : (
                        <circle
                          r={r}
                          fill={part.color}
                          stroke="#ffffff"
                          strokeWidth={1.6 / Math.sqrt(zoom)}
                        />
                      )}

                      {isHovered && (
                        <g transform={`translate(0, ${-7 / Math.sqrt(zoom)})`}>
                          <rect
                            x={-28 / Math.sqrt(zoom)}
                            y={-12 / Math.sqrt(zoom)}
                            width={56 / Math.sqrt(zoom)}
                            height={11 / Math.sqrt(zoom)}
                            rx={2 / Math.sqrt(zoom)}
                            fill="#09090b"
                            opacity="0.88"
                          />
                          <text
                            textAnchor="middle"
                            y={-4 / Math.sqrt(zoom)}
                            fill="#ffffff"
                            fontSize={6.5 / Math.sqrt(zoom)}
                            fontFamily="monospace"
                          >
                            {h.label} ({pt.x},{pt.y})
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Bottom-left coordinate HUD */}
        <div className="pointer-events-none absolute bottom-2 left-2.5 flex items-center gap-2 rounded bg-zinc-900/85 px-2 py-0.5 font-mono text-[10px] text-zinc-200 shadow">
          <span>viewBox: 160×220</span>
          {cursor && (
            <span className="text-emerald-400">
              x={cursor.x} y={cursor.y}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
