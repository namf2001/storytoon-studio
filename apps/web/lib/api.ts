import type { Project, Scene } from "@storytoon/shared-types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9090";
export const AI_WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL ?? "http://localhost:8000";

interface Envelope<T> { code: string; message: string; data?: T }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, { cache: "no-store", ...init });
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || body.code !== "00") throw new Error(body.message || `HTTP ${res.status}`);
  return body.data as T;
}

export interface ProjectSummary {
  id: string; title: string; status: string; aspectRatio: string; videoType?: string; durationMs: number; createdAt: string;
}

export interface FootballPackageResponse {
  title: string;
  script: string;
  categoryText: string;
  headlines: string[];
  tickerText: string;
  articleImages: string[];
}

export interface ExtractedArticleResponse {
  url: string;
  title: string;
  text: string;
  images: string[];
}

export interface RenderVideoResponse {
  videoUrl: string;
  filePath: string;
  relativePath: string;
}

export interface YoutubeMetadataResponse {
  title: string;
  description: string;
  keywords: string;
}

export interface UploadYoutubeResponse {
  videoId: string;
  watchUrl: string;
  shortsUrl: string;
  privacy: string;
}

export interface TtsVoice {
  id: string;
  name: string;
  gender: "Nam" | "Nữ";
  style: string;
  engine: "vieneu" | "edge";
}

export interface VoicePreviewResponse {
  voiceId: string;
  text: string;
  audioUrl: string;
}

export const DEFAULT_VOICE_CATALOG: TtsVoice[] = [
  { id: "Duyên Hà My", name: "Duyên Hà My", gender: "Nữ", style: "Review Sản Phẩm · Giọng Nữ Cuốn Hút & Năng Động (Mặc định)", engine: "vieneu" },
  { id: "Mỹ Duyên", name: "Mỹ Duyên", gender: "Nữ", style: "Giọng Miền Nam · Đọc Truyện & Review Tự Nhiên", engine: "vieneu" },
  { id: "Thiện Minh", name: "Thiện Minh", gender: "Nam", style: "Bản tin Thể thao · Truyền cảm (Mặc định)", engine: "vieneu" },
  { id: "Quang Sơn", name: "Quang Sơn", gender: "Nam", style: "BLV Bóng đá · Kịch tính & Năng lượng", engine: "vieneu" },
  { id: "Hải Đăng", name: "Hải Đăng", gender: "Nam", style: "Bản tin Thể thao · Trẻ trung & Nhanh", engine: "vieneu" },
  { id: "Thái Sơn", name: "Thái Sơn", gender: "Nam", style: "Trầm ấm · Phóng sự & Phân tích chiến thuật", engine: "vieneu" },
  { id: "Đức Trí", name: "Đức Trí", gender: "Nam", style: "Điềm tĩnh · Kể chuyện chuyên sâu", engine: "vieneu" },
  { id: "Minh Đức", name: "Minh Đức", gender: "Nam", style: "Rõ ràng · Tin nhanh điểm báo", engine: "vieneu" },
  { id: "Thanh Bình", name: "Thanh Bình", gender: "Nam", style: "Chững chạc · Bình luận viên kỳ cựu", engine: "vieneu" },
  { id: "Xuân Vĩnh", name: "Xuân Vĩnh", gender: "Nam", style: "Ấm áp · Documentary & Hậu trường", engine: "vieneu" },
  { id: "Phạm Tuyên", name: "Phạm Tuyên", gender: "Nam", style: "Hào sảng · Kể chuyện lịch sử bóng đá", engine: "vieneu" },
  { id: "Adam bựa", name: "Adam bựa", gender: "Nam", style: "Hài hước · Meme & Troll bóng đá", engine: "vieneu" },
  { id: "Trúc Ly", name: "Trúc Ly", gender: "Nữ", style: "BTV Thể thao · Sắc sảo & Hiện đại", engine: "vieneu" },
  { id: "Mai Anh", name: "Mai Anh", gender: "Nữ", style: "Trong trẻo · Tin nóng 60 giây", engine: "vieneu" },
  { id: "Ngọc Linh", name: "Ngọc Linh", gender: "Nữ", style: "Truyền cảm · Kể chuyện cảm xúc", engine: "vieneu" },
  { id: "Thùy Dung", name: "Thùy Dung", gender: "Nữ", style: "Dịu dàng · Podcast & Tâm sự", engine: "vieneu" },
  { id: "Ngọc Huyền", name: "Ngọc Huyền", gender: "Nữ", style: "Tự nhiên · Review & Giải trí", engine: "vieneu" },
  { id: "Ngọc Trân", name: "Ngọc Trân", gender: "Nữ", style: "Ngọt ngào · Miền Nam thân thiện", engine: "vieneu" },
  { id: "edge:vi-VN-NamMinhNeural", name: "Nam Minh (Edge Neural)", gender: "Nam", style: "Microsoft Edge Neural · Chuẩn tốc độ cao", engine: "edge" },
  { id: "edge:vi-VN-HoaiMyNeural", name: "Hoài My (Edge Neural)", gender: "Nữ", style: "Microsoft Edge Neural · Nữ chuẩn truyền hình", engine: "edge" },
];

