"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Film,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  projectId: string;
  compositionId: "FootballShortVideo" | "StoryVideo" | "VtvNewsTemplate" | "ProductCommercialVideo";
  inputProps: Record<string, unknown>;
  defaultTitle: string;
  script: string;
  headlines?: string[];
}

/** Unified panel to render a Remotion composition to MP4 and upload directly to YouTube. */
export function RenderAndYoutubePanel({
  projectId,
  compositionId,
  inputProps,
  defaultTitle,
  script,
  headlines = [],
}: Props) {
  const [rendering, setRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState("");
  const [renderedFilePath, setRenderedFilePath] = useState("");

  const [ytTitle, setYtTitle] = useState("");
  const [ytDesc, setYtDesc] = useState("");
  const [ytKeywords, setYtKeywords] = useState(
    "bóng đá, tin nóng bóng đá, el clasico, real madrid, barcelona, mbappe, shorts"
  );
  const [ytPrivacy, setYtPrivacy] = useState<"public" | "unlisted" | "private">("public");

  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    videoId: string;
    watchUrl: string;
    shortsUrl: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const cleanTitle =
      headlines.length > 0
        ? `${headlines.join(" ")} #Shorts`
        : `${defaultTitle.replace(/^\[.*?\]\s*/, "")} #Shorts`;
    setYtTitle(cleanTitle.slice(0, 98));
    setYtDesc(
      `${script.trim()}\n\nĐăng ký kênh để cập nhật tin nóng bóng đá mỗi ngày!\n\n#bongda #elclasico #realmadrid #barcelona #shorts`
    );
  }, [defaultTitle, script, headlines]);

  async function handleSuggestMeta() {
    setGeneratingMeta(true);
    setError("");
    const toastId = toast.loading("Đang tối ưu Tiêu đề, Mô tả & Hashtag YouTube bằng AI...");
    try {
      const meta = await api.suggestYoutubeMetadata(defaultTitle, script, headlines);
      setYtTitle(meta.title);
      setYtDesc(meta.description);
      setYtKeywords(meta.keywords);
      toast.success("Đã tạo xong Metadata chuẩn SEO YouTube Shorts!", { id: toastId });
    } catch (e) {
      setError((e as Error).message);
      toast.error("Lỗi tạo Metadata YouTube", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setGeneratingMeta(false);
    }
  }

  async function handleRender(): Promise<string | null> {
    setRendering(true);
    setError("");
    const toastId = toast.loading("Đang kết xuất Video MP4 (1080p · 30fps) qua Remotion...");
    try {
      const res = await api.renderVideo(projectId, compositionId, inputProps);
      setRenderedVideoUrl(`${res.videoUrl}?t=${Date.now()}`);
      setRenderedFilePath(res.filePath);
      toast.success("Kết xuất MP4 hoàn tất!", {
        id: toastId,
        description: res.filePath.split("/").pop(),
      });
      return res.filePath;
    } catch (e) {
      setError((e as Error).message);
      toast.error("Lỗi kết xuất Remotion MP4", {
        id: toastId,
        description: (e as Error).message,
      });
      return null;
    } finally {
      setRendering(false);
    }
  }

  async function handleUploadYoutube(autoRenderIfNeeded = true) {
    setError("");
    setUploadResult(null);
    let targetFile = renderedFilePath;

    if (!targetFile && autoRenderIfNeeded) {
      const rendered = await handleRender();
      if (!rendered) return;
      targetFile = rendered;
    }

    if (!targetFile) {
      setError("Vui lòng bấm Render MP4 trước khi đăng lên YouTube.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Đang tải video lên kênh YouTube qua OAuth2...");
    try {
      const res = await api.uploadYoutube({
        fileOrUrl: targetFile,
        title: ytTitle,
        description: ytDesc,
        keywords: ytKeywords,
        privacy: ytPrivacy,
        category: compositionId === "FootballShortVideo" ? "17" : "24",
      });
      setUploadResult(res);
      toast.success("Đã đăng video lên YouTube thành công!", {
        id: toastId,
        description: res.shortsUrl,
      });
    } catch (e) {
      setError((e as Error).message);
      toast.error("Lỗi đăng YouTube", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Step 1: Render MP4 */}
      <div className="rounded-xl bg-muted/20 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">Bước 1</Badge>
            <span className="text-xs font-semibold">
              Kết xuất Video MP4 (1080p · 30fps)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {renderedVideoUrl && (
              <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
                <a href={renderedVideoUrl} download={`${projectId}.mp4`}>
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  Tải MP4
                </a>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={rendering || uploading}
              onClick={handleRender}
              className="h-8 gap-1.5 text-xs"
            >
              {rendering ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang Render Remotion...
                </>
              ) : (
                <>
                  <Film className="h-3.5 w-3.5" />
                  {renderedVideoUrl ? "Render lại MP4" : "Render Video MP4"}
                </>
              )}
            </Button>
          </div>
        </div>

        {rendering && (
          <div className="space-y-1">
            <progress className="h-1.5 w-full overflow-hidden rounded bg-muted accent-primary" />
            <p className="text-[11px] text-muted-foreground">
              Đang ghép cảnh, hiệu ứng âm thanh, giọng đọc và xuất file MP4...
            </p>
          </div>
        )}

        {renderedVideoUrl && !rendering && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Đã xuất xong file MP4: <code className="text-[11px]">{renderedFilePath.split("/").pop()}</code>
            </span>
            <a
              href={renderedVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 underline hover:text-white"
            >
              Mở file <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Step 2: YouTube Upload */}
      <div className="rounded-xl bg-muted/20 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 text-white hover:bg-red-500">Bước 2</Badge>
            <span className="text-xs font-semibold">
              Đăng trực tiếp lên YouTube Shorts
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={generatingMeta}
            onClick={handleSuggestMeta}
            className="h-7 gap-1 px-2.5 text-[11px]"
          >
            {generatingMeta ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3 text-primary" />
            )}
            AI Tối ưu SEO & Hashtag
          </Button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-12">
          <div className="sm:col-span-8 space-y-1">
            <Label className="text-xs">Tiêu đề YouTube (#Shorts)</Label>
            <Input
              value={ytTitle}
              onChange={(e) => setYtTitle(e.target.value)}
              className="h-8 text-xs font-medium"
            />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-xs">Chế độ hiển thị</Label>
            <Select
              value={ytPrivacy}
              onValueChange={(v) => setYtPrivacy(v as "public" | "unlisted" | "private")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public" className="text-xs">
                  Công khai (Public)
                </SelectItem>
                <SelectItem value="unlisted" className="text-xs">
                  Không công khai (Unlisted)
                </SelectItem>
                <SelectItem value="private" className="text-xs">
                  Riêng tư (Private)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Mô tả & Hashtag</Label>
          <Textarea
            rows={3}
            value={ytDesc}
            onChange={(e) => setYtDesc(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Từ khóa (Tags)</Label>
          <Input
            value={ytKeywords}
            onChange={(e) => setYtKeywords(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            disabled={uploading || rendering || !ytTitle.trim()}
            onClick={() => handleUploadYoutube(true)}
            className="h-9 gap-2 bg-red-600 text-white hover:bg-red-500 text-xs font-semibold"
          >
            {uploading || rendering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {rendering ? "Đang Render MP4 (1/2)..." : "Đang tải lên YouTube (2/2)..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {renderedFilePath
                  ? "Đăng Video lên YouTube ngay"
                  : "Render MP4 & Đăng lên YouTube (1-Click)"}
              </>
            )}
          </Button>
        </div>

        {uploadResult && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Đăng YouTube thành công! (ID: {uploadResult.videoId})
            </div>
            <div className="flex flex-wrap gap-3 pt-0.5">
              <a
                href={uploadResult.shortsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-semibold text-amber-300 underline hover:text-white"
              >
                Mở link YouTube Shorts <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={uploadResult.watchUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-300 underline hover:text-white"
              >
                Mở link YouTube Watch <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
