"use client";

import React from "react";
import { RotateCcw, Sliders, Palette, Activity } from "lucide-react";
import type { StickmanRig } from "@storytoon/video-engine";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ColorPickerPopover } from "@/components/ui/color-picker";
import { getPath, partById, setPath, type PartId, type RigField } from "./parts";

export interface RigFieldEditorProps {
  rig: StickmanRig;
  selectedPart: PartId;
  onChange: (next: StickmanRig) => void;
  onResetPart: () => void;
}

const MOUTH_SPRITES = [
  { id: "rest", name: "rest (Đóng)", hint: "Đường ngang ngậm miệng" },
  { id: "A", name: "A (Há to)", hint: "Lòng sâu, lộ răng & lưỡi" },
  { id: "I", name: "I (Bè răng)", hint: "Bè ngang răng đối xứng" },
  { id: "U", name: "U (Chúm tròn)", hint: "Môi tròn nhỏ chúm lại" },
  { id: "E", name: "E (Mở vừa)", hint: "Hở hai hàm răng" },
  { id: "O", name: "O (Tròn dọc)", hint: "Hình bầu dục đứng" },
  { id: "smile", name: "smile (Cười)", hint: "Nụ cười cong tươi tắn" },
  { id: "frown", name: "frown (Buồn)", hint: "Miệng xịu thất vọng" },
  { id: "smirk", name: "smirk (Nhếch)", hint: "Cười lệch mép phán xét" },
  { id: "surprised", name: "surprised (Sốc)", hint: "Há hốc kinh ngạc" },
];

/**
 * RigFieldEditor renders the numeric, color and boolean form controls for the currently
 * selected part (equivalent to mesh-avatar-studio's RigFields panel).
 */
export const RigFieldEditor: React.FC<RigFieldEditorProps> = ({
  rig,
  selectedPart,
  onChange,
  onResetPart,
}) => {
  const part = partById(selectedPart);

  const handleNumberChange = (field: RigField, value: number) => {
    if (Number.isNaN(value)) return;
    let clamped = value;
    if (field.min !== undefined) clamped = Math.max(field.min, clamped);
    if (field.max !== undefined) clamped = Math.min(field.max, clamped);
    onChange(setPath(rig, field.path, clamped));
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header with part color pill and Reset button */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: part.color }}
          />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            {part.label}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            ({part.fields.length} thông số)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetPart}
          className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white"
          title="Khôi phục thông số phần này về mặc định"
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Mặc định
        </Button>
      </div>

      {/* Field List */}
      <div className="space-y-3 overflow-y-auto pr-1 text-xs">
        {part.fields.map((field) => {
          const val = getPath(rig, field.path);

          if (field.type === "boolean") {
            const checked = Boolean(val);
            return (
              <div
                key={field.path}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5"
              >
                <Label htmlFor={field.path} className="text-xs font-medium cursor-pointer">
                  {field.label}
                </Label>
                <Switch
                  id={field.path}
                  checked={checked}
                  onCheckedChange={(c) => onChange(setPath(rig, field.path, c))}
                />
              </div>
            );
          }

          if (field.type === "color") {
            const colorVal = typeof val === "string" ? val : "#000000";
            return (
              <div
                key={field.path}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-amber-400" />
                  <Label htmlFor={field.path} className="text-xs font-medium">
                    {field.label}
                  </Label>
                </div>
                <ColorPickerPopover
                  color={colorVal}
                  onChange={(nextColor) =>
                    onChange(setPath(rig, field.path, nextColor))
                  }
                  label={field.label}
                />
              </div>
            );
          }

          // Number field
          const numVal = typeof val === "number" ? val : 0;
          const min = field.min ?? -50;
          const max = field.max ?? 200;
          const step = field.step ?? 1;

          return (
            <div
              key={field.path}
              className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2.5"
            >
              <div className="flex items-center justify-between">
                <Label htmlFor={field.path} className="text-[11px] font-medium text-zinc-300">
                  {field.label}
                </Label>
                <Input
                  id={field.path}
                  type="number"
                  value={numVal}
                  step={step}
                  min={field.min}
                  max={field.max}
                  onChange={(e) => handleNumberChange(field, parseFloat(e.target.value))}
                  className="h-6 w-16 px-1.5 py-0 text-right font-mono text-[11px] bg-zinc-950 border-zinc-800"
                />
              </div>

              {/* Radix Slider for smooth visual tuning */}
              <Slider
                value={[numVal]}
                min={min}
                max={max}
                step={step}
                onValueChange={(vals) => {
                  if (vals[0] !== undefined) handleNumberChange(field, vals[0]);
                }}
              />
            </div>
          );
        })}

        {/* Dedicated PNG Mouth Sprite Assets Gallery */}
        {selectedPart === "mouth" && (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">
                Thư viện ảnh khẩu hình miệng (PNG)
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                Ảnh PNG thực tế
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Các khẩu hình được render từ ảnh PNG trong suốt (không vẽ code vector), đồng bộ tự động với chữ trong Whisper và biểu cảm nhân vật.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {MOUTH_SPRITES.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="h-9 w-9 shrink-0 rounded-md border border-zinc-800 bg-white/5 flex items-center justify-center p-1">
                    <img
                      src={`/stickman/mouth/${m.id}.png`}
                      alt={m.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-zinc-200 truncate">{m.name}</span>
                    <span className="text-[9px] text-zinc-400 truncate">{m.hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
