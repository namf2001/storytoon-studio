"use client";

import React, { useEffect, useState } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Code2,
  Smile,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  StickmanFigure,
  STICKMAN_VIEWBOX,
  visemeForTime,
  type StickmanRig,
  type StickmanViseme,
  type StickmanMood,
  type StickmanArmPose,
  type StickmanMouthShape,
} from "@storytoon/video-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CaptionWord } from "@storytoon/shared-types";

export interface PoseAndLipSyncPreviewProps {
  rig: StickmanRig;
}

export const PoseAndLipSyncPreview: React.FC<PoseAndLipSyncPreviewProps> = ({ rig }) => {
  const [tick, setTick] = useState(0);
  const [bg, setBg] = useState<"white" | "stage" | "dark">("white");

  // Pose Test parameters
  const [headTurn, setHeadTurn] = useState(0);
  const [headTilt, setHeadTilt] = useState(0);
  const [bodyLean, setBodyLean] = useState(0);
  const [gazeX, setGazeX] = useState(0);
  const [gazeY, setGazeY] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [autoBlink, setAutoBlink] = useState(true);
  const [bouncy, setBouncy] = useState(true);
  const [flip, setFlip] = useState(false);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [mood, setMood] = useState<StickmanMood>("side_eye");
  const [armPose, setArmPose] = useState<StickmanArmPose>("hip");

  // Lip-sync / Speaking parameters
  const [manualViseme, setManualViseme] = useState<StickmanMouthShape | null>(null);
  const [isSpeakingSim, setIsSpeakingSim] = useState(false);
  const [sentence, setSentence] = useState("Xin chào các bạn đang theo dõi câu chuyện này nhé!");
  const [copied, setCopied] = useState(false);

  // 60fps animation ticker
  useEffect(() => {
    let animId: number;
    let frame = 0;
    const loop = () => {
      frame++;
      setTick(frame);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Generate synthetic Whisper words from sentence text
  const words: CaptionWord[] = React.useMemo(() => {
    const tokens = sentence.trim().split(/\s+/).filter(Boolean);
    let ms = 0;
    return tokens.map((token) => {
      const dur = Math.max(220, token.length * 90);
      const startMs = ms;
      const endMs = startMs + dur;
      ms = endMs + 80; // brief gap between words
      return { text: token, startMs, endMs };
    });
  }, [sentence]);

  const totalAudioDurationMs = words.length > 0 ? words[words.length - 1].endMs + 300 : 1000;
  const currentLoopTimeMs = isSpeakingSim ? ((tick * (1000 / 60)) % totalAudioDurationMs) : 0;
  const currentViseme = manualViseme ?? (isSpeakingSim ? visemeForTime(words, currentLoopTimeMs) : undefined);
  const activeWord = isSpeakingSim
    ? words.find((w) => currentLoopTimeMs >= w.startMs && currentLoopTimeMs <= w.endMs)
    : undefined;

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(rig, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rig.name.toLowerCase().replace(/\s+/g, "_")}.rig.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    const code = `<RemotionVirtualMC
  characterType="stickman"
  stickmanRig={${JSON.stringify(rig, null, 2)}}
  stickmanMood="${mood}"
  stickmanArmPose="${armPose}"
  words={scene.words}
  position="bottom-left"
  size={280}
/>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* 1. Live Preview Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800 shadow-xl">
        {/* Canvas Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-foreground">Live Motion Preview</span>
            <span className="font-mono text-[10px] text-zinc-500">60 FPS</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Nền:</span>
            {(["white", "stage", "dark"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBg(b)}
                className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                  bg === b ? "bg-zinc-800 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {b === "white" ? "Trắng" : b === "stage" ? "Sân khấu" : "Tối"}
              </button>
            ))}
          </div>
        </div>

        {/* View Surface */}
        <div
          className={`relative flex h-[340px] w-full items-end justify-center pb-6 transition-all duration-300 ${
            bg === "white"
              ? "bg-[#ffffff]"
              : bg === "stage"
              ? "bg-gradient-to-b from-[#1e1b4b] via-[#0f172a] to-[#020617]"
              : "bg-[#09090b]"
          }`}
        >
          {/* Active Speaking Subtitle Bubble */}
          {isSpeakingSim && (
            <div
              className={`absolute top-4 z-20 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
                bg === "white"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-emerald-500/40 bg-zinc-900/95 text-emerald-400"
              }`}
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {activeWord ? `“${activeWord.text}”` : "..."}
              </span>
              <span className="rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[10px] text-emerald-300">
                viseme: {currentViseme ?? "rest"}
              </span>
            </div>
          )}

          {/* SVG Stickman Mascot with Current Pose & Rig */}
          <svg
            viewBox={`${STICKMAN_VIEWBOX.x} ${STICKMAN_VIEWBOX.y} ${STICKMAN_VIEWBOX.width} ${STICKMAN_VIEWBOX.height}`}
            width={240}
            height={280}
            style={{ overflow: "visible" }}
          >
            <StickmanFigure
              rig={rig}
              mood={mood}
              armPose={armPose}
              isSpeaking={isSpeakingSim}
              viseme={currentViseme}
              headTurn={headTurn}
              headTilt={headTilt}
              bodyLean={bodyLean}
              gaze={{ x: gazeX, y: gazeY }}
              eyesClosed={eyesClosed}
              autoBlink={autoBlink}
              bouncy={bouncy}
              tick={tick}
              flipHorizontal={flip}
              hasGlasses={hasGlasses}
            />
          </svg>
        </div>
      </div>

      {/* 2. Interactive Test Tabs (Pose / LipSync / Export) */}
      <Tabs defaultValue="pose" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
          <TabsTrigger value="pose" className="text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Pose Test
          </TabsTrigger>
          <TabsTrigger value="lipsync" className="text-xs gap-1.5">
            <Volume2 className="h-3.5 w-3.5" /> Lip-Sync
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs gap-1.5">
            <Code2 className="h-3.5 w-3.5" /> Code & JSON
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: POSE TEST */}
        <TabsContent value="pose" className="space-y-3 pt-2 text-xs">
          {/* Mood & Arm Pose Pickers */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-semibold">Biểu cảm (Mood):</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["side_eye", "neutral", "shocked", "disappointed", "happy", "smug"] as StickmanMood[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`rounded-md p-1.5 text-center border text-[11px] transition-colors ${
                    mood === m
                      ? "border-primary bg-primary/20 text-white font-semibold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  {m === "side_eye"
                    ? "😒 Liếc phán xét"
                    : m === "shocked"
                    ? "😲 Há hốc mồm"
                    : m === "happy"
                    ? "😄 Cười híp"
                    : m === "disappointed"
                    ? "😞 Cạn lời"
                    : m === "smug"
                    ? "😏 Cười nhếch"
                    : "😐 Bình thường"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-semibold">Dáng tay (Arm Pose):</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["hip", "point", "shrug", "wave", "explain", "idle"] as StickmanArmPose[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setArmPose(p)}
                  className={`rounded-md p-1.5 text-center border text-[11px] transition-colors ${
                    armPose === p
                      ? "border-amber-500 bg-amber-500/20 text-amber-200 font-semibold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  {p === "hip"
                    ? "Chống nạnh"
                    : p === "point"
                    ? "Chỉ tay ngang"
                    : p === "shrug"
                    ? "Nhún vai"
                    : p === "wave"
                    ? "Vẫy tay"
                    : p === "explain"
                    ? "Vung tay nói"
                    : "Tay xuôi"}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders for Head Turn, Tilt, Body Lean */}
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Quay mặt (Head Turn):</span>
                <span className="font-mono text-white">{headTurn.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={headTurn}
                onChange={(e) => setHeadTurn(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-zinc-800 rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Nghiêng đầu (Head Tilt):</span>
                <span className="font-mono text-white">{headTilt.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={headTilt}
                onChange={(e) => setHeadTilt(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-zinc-800 rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Nghiêng người (Body Lean):</span>
                <span className="font-mono text-white">{bodyLean}°</span>
              </div>
              <input
                type="range"
                min={-15}
                max={15}
                step={1}
                value={bodyLean}
                onChange={(e) => setBodyLean(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-zinc-800 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400">Liếc mắt X:</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={gazeX}
                  onChange={(e) => setGazeX(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-zinc-800 rounded"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400">Liếc mắt Y:</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={gazeY}
                  onChange={(e) => setGazeY(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1.5 bg-zinc-800 rounded"
                />
              </div>
            </div>
          </div>

          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2">
              <Label htmlFor="t-bounce" className="text-[11px]">Nhún nảy</Label>
              <Switch id="t-bounce" checked={bouncy} onCheckedChange={setBouncy} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2">
              <Label htmlFor="t-flip" className="text-[11px]">Lật gương</Label>
              <Switch id="t-flip" checked={flip} onCheckedChange={setFlip} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2">
              <Label htmlFor="t-autoblink" className="text-[11px]">Tự chớp mắt</Label>
              <Switch id="t-autoblink" checked={autoBlink} onCheckedChange={setAutoBlink} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2">
              <Label htmlFor="t-glasses" className="text-[11px]">Đeo kính</Label>
              <Switch id="t-glasses" checked={hasGlasses} onCheckedChange={setHasGlasses} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: LIP-SYNC TEST */}
        <TabsContent value="lipsync" className="space-y-3 pt-2 text-xs">
          {/* Manual Viseme Buttons with PNG Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground font-semibold">
                Khẩu hình ảnh PNG (10 Visemes):
              </Label>
              {manualViseme && (
                <button
                  type="button"
                  onClick={() => setManualViseme(null)}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Bỏ chọn ép khẩu hình
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  { id: "rest", label: "rest" },
                  { id: "A", label: "A" },
                  { id: "I", label: "I" },
                  { id: "U", label: "U" },
                  { id: "E", label: "E" },
                  { id: "O", label: "O" },
                  { id: "smile", label: "smile" },
                  { id: "frown", label: "frown" },
                  { id: "smirk", label: "smirk" },
                  { id: "surprised", label: "sốc" },
                ] as const
              ).map((item) => {
                const isSelected = manualViseme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsSpeakingSim(false);
                      setManualViseme(manualViseme === item.id ? null : item.id);
                    }}
                    className={`flex flex-col items-center justify-center rounded-lg p-1.5 border transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                        : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    <div className="h-6 w-full flex items-center justify-center p-0.5">
                      <img
                        src={`/stickman/mouth/${item.id}.png`}
                        alt={item.id}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="font-mono text-[9px] mt-0.5 font-bold uppercase">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulated Speech Test */}
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
            <Label className="text-[11px] text-zinc-300 font-semibold flex items-center justify-between">
              <span>Thử giọng nói & Lip-Sync Whisper:</span>
              <Button
                variant={isSpeakingSim ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  setManualViseme(null);
                  setIsSpeakingSim(!isSpeakingSim);
                }}
                className="h-6 px-2 text-[10px]"
              >
                {isSpeakingSim ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" /> Dừng
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" /> Chạy thử
                  </>
                )}
              </Button>
            </Label>

            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nhập câu thoại tiếng Việt..."
            />

            {/* Word Timestamps Preview */}
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
              {words.map((w, idx) => {
                const isActive = activeWord === w;
                return (
                  <span
                    key={idx}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-black font-bold shadow"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: CODE & JSON EXPORT */}
        <TabsContent value="export" className="space-y-3 pt-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              className="h-7 text-[11px] border-zinc-800 gap-1.5 flex-1"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Tải về {rig.name}.rig.json
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 text-[11px] border-zinc-800 gap-1.5 flex-1"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-primary" />}
              {copied ? "Đã copy!" : "Copy mã Remotion"}
            </Button>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[10px] text-zinc-300 max-h-48 overflow-y-auto">
            <pre>{JSON.stringify(rig, null, 2)}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
