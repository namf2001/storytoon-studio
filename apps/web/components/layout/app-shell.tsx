"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  LayoutDashboard,
  MonitorSmartphone,
  X,
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
import { useWorkerInfo, type ServiceState } from "@/lib/system-info";
import { projectKind } from "@/lib/project-kind";

/** Tracks a CSS media query (false during SSR). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Reads ?id= reactively; isolated so useSearchParams sits inside its own Suspense boundary. */
function ActiveIdReader({ onChange }: { onChange: (id: string | null) => void }) {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || searchParams.get("project");
  useEffect(() => {
    onChange(id);
  }, [id, onChange]);
  return null;
}

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
  const [projectsError, setProjectsError] = useState(false);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const { state: workerState } = useWorkerInfo();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse sidebar into a sleek DaVinci-style icon rail when entering NLE Studio routes
  useEffect(() => {
    setCollapsed(isNleRoute);
  }, [isNleRoute]);

  // Mobile: sidebar là ngăn kéo, tự đóng khi chuyển trang
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, activeQueryId]);

  // Trên mobile, ngăn kéo luôn hiển thị đầy đủ (không dùng icon rail)
  const railCollapsed = isMobile ? false : collapsed;
  const toggleSidebar = () => (isMobile ? setMobileOpen((o) => !o) : setCollapsed((c) => !c));

  // Danh sách dự án: hỏi nhanh (3s) chỉ khi có dự án đang xử lý AI, còn lại 30s / khi quay lại tab.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fetchProjects = async () => {
      clearTimeout(timer);
      let anyProcessing = false;
      try {
        const list = await api.listProjects();
        if (cancelled) return;
        setProjects(list);
        setProjectsError(false);
        anyProcessing = list.some((p) => p.status === "processing");
      } catch {
        if (!cancelled) setProjectsError(true);
      }
      if (!cancelled) timer = setTimeout(fetchProjects, anyProcessing ? 3000 : 30000);
    };
    fetchProjects();
    window.addEventListener("focus", fetchProjects);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("focus", fetchProjects);
    };
  }, [pathname]);

  const storytoonProjects = useMemo(
    () => projects.filter((p) => projectKind(p) === "storytoon"),
    [projects]
  );
  const footballProjects = useMemo(
    () => projects.filter((p) => projectKind(p) === "football"),
    [projects]
  );
  const productProjects = useMemo(
    () => projects.filter((p) => projectKind(p) === "product"),
    [projects]
  );

  const navItems = [
    {
      // Trang chủ liệt kê mọi loại dự án và là nơi tạo dự án Storytoon 2D
      title: "Bảng điều khiển",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/" || pathname.startsWith("/projects/"),
      badge: projects.length > 0 ? String(projects.length) : undefined,
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
      iconColor: "text-muted-foreground",
      badge: "2D",
      projects: storytoonProjects,
      getHref: (p: ProjectSummary) => `/projects/${p.id}`,
      isActive: (p: ProjectSummary) => pathname === `/projects/${p.id}`,
    },
    {
      id: "football",
      label: "Football Shorts",
      icon: Trophy,
      iconColor: "text-muted-foreground",
      badge: "9:16",
      projects: footballProjects,
      getHref: (p: ProjectSummary) => `/football?id=${p.id}`,
      isActive: (p: ProjectSummary) => pathname.startsWith("/football") && activeQueryId === p.id,
    },
    {
      id: "product",
      label: "Video Sản Phẩm",
      icon: ShoppingBag,
      iconColor: "text-muted-foreground",
      badge: "9:16",
      projects: productProjects,
      getHref: (p: ProjectSummary) => `/product?id=${p.id}`,
      isActive: (p: ProjectSummary) => pathname.startsWith("/product") && activeQueryId === p.id,
    },
  ];

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          "flex w-full bg-background text-foreground",
          isNleRoute ? "h-screen overflow-hidden" : "min-h-screen"
        )}
      >
        <Suspense fallback={null}>
          <ActiveIdReader onChange={setActiveQueryId} />
        </Suspense>

        {/* Mobile backdrop */}
        {isMobile && mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}

        {/* Left Navigation Rail / Sidebar */}
        <aside
          aria-label="Điều hướng chính"
          className={cn(
            // Mobile (<768px): ngăn kéo cố định, ẩn mặc định. Desktop: thanh bên sticky / icon rail.
            // Dùng class responsive thay vì JS để HTML render từ server đã đúng layout (không bị "trượt" khi tải).
            "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-zinc-800/40 bg-surface-1 text-sidebar-foreground shadow-2xl transition-[transform,width] duration-150",
            "md:sticky md:top-0 md:z-30 md:shrink-0 md:translate-x-0 md:shadow-none",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            collapsed ? "md:w-14" : "md:w-60"
          )}
        >
          {/* Brand Header */}
          <div className="flex h-12 items-center justify-between border-b border-zinc-800/40 px-3">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Clapperboard className="h-4 w-4" />
              </div>
              {!railCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="truncate text-xs font-bold tracking-tight">Storytoon NLE</span>
                  <span className="truncate text-xs text-muted-foreground">AI Video Studio</span>
                </div>
              )}
            </Link>
            {!railCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => (isMobile ? setMobileOpen(false) : setCollapsed(true))}
                title={isMobile ? "Đóng menu" : "Thu gọn thanh bên"}
                aria-label={isMobile ? "Đóng menu" : "Thu gọn thanh bên"}
              >
                {isMobile ? <X className="h-4 w-4" /> : <PanelLeft className="h-3.5 w-3.5" />}
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
                      "mb-2 flex w-full items-center justify-between rounded-lg border border-zinc-800/90 bg-zinc-900/70 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80 hover:text-zinc-100",
                      railCollapsed && "justify-center px-0"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {!railCollapsed && <span className="truncate">Tìm nhanh / Lệnh...</span>}
                    </span>
                    {!railCollapsed && (
                      <kbd className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                        ⌘K
                      </kbd>
                    )}
                  </button>
                </TooltipTrigger>
                {railCollapsed && (
                  <TooltipContent side="right">
                    Bảng lệnh nhanh & Tìm dự án (⌘K)
                  </TooltipContent>
                )}
              </Tooltip>

              {railCollapsed && !isNleRoute && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="Mở rộng thanh điều hướng"
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
                            ? "bg-primary/15 text-primary-text ring-1 ring-primary/30"
                            : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                        )}
                      >
                        <Link
                          href={item.href}
                          className="flex items-center gap-2.5 truncate after:absolute after:inset-0"
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          {!railCollapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                        {!railCollapsed && (
                          <div className="flex items-center gap-1.5">
                            {item.href === "/product" && (
                              <Link
                                href="/product?new=1"
                                className="relative z-10 rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-foreground transition-colors"
                                title="Tạo mới dự án sản phẩm trắng"
                              >
                                <Plus className="h-3 w-3 stroke-[2.5]" />
                              </Link>
                            )}
                            {item.badge && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {railCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                  </Tooltip>
                );
              })}
            </div>

            <Separator className="my-3 bg-zinc-800/80" />

            {/* Platform / Tools Section */}
            <div className="space-y-1">
              {!railCollapsed && (
                <p className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground/70">
                  Công cụ thử nghiệm
                </p>
              )}

              {/* Collapsible Playground Menu Item */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (railCollapsed) setCollapsed(false);
                      setToolsOpen((prev) => !prev);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                      isToolsRoute
                        ? "bg-primary/10 text-primary-text font-semibold"
                        : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <SquareTerminal className="h-4 w-4 shrink-0" aria-hidden />
                      {!railCollapsed && <span className="truncate">Avatar 2D</span>}
                    </span>
                    {!railCollapsed && (
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                          toolsOpen ? "rotate-90" : ""
                        )}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                {railCollapsed && (
                  <TooltipContent side="right">
                    Công cụ Avatar 2D
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Sub-items (with left tree line and smooth motion) */}
              <AnimatePresence initial={false}>
                {toolsOpen && !railCollapsed && (
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
                          ? "bg-primary/15 font-semibold text-primary-text"
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
                          ? "bg-primary/15 font-semibold text-primary-text"
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
              {!railCollapsed && (
                <p className="px-2 pb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  Dự án gần đây
                </p>
              )}

              {projectGroups.map((group) => {
                if (group.projects.length === 0) return null;
                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="space-y-1">
                    {!railCollapsed && (
                      <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                        <span className="flex items-center gap-1.5 truncate">
                          <GroupIcon className={cn("h-3 w-3 shrink-0", group.iconColor)} />
                          <span className="truncate">{group.label}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {group.id === "product" && (
                            <Link
                              href="/product?new=1"
                              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-foreground transition-colors"
                              title="Tạo mới dự án sản phẩm"
                            >
                              <Plus className="h-3 w-3 stroke-[2.5]" />
                            </Link>
                          )}
                          <span className="rounded bg-zinc-800/80 px-1 font-mono text-xs text-zinc-400">
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
                                  ? "bg-primary/15 font-semibold text-primary-text ring-1 ring-primary/30"
                                  : "text-muted-foreground hover:bg-zinc-800/60 hover:text-foreground"
                              )}
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", statusColor)} />
                                {!railCollapsed && (
                                  <span
                                    className="truncate text-xs font-medium max-w-[130px]"
                                    title={p.title}
                                  >
                                    {p.title}
                                  </span>
                                )}
                              </span>
                              {!railCollapsed && (
                                <span className="ml-1.5 shrink-0 font-mono text-xs text-muted-foreground">
                                  {fmtMs(p.durationMs)}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-semibold text-xs text-foreground">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
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

          {/* Sidebar Footer — trạng thái dịch vụ thật (API + AI worker) */}
          <SystemStatus
            workerState={workerState}
            apiState={projectsError ? "down" : "ok"}
            collapsed={railCollapsed}
          />
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isNleRoute && (
            <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-2 border-b border-zinc-800/40 bg-background/80 px-3 backdrop-blur-md md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleSidebar}
                  aria-label={isMobile ? "Mở menu" : "Thu gọn / mở rộng thanh bên"}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
                  <Link href="/" className="text-muted-foreground hover:text-foreground">
                    Trang chủ
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate font-medium text-foreground">
                    {pathname === "/tools/avatar-svg"
                      ? "Avatar 2D — Phương án 1 (SVG Rig)"
                      : pathname === "/tools/avatar-rive"
                      ? "Avatar 2D — Phương án 2 (Rive / Mesh)"
                      : "Bảng điều khiển"}
                  </span>
                </nav>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
                className="h-8 shrink-0 gap-2 border-zinc-800 bg-zinc-900/80 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white"
                aria-label="Tìm dự án / Lệnh nhanh"
              >
                <Search className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Tìm dự án / Lệnh nhanh</span>
                <kbd className="ml-1 hidden rounded sm:inline border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                  ⌘K
                </kbd>
              </Button>
            </header>
          )}

          <main className={cn("flex-1", isNleRoute ? "h-full overflow-hidden p-0" : "p-4 md:p-6")}>
            {children}
          </main>

          {/* Trình dựng phim (NLE) cần màn hình rộng — báo rõ thay vì vỡ layout */}
          {isNleRoute && (
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background p-6 text-center lg:hidden">
              <MonitorSmartphone className="h-10 w-10 text-primary-text" aria-hidden />
              <div className="space-y-1">
                <p className="text-base font-semibold text-zinc-100">Trình dựng phim cần màn hình rộng hơn</p>
                <p className="text-sm text-zinc-400">
                  Hãy mở trang này trên máy tính hoặc cửa sổ rộng tối thiểu 1024px.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/">Về danh sách dự án</Link>
              </Button>
            </div>
          )}
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

function SystemStatus({
  workerState,
  apiState,
  collapsed,
}: {
  workerState: ServiceState;
  apiState: ServiceState;
  collapsed: boolean;
}) {
  const down = workerState === "down" || apiState === "down";
  const checking = !down && workerState === "checking";
  const label = checking
    ? "Đang kiểm tra hệ thống…"
    : apiState === "down" && workerState === "down"
      ? "API & AI Worker mất kết nối"
      : apiState === "down"
        ? "API mất kết nối"
        : workerState === "down"
          ? "AI Worker mất kết nối"
          : "Hệ thống sẵn sàng";
  const tone = checking
    ? { box: "bg-zinc-800 text-zinc-400", dot: "bg-zinc-500 animate-pulse" }
    : down
      ? { box: "bg-red-500/15 text-red-400", dot: "bg-red-400" }
      : { box: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-400" };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          aria-live="polite"
          aria-label={label}
          className="flex items-center justify-center gap-2 border-t border-zinc-800/40 p-2.5"
        >
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tone.box)}>
            <Cpu className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <span className="flex flex-1 items-center gap-1.5 truncate text-xs font-medium">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} />
              <span className="truncate">{label}</span>
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <p>API: {apiState === "down" ? "mất kết nối" : "OK"}</p>
        <p>AI Worker: {workerState === "checking" ? "đang kiểm tra" : workerState === "down" ? "mất kết nối" : "OK"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
