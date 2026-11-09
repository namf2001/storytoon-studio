import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

// Inter for UI (Vietnamese subset); JetBrains Mono only for timecodes and measurements.
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Storytoon Studio — AI Video & Storyboard Engine",
  description: "Tự động tạo giọng đọc VieNeu, phụ đề Whisper, phân cảnh Groq AI và dựng video Remotion.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`dark ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
