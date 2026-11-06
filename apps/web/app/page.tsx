"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
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

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.title.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)
    );
  }, [projects, search]);

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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${projectTitle}" không?`)) {
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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bảng điều khiển Studio</h1>
          <p className="text-sm text-muted-foreground">
            Nhập kịch bản, tự động tạo giọng đọc VieNeu, tách phụ đề Whisper và chia phân cảnh bằng Groq AI.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fillSample} className="gap-2 self-start border-0">
          <Sparkles className="h-4 w-4 text-primary" />
          Điền kịch bản mẫu
        </Button>
      </div>

      {/* Top Metrics Row (Shadcn dashboard-01 block pattern) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tổng số dự án
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Lưu trữ trên PostgreSQL</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Đã phân cảnh xong
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.ready}</div>
            <p className="text-xs text-muted-foreground">Sẵn sàng gắn ảnh & dựng video</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tổng thời lượng Voice
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDuration}</div>
            <p className="text-xs text-muted-foreground">Đồng bộ word-level timestamps</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pipeline AI
            </CardTitle>
            <Wand2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Qwen 3.8 · 27B</div>
            <p className="text-xs text-muted-foreground">VieNeu TTS + Faster-Whisper</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Node-Based AI Pipeline Visualizer (@xyflow/react) */}
      <AiPipelineFlow
        wordCount={wordCount}
        selectedVoice={selectedVoice}
        aspectRatio={ratio}
        busy={busy}
      />

      {/* Main Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Create New Project Form (7 cols) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-primary" />
                  Khởi tạo Dự án Video Mới
                </CardTitle>
                <CardDescription>
                  Hệ thống sẽ sinh 1 file voice liền mạch, xuất phụ đề .srt/.vtt và chia scene kèm Image Prompt.
                </CardDescription>
              </div>
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
                <Label>Tỷ lệ khung hình</Label>
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tỷ lệ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 — YouTube Ngang</SelectItem>
                    <SelectItem value="9:16">9:16 — TikTok / Shorts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Voice Selector + Preview */}
            <div className="space-y-2 rounded-xl bg-muted/25 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Mic className="h-4 w-4 text-primary" />
                  Chọn Giọng Đọc AI (VieNeu v3 Turbo & Edge Neural)
                </Label>
                <Badge variant="secondary" className="text-[11px] border-0">
                  {voices.length} giọng đọc
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[240px] flex-1">
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
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
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Đang tạo mẫu...
                    </>
                  ) : isPlayingPreview ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      Dừng nghe
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 text-primary" />
                      Nghe thử
                    </>
                  )}
                </Button>
              </div>

              {previewAudioUrl && (
                <audio
                  src={previewAudioUrl}
                  controls
                  className="mt-1 h-8 w-full rounded"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="project-script">Nội dung kịch bản (Script)</Label>
                <button
                  type="button"
                  onClick={fillSample}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Chèn đoạn trích mẫu
                </button>
              </div>
              <Textarea
                id="project-script"
                rows={14}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Dán toàn bộ kịch bản câu chuyện vào đây..."
                className="font-sans leading-relaxed"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-between gap-4 rounded-b-xl bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <strong className="text-foreground">{wordCount}</strong> từ
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Ước tính ~<strong className="text-foreground">{estimatedSec}s</strong>
              </span>
            </div>

            <Button
              size="lg"
              disabled={busy || !title.trim() || !script.trim()}
              onClick={handleCreate}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang khởi tạo pipeline...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Tạo Voice & Phân cảnh AI
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Right: Existing Projects List (5 cols) */}
        <Card className="flex flex-col lg:col-span-5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Danh sách Dự án</CardTitle>
                <CardDescription>Bấm vào dự án để mở Studio chỉnh sửa cảnh</CardDescription>
              </div>
              <Badge variant="secondary" className="border-0">{projects.length} dự án</Badge>
            </div>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-4.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc trạng thái..."
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-3 overflow-y-auto max-h-[520px]">
            {loadingList && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải dự án...
              </div>
            )}

            {!loadingList && filteredProjects.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 py-12 text-center">
                <Film className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">Chưa có dự án nào phù hợp</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hãy điền kịch bản ở cột bên trái để bắt đầu.
                </p>
              </div>
            )}

            {filteredProjects.map((p) => {
              const isProduct = p.videoType === "product";
              const isFootball =
                !isProduct && (p.videoType === "football" || p.aspectRatio === "9:16");
              const targetHref = isProduct
                ? `/product?id=${p.id}`
                : isFootball
                  ? `/football?id=${p.id}`
                  : `/projects/${p.id}`;
              return (
                <Link
                  key={p.id}
                  href={targetHref}
                  className="group block rounded-xl bg-muted/25 p-4 transition-all hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold py-0 px-1.5 border-0",
                            isProduct
                              ? "text-emerald-400 bg-emerald-500/15"
                              : isFootball
                                ? "text-amber-400 bg-amber-500/15"
                                : "text-primary bg-primary/15"
                          )}
                        >
                          {isProduct
                            ? "🛍️ Video Sản Phẩm"
                            : isFootball
                              ? "⚽ Football Shorts"
                              : "🎬 Storytoon 2D"}
                        </Badge>
                      </div>
                      <h4
                        className="mt-1 truncate font-semibold text-foreground group-hover:text-primary transition-colors"
                        title={p.title}
                      >
                        {p.title}
                      </h4>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          {p.aspectRatio === "9:16" ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Monitor className="h-3 w-3" />
                          )}
                          {p.aspectRatio}
                        </span>
                        <span>·</span>
                        <span className="font-mono">{fmtMs(p.durationMs)}</span>
                        <span>·</span>
                        <span suppressHydrationWarning>
                          {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5">
                      {statusBadge(p.status)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProject(p.id, p.title);
                        }}
                        disabled={deletingId === p.id}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                        title="Xóa dự án này"
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary">
                      Mở Studio <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
