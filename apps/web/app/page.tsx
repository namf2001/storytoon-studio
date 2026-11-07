"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileText,
  Film,
  FolderKanban,
  Loader2,
  Mic,
  Monitor,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import {
  api,
  DEFAULT_VOICE_CATALOG,
  fmtMs,
  type ProjectSummary,
  type TtsVoice,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiPipelineFlow } from "@/components/ui/pipeline-flow";
import { useConfirmDialog, deleteProjectConfirm } from "@/components/ui/confirm-dialog";
import { ProjectThumbnail } from "@/components/ProjectThumbnail";
import { PROJECT_KINDS, projectHref, projectKind } from "@/lib/project-kind";
import { sceneModelLabel, useWorkerInfo } from "@/lib/system-info";

const SAMPLE_SCRIPT = `Hai tuần trước, bạn và Mai Trang chia tay. Vì nó phát hiện bạn dùng chính bạn bè của nó để tiếp khách VIP. Mai Trang rời khỏi phòng trọ, chặn số và cắt liên lạc hoàn toàn. Từ hôm đấy, hai người không còn gặp lại.

Còn bạn vẫn mắc kẹt trong hệ của bà Hân. Bà từng trả nợ, đưa bạn đứng tên các tài sản công ty. Nhưng bây giờ, mọi thứ đều được đẩy qua ông Tư. Tiền, xe, khách, danh sách người. Trà thì ông Tư uống, còn giấy bẩn thì đưa cho bạn ký.

Sáng hôm nay, ông Tư đưa cho bạn một yêu cầu mới: tuyển sáu cô gái, hai ngày một đêm, đi resort kín, khách VIP, ngoại hình ổn, biết giao tiếp, biết uống rượu, không tự ý bỏ đoàn. Bạn hỏi công việc cụ thể là gì anh? Ông Tư đáp: "Ăn uống, nói chuyện, đi cùng đoàn. Việc riêng thì khách tự nói."`;

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [voices, setVoices] = useState<TtsVoice[]>(DEFAULT_VOICE_CATALOG);
  const [selectedVoice, setSelectedVoice] = useState("Thiện Minh");
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, confirmDialog] = useConfirmDialog();
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const { info: workerInfo } = useWorkerInfo();
  const sceneModel = sceneModelLabel(workerInfo);

  useEffect(() => {
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));

    api
      .listVoices()
      .then((res) => {
        if (res.voices?.length) setVoices(res.voices);
      })
      .catch(() => {
        // fallback to DEFAULT_VOICE_CATALOG
      });
  }, []);

  const wordCount = useMemo(
    () => script.trim().split(/\s+/).filter(Boolean).length,
    [script]
  );
  const estimatedSec = Math.max(0, Math.round(wordCount / 2.8));

  const kindCounts = useMemo(() => {
    const counts = { storytoon: 0, football: 0, product: 0 };
    for (const p of projects) counts[projectKind(p)] += 1;
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (kindFilter === "all" || projectKind(p) === kindFilter) &&
        (!q || p.title.toLowerCase().includes(q))
    );
  }, [projects, search, kindFilter]);

  const stats = useMemo(() => {
    const readyCount = projects.filter((p) => p.status === "ready").length;
    const totalMs = projects.reduce((acc, p) => acc + (p.durationMs || 0), 0);
    return {
      total: projects.length,
      ready: readyCount,
      totalDuration: fmtMs(totalMs),
    };
  }, [projects]);

  async function handlePreviewVoice() {
    if (isPlayingPreview && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingPreview(false);
      return;
    }
    setPreviewingVoice(true);
    const toastId = toast.loading(`Đang tạo bản nghe thử giọng "${selectedVoice}"...`);
    try {
      const res = await api.previewVoice(selectedVoice, script);
      setPreviewAudioUrl(res.audioUrl);
      toast.success(`Đang phát giọng mẫu: ${selectedVoice}`, {
        id: toastId,
        description: `“${res.text}”`,
      });
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(res.audioUrl);
      audioRef.current = audio;
      setIsPlayingPreview(true);
      audio.onended = () => setIsPlayingPreview(false);
      audio.onerror = () => setIsPlayingPreview(false);
      await audio.play();
    } catch (e) {
      toast.error("Không thể nghe thử giọng đọc", {
        id: toastId,
        description: (e as Error).message,
      });
      setIsPlayingPreview(false);
    } finally {
      setPreviewingVoice(false);
    }
  }

  async function handleDeleteProject(id: string, projectTitle: string) {
    if (!(await confirm(deleteProjectConfirm(projectTitle)))) {
      return;
    }
    setDeletingId(id);
    const toastId = toast.loading(`Đang xóa dự án "${projectTitle}"...`);
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Đã xóa dự án "${projectTitle}"`, { id: toastId });
    } catch (e) {
      toast.error("Không thể xóa dự án", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    if (!title.trim() || !script.trim()) return;
    setBusy(true);
    setError("");
    try {
      const p = await api.createProject({ title, script, aspectRatio: ratio, videoType: "storytoon" });
      await api.processProject(p.id, selectedVoice);
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function fillSample() {
    if (!title.trim()) setTitle("Gái đi tour — Phần 1 (Bản thử nghiệm)");
    setScript(SAMPLE_SCRIPT);
  }

  function statusBadge(status: string) {
    switch (status) {
      case "ready":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Sẵn sàng
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Đang xử lý AI
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Lỗi
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {confirmDialog}
      {/* Page heading + compact stats */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Bảng điều khiển</h1>
          <p className="text-sm text-muted-foreground">
            Nhập kịch bản → giọng đọc AI → phụ đề từng từ → chia phân cảnh
            {sceneModel ? ` (${sceneModel})` : ""} → dựng video.
          </p>
        </div>
        <dl className="flex flex-wrap gap-2 text-xs" aria-label="Thống kê">
          <StatChip icon={FolderKanban} label="Dự án" value={String(stats.total)} />
          <StatChip
            icon={CheckCircle2}
            label="Sẵn sàng dựng"
            value={String(stats.ready)}
            valueClassName="text-emerald-400"
          />
          <StatChip icon={Clock} label="Tổng thời lượng" value={stats.totalDuration} />
        </dl>
      </div>

      <AiPipelineFlow
        wordCount={wordCount}
        selectedVoice={selectedVoice}
        aspectRatio={ratio}
        sceneModel={sceneModel ?? "AI"}
        whisperModel={workerInfo?.whisperModel}
        busy={busy}
      />

      {/* Main workspace: create form first, project list beside it */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-primary" aria-hidden />
                  Tạo dự án mới
                </CardTitle>
                <CardDescription>
                  Tạo một file giọng đọc liền mạch, phụ đề .srt/.vtt và danh sách phân cảnh kèm gợi ý hình ảnh.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={fillSample}
                className="shrink-0 gap-1.5 border-0"
              >
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <span className="hidden sm:inline">Dùng kịch bản mẫu</span>
                <span className="sm:hidden">Mẫu</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-title">Tiêu đề dự án</Label>
                <Input
                  id="project-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Tại sao thật tệ khi là Gái đi tour?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-ratio">Tỷ lệ khung hình</Label>
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger id="project-ratio">
                    <SelectValue placeholder="Chọn tỷ lệ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 — YouTube ngang</SelectItem>
                    <SelectItem value="9:16">9:16 — TikTok / Shorts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Voice selector + preview */}
            <div className="space-y-2 rounded-xl bg-muted/25 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="project-voice" className="flex items-center gap-1.5 text-sm font-semibold">
                  <Mic className="h-4 w-4 text-primary" aria-hidden />
                  Giọng đọc AI
                </Label>
                <Badge variant="secondary" className="border-0 text-[11px]">
                  {voices.length} giọng
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[200px] flex-1">
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger id="project-voice">
                      <SelectValue placeholder="Chọn giọng đọc..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {voices.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant={isPlayingPreview ? "destructive" : "secondary"}
                  disabled={previewingVoice}
                  onClick={handlePreviewVoice}
                  className="gap-1.5"
                >
                  {previewingVoice ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                      Đang tạo mẫu...
                    </>
                  ) : isPlayingPreview ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                      Dừng nghe
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 text-primary" aria-hidden />
                      Nghe thử
                    </>
                  )}
                </Button>
              </div>

              {previewAudioUrl && (
                <audio src={previewAudioUrl} controls className="mt-1 h-8 w-full rounded" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-script">Nội dung kịch bản</Label>
              <Textarea
                id="project-script"
                rows={12}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Dán toàn bộ kịch bản câu chuyện vào đây..."
                className="font-sans leading-relaxed"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-between gap-4 rounded-b-xl bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                <strong className="text-foreground">{wordCount}</strong> từ
              </span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Ước tính ~<strong className="text-foreground">{estimatedSec}s</strong>
              </span>
            </div>

            <Button
              size="lg"
              disabled={busy || !title.trim() || !script.trim()}
              onClick={handleCreate}
              className="w-full sm:w-auto"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" aria-hidden />
                  Tạo giọng đọc & phân cảnh
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Project list */}
        <Card className="flex flex-col lg:col-span-5">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Dự án của bạn</CardTitle>
                <CardDescription>Bấm vào dự án để mở trình dựng phim</CardDescription>
              </div>
              <Badge variant="secondary" className="border-0">
                {projects.length} dự án
              </Badge>
            </div>

            <div role="tablist" aria-label="Lọc theo loại video" className="flex flex-wrap gap-1.5">
              {KIND_FILTERS.map((k) => {
                const count = k === "all" ? projects.length : kindCounts[k];
                const selected = kindFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setKindFilter(k)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {k === "all" ? "Tất cả" : PROJECT_KINDS[k].label}
                    <span className={cn("font-mono text-[11px]", selected ? "opacity-80" : "opacity-60")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên dự án..."
                aria-label="Tìm dự án"
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="max-h-[620px] flex-1 space-y-2 overflow-y-auto">
            {loadingList && (
              <div role="status" className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Đang tải dự án...
              </div>
            )}

            {!loadingList && filteredProjects.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 py-12 text-center">
                <Film className="mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium">
                  {projects.length === 0 ? "Chưa có dự án nào" : "Không có dự án phù hợp"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {projects.length === 0
                    ? "Điền kịch bản ở form bên cạnh để bắt đầu."
                    : "Thử bỏ bộ lọc hoặc đổi từ khoá tìm kiếm."}
                </p>
              </div>
            )}

            {filteredProjects.map((p) => {
              const meta = PROJECT_KINDS[projectKind(p)];
              const KindIcon = meta.icon;
              const displayTitle = stripLeadingEmoji(p.title);
              return (
                <div
                  key={p.id}
                  className="group relative flex gap-3 rounded-xl bg-muted/25 p-3 transition-colors focus-within:ring-1 focus-within:ring-primary/50 hover:bg-muted/40"
                >
                  <ProjectThumbnail
                    url={p.thumbnailUrl}
                    className={p.aspectRatio === "9:16" ? "h-20 w-[45px]" : "h-[45px] w-20 self-center"}
                  />

                  <div className="min-w-0 flex-1">
                    <h4
                      className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
                      title={p.title}
                    >
                      {/* Stretched link: cả thẻ bấm được, nhưng nút Xoá không nằm trong <a> */}
                      <Link
                        href={projectHref(p)}
                        className="outline-none after:absolute after:inset-0 after:rounded-xl"
                      >
                        {displayTitle}
                      </Link>
                    </h4>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className={cn("inline-flex items-center gap-1 font-medium", meta.tone)}>
                        <KindIcon className="h-3 w-3" aria-hidden />
                        {meta.label}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {p.aspectRatio === "9:16" ? (
                          <Smartphone className="h-3 w-3" aria-hidden />
                        ) : (
                          <Monitor className="h-3 w-3" aria-hidden />
                        )}
                        {p.aspectRatio}
                      </span>
                      <span className="font-mono">{fmtMs(p.durationMs)}</span>
                      <span suppressHydrationWarning>
                        {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    {statusBadge(p.status)}
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(p.id, p.title)}
                      disabled={deletingId === p.id}
                      className="relative z-10 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
                      title="Xoá dự án này"
                      aria-label={`Xoá dự án ${displayTitle}`}
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const KIND_FILTERS = ["all", "storytoon", "football", "product"] as const;
type KindFilter = (typeof KIND_FILTERS)[number];

/** Titles often start with a decorative emoji; the kind label already says what it is. */
function stripLeadingEmoji(title: string): string {
  return title.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trim() || title;
}

function StatChip({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono text-sm font-semibold text-foreground", valueClassName)}>{value}</dd>
    </div>
  );
}