export const api = {
  listProjects: () => call<ProjectSummary[]>("/projects"),
  getProject: (id: string) => call<Project>(`/projects/${id}`),
  deleteProject: (id: string) => call<{ id: string }>(`/projects/${id}`, { method: "DELETE" }),
  createProject: (input: { title: string; script: string; aspectRatio: string; videoType?: string }) =>
    call<Project>("/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  processProject: (id: string, voiceId?: string) =>
    call<null>(`/projects/${id}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceId: voiceId ?? "Thiện Minh" }),
    }),
  listVoices: async (): Promise<{ voices: TtsVoice[] }> => {
    const res = await fetch(`${AI_WORKER_URL}/tts/voices`, { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  previewVoice: async (voiceId: string, text = ""): Promise<VoicePreviewResponse> => {
    const res = await fetch(`${AI_WORKER_URL}/tts/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice_id: voiceId, text }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateScene: (id: string, patch: Partial<Scene>) =>
    call<Scene>(`/scenes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
  saveProjectScenes: (id: string, scenes: Scene[]) =>
    call<Scene[]>(`/projects/${id}/scenes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenes }),
    }),
  updateProjectVoiceover: (
    id: string,
    input: {
      script?: string;
      audioUrl: string;
      captionSrtUrl?: string | null;
      captionVttUrl?: string | null;
      durationMs: number;
      words?: Array<{ text: string; startMs: number; endMs: number }>;
      status?: string;
    }
  ) =>
    call<Project>(`/projects/${id}/voiceover`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  uploadSceneImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return call<Scene>(`/scenes/${id}/image`, { method: "POST", body: fd });
  },
  uploadMediaFile: async (file: File): Promise<{ url: string; relativePath: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${AI_WORKER_URL}/media/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  generateSceneImage: (id: string, imagePrompt?: string) =>
    call<Scene>(`/scenes/${id}/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePrompt: imagePrompt ?? "" }),
    }),
  generateFootballPackage: async (topicOrUrl: string, script = ""): Promise<FootballPackageResponse> => {
    const res = await fetch(`${AI_WORKER_URL}/football/generate-package`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic_or_url: topicOrUrl, script }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  extractArticleMedia: async (url: string): Promise<ExtractedArticleResponse> => {
    const res = await fetch(`${AI_WORKER_URL}/football/extract-article`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  renderVideo: async (
    projectId: string,
    compositionId: "FootballShortVideo" | "StoryVideo" | "VtvNewsTemplate" | string,
    inputProps: Record<string, unknown>
  ): Promise<RenderVideoResponse> => {
    const res = await fetch(`${AI_WORKER_URL}/video/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        composition_id: compositionId,
        input_props: inputProps,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  suggestYoutubeMetadata: async (
    title: string,
    script: string,
    headlines: string[] = []
  ): Promise<YoutubeMetadataResponse> => {
    const res = await fetch(`${AI_WORKER_URL}/youtube/suggest-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, script, headlines }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  uploadYoutube: async (input: {
    fileOrUrl: string;
    title: string;
    description: string;
    keywords: string;
    privacy: "public" | "unlisted" | "private";
    category?: string;
  }): Promise<UploadYoutubeResponse> => {
    const res = await fetch(`${AI_WORKER_URL}/youtube/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_or_url: input.fileOrUrl,
        title: input.title,
        description: input.description,
        keywords: input.keywords,
        privacy: input.privacy,
        category: input.category ?? "17",
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export function fmtMs(ms: number): string {
  const s = ms / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}
