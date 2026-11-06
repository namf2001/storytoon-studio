"use client";

import React, { useState } from "react";
import {
  Film,
  Users,
  Sparkles,
  Sliders,
  CheckCircle2,
  Code2,
} from "lucide-react";
import {
  AuthenticDuolingo,
  CHARACTER_META,
  type DuolingoCharacterId,
  type DuoMood,
} from "@storytoon/video-engine";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StickmanStudio } from "@/components/stickman-studio/StickmanStudio";

export default function AvatarSvgPlaygroundPage() {
  const [activeTab, setActiveTab] = useState<"stickman_studio" | "duolingo_roster">("stickman_studio");

  // Duolingo roster state
  const [duoChar, setDuoChar] = useState<DuolingoCharacterId>("duo");
  const [duoMood, setDuoMood] = useState<DuoMood>("waving");
  const [duoSpeaking, setDuoSpeaking] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
              Avatar Rig Studio (Pattern mesh-avatar-studio)
            </Badge>
            <span className="text-xs text-muted-foreground">Vector Data-driven Rig & Lip-sync</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            2D Character Studio & Calibration
          </h1>
          <p className="text-sm text-muted-foreground">
            Kéo thả điểm neo (handles), tinh chỉnh thông số chi tiết (rig fields), thử nghiệm khẩu hình lip-sync và tư thế trực tiếp.
          </p>
        </div>

        {/* Studio Mode Tabs */}
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("stickman_studio")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "stickman_studio"
                ? "bg-primary text-primary-foreground shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" /> Stickman Rig Studio (Full Editor)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("duolingo_roster")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "duolingo_roster"
                ? "bg-primary text-primary-foreground shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Duolingo Vector Gốc
          </button>
        </div>
      </div>

      {/* Main Studio Views */}
      {activeTab === "stickman_studio" ? (
        <StickmanStudio />
      ) : (
        /* DUOLINGO ROSTER VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-4">
            <Card className="border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-sm text-foreground">
                  {CHARACTER_META[duoChar].name} — {CHARACTER_META[duoChar].title}
                </span>
                <button
                  type="button"
                  onClick={() => setDuoSpeaking(!duoSpeaking)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    duoSpeaking ? "bg-red-500 text-white" : "bg-emerald-500 text-black"
                  }`}
                >
                  {duoSpeaking ? "Dừng nói" : "Bật thử nói"}
                </button>
              </div>

              <div className="flex h-80 items-center justify-center pt-4">
                <AuthenticDuolingo
                  character={duoChar}
                  duoMood={duoMood}
                  isSpeaking={duoSpeaking}
                  bouncy={true}
                  width={260}
                  height={300}
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <Card className="border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase pb-2">
                Chọn nhân vật Duolingo:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["duo", "lily", "zari", "junior", "oscar", "lucy", "falstaff", "eddy", "bea"] as DuolingoCharacterId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDuoChar(id)}
                    className={`rounded-lg border p-2 text-center transition-all ${
                      duoChar === id
                        ? "border-emerald-500 bg-emerald-500/15 font-bold text-white ring-1 ring-emerald-500/40"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xs block">{CHARACTER_META[id].name}</span>
                    <span className="text-[10px] text-zinc-500 block truncate">{CHARACTER_META[id].title}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
