"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Clapperboard,
  Combine,
  FolderKanban,
  Keyboard,
  Redo2,
  Scissors,
  Search,
  ShoppingBag,
  Sparkles,
  SquareTerminal,
  Trophy,
  Undo2,
  UserRound,
  Wand2,
} from "lucide-react";
import type { ProjectSummary } from "@/lib/api";
import { fmtMs } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectSummary[];
}

/**
 * Global Command Palette (⌘K / Ctrl+K) powered by `cmdk` and Radix Dialog.
 * Lets users jump across Studios, Tools, Projects, and NLE Shortcuts in 1 second.
 */
export function CommandPalette({
  open,
  onOpenChange,
  projects,
}: CommandPaletteProps) {
  const router = useRouter();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange]
  );

  const dispatchShortcut = (key: string, meta = false, shift = false) => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        metaKey: meta,
        ctrlKey: meta,
        shiftKey: shift,
        bubbles: true,
      })
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[18%] z-50 w-full max-w-xl translate-x-[-50%] overflow-hidden rounded-xl border border-zinc-800 bg-[#121217] text-zinc-100 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">
            Bảng điều khiển nhanh Storytoon NLE (⌘K)
          </DialogPrimitive.Title>
          <Command className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex items-center border-b border-zinc-800 px-3.5">
              <Search className="mr-2.5 h-4 w-4 shrink-0 text-amber-400" />
              <Command.Input
                placeholder="Tìm dự án, chuyển Studio, hoặc gọi lệnh NLE (gõ tên dự án, 'product', 'tách cảnh'...)..."
                className="flex h-11 w-full bg-transparent py-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
              <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[380px] overflow-y-auto p-2 text-xs">
              <Command.Empty className="py-8 text-center text-xs text-zinc-500">
                Không tìm thấy lệnh hoặc dự án phù hợp.
              </Command.Empty>

              <Command.Group
                heading="Không gian làm việc (Studios & Tools)"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-500"
              >
                <Command.Item
                  value="storytoon 2d studio trang chu dashboard"
                  onSelect={() => runCommand(() => router.push("/"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-amber-500/15 aria-selected:text-amber-300"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className="h-4 w-4 text-amber-400" />
                    <span>Storytoon 2D Studio (Dashboard & Tạo dự án)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    16:9 / 9:16
                  </Badge>
                </Command.Item>

                <Command.Item
                  value="video san pham product tvc shopee tiktok 9:16"
                  onSelect={() => runCommand(() => router.push("/product"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-emerald-500/15 aria-selected:text-emerald-300"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="h-4 w-4 text-emerald-400" />
                    <span>Video Sản Phẩm TVC Studio (Smart Auto-Fit)</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-300">
                    9:16 TVC
                  </Badge>
                </Command.Item>

                <Command.Item
                  value="football shorts bong da ban thang highlight"
                  onSelect={() => runCommand(() => router.push("/football"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-amber-500/15 aria-selected:text-amber-300"
                >
                  <div className="flex items-center gap-2.5">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>Football Shorts Broadcast Studio</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-300">
                    9:16 Sport
                  </Badge>
                </Command.Item>

                <Command.Item
                  value="stickman 2d character rig editor svg"
                  onSelect={() => runCommand(() => router.push("/tools/avatar-svg"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-cyan-500/15 aria-selected:text-cyan-300"
                >
                  <div className="flex items-center gap-2.5">
                    <UserRound className="h-4 w-4 text-cyan-400" />
                    <span>2D Character Rig & Lip-Sync Studio (SVG)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Rigging
                  </Badge>
                </Command.Item>

                <Command.Item
                  value="rive avatar character tool"
                  onSelect={() => runCommand(() => router.push("/tools/avatar-rive"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-purple-500/15 aria-selected:text-purple-300"
                >
                  <div className="flex items-center gap-2.5">
                    <SquareTerminal className="h-4 w-4 text-purple-400" />
                    <span>Rive Character Sandbox</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Rive
                  </Badge>
                </Command.Item>
              </Command.Group>

              <Command.Separator className="my-1.5 h-px bg-zinc-800/80" />

              <Command.Group
                heading="Thao tác nhanh trên Timeline NLE"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-500"
              >
                <Command.Item
                  value="tach canh tai playhead split scene"
                  onSelect={() => runCommand(() => dispatchShortcut("s"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-zinc-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Scissors className="h-3.5 w-3.5 text-amber-400" />
                    <span>Tách phân cảnh tại vị trí Playhead</span>
                  </div>
                  <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    S
                  </kbd>
                </Command.Item>

                <Command.Item
                  value="gop canh voi canh ke tiep merge scene"
                  onSelect={() => runCommand(() => dispatchShortcut("m"))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-zinc-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Combine className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Gộp phân cảnh đang chọn với cảnh kế tiếp</span>
                  </div>
                  <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    M
                  </kbd>
                </Command.Item>

                <Command.Item
                  value="hoan tac undo"
                  onSelect={() => runCommand(() => dispatchShortcut("z", true))}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-zinc-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Undo2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Hoàn tác thay đổi (Undo)</span>
                  </div>
                  <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    ⌘Z
                  </kbd>
                </Command.Item>

                <Command.Item
                  value="lam lai redo"
                  onSelect={() =>
                    runCommand(() => dispatchShortcut("z", true, true))
                  }
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-zinc-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Redo2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Làm lại thay đổi (Redo)</span>
                  </div>
                  <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    ⌘⇧Z
                  </kbd>
                </Command.Item>
              </Command.Group>

              {projects.length > 0 && (
                <>
                  <Command.Separator className="my-1.5 h-px bg-zinc-800/80" />
                  <Command.Group
                    heading={`Dự án gần đây (${projects.length})`}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-500"
                  >
                    {projects.slice(0, 15).map((p) => {
                      const href =
                        p.videoType === "product"
                          ? `/product?id=${p.id}`
                          : p.videoType === "football"
                            ? `/football?id=${p.id}`
                            : `/projects/${p.id}`;
                      return (
                        <Command.Item
                          key={p.id}
                          value={`project ${p.title} ${p.id} ${p.videoType ?? "storytoon"}`}
                          onSelect={() => runCommand(() => router.push(href))}
                          className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-zinc-200 aria-selected:bg-zinc-800"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Clapperboard className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span className="truncate font-medium">
                              {p.title}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {p.durationMs ? (
                              <span className="font-mono text-[10px] text-zinc-400">
                                {fmtMs(p.durationMs)}
                              </span>
                            ) : null}
                            <Badge variant="outline" className="text-[9px]">
                              {p.aspectRatio}
                            </Badge>
                          </div>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </>
              )}
            </Command.List>

            <div className="flex items-center justify-between border-t border-zinc-800 bg-[#0d0d11] px-3.5 py-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Keyboard className="h-3 w-3 text-amber-400" />
                Dùng phím ↑↓ để di chuyển, Enter để chọn
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Storytoon NLE Command Center
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
