import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Storytoon Studio — AI Video & Storyboard Engine",
  description: "Tự động tạo giọng đọc VieNeu, phụ đề Whisper, phân cảnh Groq AI và dựng video Remotion.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
