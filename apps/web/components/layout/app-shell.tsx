"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  FolderKanban,
  PanelLeft,
  Plus,
  Cpu,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Trophy,
  ShoppingBag,
  SquareTerminal,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/ui/command-palette";
import { api, fmtMs, type ProjectSummary } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNleRoute =
    pathname.startsWith("/football") ||
    pathname.startsWith("/product") ||
    pathname.startsWith("/projects/");
  const isToolsRoute = pathname.startsWith("/tools");
  const [collapsed, setCollapsed] = useState(isNleRoute);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Auto-collapse sidebar into a sleek DaVinci-style icon rail when entering NLE Studio routes
  useEffect(() => {
    setCollapsed(isNleRoute);
  }, [isNleRoute]);

  useEffect(() => {
    const fetchProjects = () => {
      api
        .listProjects()
        .then(setProjects)
        .catch(() => {});
    };
    fetchProjects();
    const interval = setInterval(fetchProjects, 3000);
    window.addEventListener("focus", fetchProjects);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchProjects);
    };
  }, [pathname]);

  const storytoonProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.videoType === "storytoon" ||
          (!p.videoType && p.aspectRatio !== "9:16")
      ),
    [projects]
  );

  const footballProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.videoType === "football" ||
          (p.aspectRatio === "9:16" && p.videoType !== "product")
      ),
    [projects]
  );

  const productProjects = useMemo(
    () =>
      projects.filter((p) => p.videoType === "product"),
    [projects]
  );

  const navItems = [
    {
      title: "Storytoon 2D Studio",
      href: "/",
      icon: FolderKanban,
      active:
        pathname === "/" ||
        (pathname.startsWith("/projects/") &&
          !pathname.includes("/football") &&
          !pathname.includes("/product")),
      badge: storytoonProjects.length > 0 ? String(storytoonProjects.length) : undefined,
    },
    {
      title: "Football Shorts",
      href: "/football",
      icon: Trophy,
      active: pathname.startsWith("/football"),
      badge: footballProjects.length > 0 ? String(footballProjects.length) : "9:16",
    },
    {
      title: "Video Sản Phẩm",
      href: "/product",
      icon: ShoppingBag,
      active: pathname.startsWith("/product"),
      badge: productProjects.length > 0 ? String(productProjects.length) : "9:16",
    },
  ];

  const projectGroups = [
    {
      id: "storytoon",
      label: "Storytoon 2D",
      icon: FolderKanban,
      iconColor: "text-primary",
      badge: "2D",
      projects: storytoonProjects,
      getHref: (p: ProjectSummary) => `/projects/${p.id}`,
      isActive: (p: ProjectSummary) => pathname === `/projects/${p.id}`,
    },
    {
      id: "football",
      label: "Football Shorts",
      icon: Trophy,
      iconColor: "text-amber-400",
      badge: "9:16",
      projects: footballProjects,
      getHref: (p: ProjectSummary) => `/football?id=${p.id}`,
      isActive: (p: ProjectSummary) =>
        pathname.startsWith("/football") &&
        typeof window !== "undefined" &&
        window.location.search.includes(p.id),
    },
    {
      id: "product",
      label: "Video Sản Phẩm",
      icon: ShoppingBag,
      iconColor: "text-emerald-400",
      badge: "9:16",
      projects: productProjects,
      getHref: (p: ProjectSummary) => `/product?id=${p.id}`,
      isActive: (p: ProjectSummary) =>
        pathname.startsWith("/product") &&
        typeof window !== "undefined" &&
        window.location.search.includes(p.id),
    },
  ];

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          "flex w-full bg-[#09090b] text-foreground",
          isNleRoute ? "h-screen overflow-hidden" : "min-h-screen"
        )}
      >
        {/* Left Navigation Rail / Sidebar */}
        <aside
          className={cn(
            "sticky top-0 z-30 flex h-screen flex-col border-r border-zinc-800/40 bg-[#0d0d10] text-sidebar-foreground transition-all duration-150",
            collapsed ? "w-14" : "w-60"
          )}
        >
          {/* Brand Header */}
          <div className="flex h-12 items-center justify-between border-b border-zinc-800/40 px-3">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Clapperboard className="h-4 w-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className="truncate text-xs font-bold tracking-tight">Storytoon NLE</span>
                  <span className="truncate text-[10px] text-muted-foreground">AI Video Studio</span>
                </div>
              )}
            </Link>
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setCollapsed(true)}
                title="Thu gọn thanh bên"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Navigation Content */}
          <ScrollArea className="flex-1 px-2 py-2.5">
            <div className="space-y-1">
              {/* Quick Command Palette Trigger (⌘K) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCommandOpen(true)}
                    className={cn(
                      "mb-2 flex w-full items-center justify-between rounded-lg border border-zinc-800/90 bg-zinc-900/70 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:bg-zinc-800/80 hover:text-zinc-100",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Search className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      {!collapsed && <span className="truncate">Tìm nhanh / Lệnh...</span>}
                    </span>
                    {!collapsed && (
                      <kbd className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        ⌘K
                      </kbd>
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Bảng lệnh nhanh & Tìm dự án (⌘K)
                  </TooltipContent>
                )}
              </Tooltip>

              {collapsed && !isNleRoute && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setCollapsed(false)}
                      className="mb-1 flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-800/70 hover:text-foreground"
                    >
                      <PanelLeft className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Mở rộng thanh điều hướng</TooltipContent>
                </Tooltip>
              )}

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                          item.active
                            ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                            : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                        )}
                      >
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 truncate after:absolute after:inset-0"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-primary" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                        {!collapsed && (
                          <div className="flex items-center gap-1.5">
                            {item.href === "/product" && (
                              <Link
                                href="/product?new=1"
                                className="relative z-10 rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                                title="Tạo mới dự án sản phẩm trắng"
                              >
                                <Plus className="h-3 w-3 stroke-[2.5]" />
                              </Link>
                            )}
                            {item.badge && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                  </Tooltip>
                );
              })}
            </div>

            <Separator className="my-3 bg-zinc-800/80" />

            {/* Platform / Tools Section */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-2 pt-1 pb-1 text-[11px] font-medium text-muted-foreground/70">
                  Platform
                </p>
              )}

              {/* Collapsible Playground Menu Item */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (collapsed) setCollapsed(false);
                      setToolsOpen((prev) => !prev);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                      isToolsRoute
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <SquareTerminal className="h-4 w-4 shrink-0 text-primary" />
                      {!collapsed && <span className="truncate">Playground</span>}
                    </span>
                    {!collapsed && (
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                          toolsOpen ? "rotate-90" : ""
                        )}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Playground (2D Avatar Tools)
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Sub-items (with left tree line and smooth motion) */}
              <AnimatePresence initial={false}>
                {toolsOpen && !collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="ml-4 overflow-hidden pl-3.5 border-l border-zinc-800/90 space-y-0.5 py-1"
                  >
                    <Link
                      href="/tools/avatar-svg"
                      className={cn(
                        "flex items-center rounded-md px-2 py-1.5 text-xs transition-colors",
                        pathname === "/tools/avatar-svg"
                          ? "bg-primary/15 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-zinc-800/50 hover:text-foreground"
                      )}
                    >
                      <span className="truncate">Phương án 1 (SVG Rig)</span>
                    </Link>
                    <Link
                      href="/tools/avatar-rive"
                      className={cn(
                        "flex items-center rounded-md px-2 py-1.5 text-xs transition-colors",
                        pathname === "/tools/avatar-rive"
                          ? "bg-primary/15 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-zinc-800/50 hover:text-foreground"
                      )}
                    >
                      <span className="truncate">Phương án 2 (Rive / Mesh)</span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator className="my-3 bg-zinc-800/80" />

            {/* Recent Projects Grouped by Video Type */}
            <div className="space-y-3">
              {!collapsed && (
                <p className="px-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Dự án gần đây
                </p>
              )}

              {projectGroups.map((group) => {
                if (group.projects.length === 0) return null;
                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="space-y-1">
                    {!collapsed && (
                      <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5 truncate">
                          <GroupIcon className={cn("h-3 w-3 shrink-0", group.iconColor)} />
                          <span className="truncate">{group.label}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {group.id === "product" && (
                            <Link
                              href="/product?new=1"
                              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                              title="Tạo mới dự án sản phẩm"
                            >
                              <Plus className="h-3 w-3 stroke-[2.5]" />
                            </Link>
                          )}
                          <span className="rounded bg-zinc-800/80 px-1 font-mono text-[9px] text-zinc-400">
                            {group.projects.length}
                          </span>
                        </div>
                      </div>
                    )}

                    {group.projects.slice(0, 6).map((p) => {
                      const active = group.isActive(p);
                      const StatusIcon =
                        p.status === "ready"
                          ? CheckCircle2
                          : p.status === "processing"
                            ? Clock
                            : p.status === "failed"
                              ? AlertCircle
                              : FolderKanban;
                      const statusColor =
                        p.status === "ready"
                          ? "text-emerald-400"
                          : p.status === "processing"
                            ? "text-amber-400 animate-spin"
                            : p.status === "failed"
                              ? "text-red-400"
                              : "text-muted-foreground";

                      return (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <Link
                              href={group.getHref(p)}
                              className={cn(
                                "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                                active
                                  ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/30"
                                  : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                              )}
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", statusColor)} />
                                {!collapsed && (
                                  <span
                                    className="truncate text-xs font-medium max-w-[130px]"
                                    title={p.title}
                                  >
                                    {p.title}
                                  </span>
                                )}
                              </span>
                              {!collapsed && (
                                <span className="ml-1.5 shrink-0 font-mono text-[10px] opacity-60">
                                  {fmtMs(p.durationMs)}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-semibold text-xs text-foreground">{p.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {group.label} · {fmtMs(p.durationMs)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="border-t border-zinc-800/40 p-2.5">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                <Cpu className="h-3.5 w-3.5" />
              </div>
              {!collapsed && (
                <div className="flex flex-1 flex-col truncate">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    AI Worker Ready
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isNleRoute && (
            <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-zinc-800/40 bg-background/80 px-6 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCollapsed((c) => !c)}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <nav className="flex items-center gap-1.5 text-xs">
                  <Link href="/" className="text-muted-foreground hover:text-foreground">
                    Workspace
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {pathname === "/tools/avatar-svg"
                      ? "2D Avatar Studio — Phương án 1 (SVG Rig)"
                      : pathname === "/tools/avatar-rive"
                      ? "2D Avatar Studio — Phương án 2 (Rive / Mesh)"
                      : "Quản lý Dự án"}
                  </span>
                </nav>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
                className="h-8 gap-2 border-zinc-800 bg-zinc-900/80 text-xs text-zinc-300 hover:border-amber-500/40 hover:text-white"
              >
                <Search className="h-3.5 w-3.5 text-amber-400" />
                <span>Tìm dự án / Lệnh nhanh</span>
                <kbd className="ml-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  ⌘K
                </kbd>
              </Button>
            </header>
          )}

          <main className={cn("flex-1", isNleRoute ? "h-full overflow-hidden p-0" : "p-6")}>
            {children}
          </main>
        </div>

        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          projects={projects}
        />
      </div>
    </TooltipProvider>
  );
}
