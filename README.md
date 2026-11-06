# 🎬 Storytoon Studio

Script → Voice (VieNeu local) → Caption (Whisper) → AI phân cảnh + image prompt → upload ảnh, chọn hiệu ứng → Remotion preview → MP4 (16:9 / 9:16) + .srt/.vtt

## Cấu trúc

```
apps/
  web/          Next.js studio (form scene + Remotion Player)        :3000
  api/          Go REST API (Asona conventions), Postgres             :8080
  ai-worker/    Python FastAPI: VieNeu-TTS, faster-whisper, Gemini    :8000
packages/
  shared-types/ Type dùng chung (Project, Scene, CaptionWord...)
  video-engine/ Remotion composition (scene + camera effect + kinetic caption) + script render
storage/        Audio, caption, ảnh, video xuất (tự tạo)
```

## Chạy local

> 📘 Hướng dẫn cài đặt chi tiết từng bước: xem [INSTALL.md](./INSTALL.md)

```bash
cp .env.example .env              # điền GEMINI_API_KEY (không có sẽ dùng chia scene heuristic)
brew install espeak ffmpeg        # VieNeu cần espeak
docker compose up -d              # Postgres + tự chạy migrations
pnpm install

# AI worker (lần đầu)
cd apps/ai-worker && pnpm setup && cd ../..

pnpm dev                          # chạy web + api + ai-worker qua turbo
```

Mở http://localhost:3000 → dán script → **Tạo voice + phân cảnh**.

## Xuất video

```bash
pnpm --filter @storytoon/video-engine render <projectId> 16:9   # hoặc 9:16
# → storage/<projectId>/video_16x9.mp4
```

## API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/projects` | Danh sách dự án |
| POST | `/api/v1/projects` | Tạo dự án `{title, script, aspectRatio}` |
| GET | `/api/v1/projects/:id` | Chi tiết + scenes + words |
| POST | `/api/v1/projects/:id/process` | Chạy pipeline AI (async) |
| PATCH | `/api/v1/scenes/:id` | Sửa `cameraEffect`, `transition`, `imagePrompt`, `showCaption` |
| POST | `/api/v1/scenes/:id/image` | Upload ảnh (multipart `image`) |
| GET | `/media/*` | File tĩnh trong `storage/` |

## Biến môi trường AI worker

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `VIENEU_VOICE` | (giọng mặc định) | ID preset voice của VieNeu |
| `VIENEU_REF_AUDIO` | | File wav 3-5s để clone giọng |
| `TTS_FALLBACK_EDGE` | `1` | Lỗi VieNeu thì fallback Edge-TTS |
| `WHISPER_MODEL` | `small` | `tiny`/`base`/`small`/`medium`/`large-v3` |
| `TARGET_SCENE_SEC` | `6` | Độ dài mong muốn mỗi scene |
