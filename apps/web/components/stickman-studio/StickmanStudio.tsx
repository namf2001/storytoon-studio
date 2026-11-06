"use client";

import React, { useEffect, useState } from "react";
import {
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Grid,
} from "lucide-react";
import {
  DEFAULT_FEMALE_RIG,
  DEFAULT_MALE_RIG,
  STICKMAN_PRESETS,
  parseStickmanRig,
  type StickmanRig,
} from "@storytoon/video-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PARTS, partById, type PartId, setPath } from "./parts";
import { EditorCanvas } from "./EditorCanvas";
import { RigFieldEditor } from "./RigFieldEditor";
import { PoseAndLipSyncPreview } from "./PoseAndLipSyncPreview";
import {
  loadLibrary,
  saveLibrary,
  newId,
  useRigHistory,
  type SavedCharacter,
} from "./store";

export const StickmanStudio: React.FC = () => {
  const {
    rig,
    set: updateRig,
    checkpoint,
    reset: resetRig,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useRigHistory(DEFAULT_MALE_RIG);

  const [selectedPart, setSelectedPart] = useState<PartId>("head");
  const [showAllHandles, setShowAllHandles] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Character library
  const [library, setLibrary] = useState<SavedCharacter[]>([]);
  const [currentSavedId, setCurrentSavedId] = useState<string | null>(null);

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  const handleSelectPreset = (key: "male" | "female") => {
    checkpoint();
    resetRig(STICKMAN_PRESETS[key] ?? DEFAULT_MALE_RIG);
    setCurrentSavedId(null);
    toast.success(`Đã tải preset: ${STICKMAN_PRESETS[key].name}`);
  };

  const handleSaveToLibrary = () => {
    const id = currentSavedId ?? newId();
    const updated = [
      ...library.filter((c) => c.id !== id),
      { id, rig, updatedAt: Date.now() },
    ];
    setLibrary(updated);
    saveLibrary(updated);
    setCurrentSavedId(id);
    toast.success(`Đã lưu "${rig.name}" vào bộ sưu tập local!`);
  };

  const handleLoadSaved = (item: SavedCharacter) => {
    checkpoint();
    resetRig(item.rig);
    setCurrentSavedId(item.id);
    toast.success(`Đã mở: ${item.rig.name}`);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = library.filter((c) => c.id !== id);
    setLibrary(updated);
    saveLibrary(updated);
    if (currentSavedId === id) setCurrentSavedId(null);
    toast.info("Đã xoá nhân vật khỏi danh sách lưu");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const validRig = parseStickmanRig(parsed);
        checkpoint();
        resetRig(validRig);
        toast.success(`Đã import thành công: ${validRig.name}`);
      } catch (err) {
        toast.error("File JSON không hợp lệ!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetCurrentPart = () => {
    const defaultRig = rig.gender === "female" ? DEFAULT_FEMALE_RIG : DEFAULT_MALE_RIG;
    let next = structuredClone(rig);
    if (selectedPart === "head") next.head = structuredClone(defaultRig.head);
    else if (selectedPart === "hair") next.hair = structuredClone(defaultRig.hair);
    else if (selectedPart === "eyes") next.eyes = structuredClone(defaultRig.eyes);
    else if (selectedPart === "brows") next.brows = structuredClone(defaultRig.brows);
    else if (selectedPart === "mouth") next.mouth = structuredClone(defaultRig.mouth);
    else if (selectedPart === "body") next.body = structuredClone(defaultRig.body);
    else if (selectedPart === "leftArm") next.arms.left = structuredClone(defaultRig.arms.left);
    else if (selectedPart === "rightArm") next.arms.right = structuredClone(defaultRig.arms.right);
    else if (selectedPart === "style") next.style = structuredClone(defaultRig.style);
    else if (selectedPart === "motion") next.motion = structuredClone(defaultRig.motion);
    updateRig(next);
    toast.info(`Đã khôi phục phần "${partById(selectedPart).label}"`);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        {/* Preset & Name controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={rig.name}
            onChange={(e) => updateRig(setPath(rig, "name", e.target.value), false)}
            className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 font-bold text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
            title="Tên nhân vật"
          />

          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleSelectPreset("male")}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                rig.gender === "male"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Nam (Trọc)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("female")}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                rig.gender === "female"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Nữ (Búi tóc)
            </button>
          </div>

          {/* Library dropdown if any saved */}
          {library.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Đã lưu:</span>
              <div className="flex flex-wrap gap-1">
                {library.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLoadSaved(item)}
                    className={`group flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors ${
                      currentSavedId === item.id
                        ? "border-primary bg-primary/20 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>{item.rig.name}</span>
                    <span
                      onClick={(e) => handleDeleteSaved(item.id, e)}
                      className="ml-1 opacity-40 hover:opacity-100 text-red-400"
                      title="Xoá"
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Studio Tools & Actions */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUndo}
              onClick={undo}
              className="h-7 w-7 text-zinc-300 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canRedo}
              onClick={redo}
              className="h-7 w-7 text-zinc-300 disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Save to Local Library */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToLibrary}
            className="h-8 border-zinc-800 gap-1.5 text-xs text-foreground"
          >
            <Save className="h-3.5 w-3.5 text-primary" /> Lưu nhân vật
          </Button>

          {/* Import Rig JSON */}
          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
            <Upload className="h-3.5 w-3.5 text-primary" /> Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: PART LIST & NUMERIC FIELD EDITOR */}
        <div className="lg:col-span-3 space-y-3">
          {/* Part Selection Badges */}
          <Card className="border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Bộ phận (Parts)</span>
              <span className="font-mono text-zinc-500">10 nhóm</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {PARTS.map((p) => {
                const isSelected = p.id === selectedPart;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPart(p.id)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all ${
                      isSelected
                        ? "bg-zinc-800 text-white font-semibold ring-1 ring-primary/40 shadow"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Numeric / Color / Boolean Field Editor */}
          <Card className="border-zinc-800 bg-zinc-950/60 p-3 h-[380px] overflow-hidden flex flex-col">
            <RigFieldEditor
              rig={rig}
              selectedPart={selectedPart}
              onChange={(next) => updateRig(next, true)}
              onResetPart={handleResetCurrentPart}
            />
          </Card>
        </div>

        {/* CENTER COLUMN: INTERACTIVE CALIBRATION CANVAS */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-zinc-800 bg-zinc-950/60 p-3 space-y-3">
            {/* Canvas Options */}
            <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Vùng kéo thả (Editor Canvas)
              </span>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="show-all-handles"
                    checked={showAllHandles}
                    onCheckedChange={setShowAllHandles}
                  />
                  <Label htmlFor="show-all-handles" className="text-[11px] text-zinc-400 cursor-pointer">
                    Hiện hết điểm
                  </Label>
                </div>

                <div className="flex items-center gap-1.5">
                  <Switch
                    id="show-grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                  <Label htmlFor="show-grid" className="text-[11px] text-zinc-400 cursor-pointer">
                    Lưới
                  </Label>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <EditorCanvas
              rig={rig}
              selectedPart={selectedPart}
              showAllHandles={showAllHandles}
              showGrid={showGrid}
              onSelectPart={setSelectedPart}
              onDragStart={checkpoint}
              onChange={(next) => updateRig(next, false)}
            />
          </Card>
        </div>

        {/* RIGHT COLUMN: LIVE MOTION, POSE & LIP-SYNC PREVIEW */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-zinc-800 bg-zinc-950/60 p-3">
            <PoseAndLipSyncPreview rig={rig} />
          </Card>
        </div>
      </div>
    </div>
  );
};
