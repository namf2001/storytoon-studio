"use client";

import * as React from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Pipette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STUDIO_SWATCHES = [
  "#ffffff",
  "#facc15",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#22c55e",
  "#18181b",
  "#000000",
];

interface ColorPickerPopoverProps {
  color: string;
  onChange: (nextColor: string) => void;
  label?: string;
  presets?: string[];
  className?: string;
  compact?: boolean;
}

/**
 * Studio-grade Color Picker Popover powered by `react-colorful` + Radix Popover.
 * Replaces native `<input type="color">` across NleInspector and StickmanStudio.
 */
export function ColorPickerPopover({
  color,
  onChange,
  label,
  presets = STUDIO_SWATCHES,
  className,
  compact = false,
}: ColorPickerPopoverProps) {
  const safeHex = React.useMemo(() => {
    if (!color) return "#ffffff";
    if (/^#[0-9a-fA-F]{3,8}$/.test(color.trim())) return color.trim();
    return "#ffffff";
  }, [color]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-2 rounded-md border border-zinc-700/80 bg-zinc-900/90 px-2 py-1 text-[11px] font-medium text-zinc-200 shadow-sm transition-colors hover:border-amber-400/60 hover:bg-zinc-800/90",
            compact && "px-1.5 py-0.5",
            className
          )}
          title={label ? `Chọn màu: ${label}` : "Chọn màu"}
        >
          <span
            className="h-4 w-4 shrink-0 rounded border border-white/20 shadow-inner"
            style={{ backgroundColor: safeHex }}
          />
          {!compact && (
            <span className="font-mono text-[10px] uppercase text-zinc-300">
              {safeHex}
            </span>
          )}
          {label && (
            <span className="truncate text-[10px] text-zinc-400 group-hover:text-zinc-200">
              {label}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-3 border-zinc-800 bg-surface-3 p-3 shadow-2xl" align="end">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200">
            <Pipette className="h-3.5 w-3.5 text-amber-400" />
            {label || "Bảng màu Studio"}
          </span>
          <span className="font-mono text-[10px] uppercase text-amber-400">
            {safeHex}
          </span>
        </div>

        <div className="custom-color-picker [&_.react-colorful]:!h-36 [&_.react-colorful]:!w-full [&_.react-colorful__saturation]:!rounded-t-lg [&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!rounded-b-lg">
          <HexColorPicker color={safeHex} onChange={onChange} />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400">HEX</span>
          <div className="flex flex-1 items-center rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-mono text-zinc-100 focus-within:border-amber-400">
            <span className="mr-1 text-zinc-500">#</span>
            <HexColorInput
              color={safeHex}
              onChange={onChange}
              prefixed={false}
              className="w-full bg-transparent uppercase outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-zinc-400">Màu dùng nhanh</div>
          <div className="grid grid-cols-6 gap-1.5">
            {presets.map((sw) => (
              <button
                key={sw}
                type="button"
                onClick={() => onChange(sw)}
                className={cn(
                  "h-5 w-full rounded border transition-transform hover:scale-110",
                  safeHex.toLowerCase() === sw.toLowerCase()
                    ? "border-amber-400 ring-1 ring-amber-400"
                    : "border-white/15"
                )}
                style={{ backgroundColor: sw }}
                title={sw}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
