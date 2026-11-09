"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { NleStudio } from "@/components/studio/NleStudio";
import { useFootballVariant } from "@/components/studio/football-variant";

function FootballStudio() {
  return <NleStudio variant={useFootballVariant()} />;
}

export default function FootballStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
          Đang khởi động Football Shorts…
        </div>
      }
    >
      <FootballStudio />
    </Suspense>
  );
}
