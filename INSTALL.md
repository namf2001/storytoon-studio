# 🛠️ Hướng dẫn cài đặt Storytoon Studio (rac-vl)

Hướng dẫn từng bước chạy toàn bộ hệ thống trên máy local (macOS / Linux).

```
apps/web        Next.js Studio (NLE Timeline, Scene/Program Monitor)   → http://localhost:3000
apps/api        Go REST API + Postgres                                  → http://localhost:9090
apps/ai-worker  Python FastAPI: VieNeu-TTS, faster-whisper, Gemini/Groq  → http://localhost:8000
packages/       shared-types + video-engine (Remotion render MP4)
storage/        Audio / caption / ảnh / video xuất (tự tạo, không commit)
```

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản | Cài đặt (macOS) |
|---|---|---|
| Node.js | ≥ 20 (khuyên dùng 22/24) | `brew install node` |
| pnpm | 10.x | `npm i -g pnpm@10` hoặc `corepack enable` |
| Go | ≥ 1.26 | `brew install go` |
| Python | 3.10 – 3.12 (khuyên dùng 3.11) | `brew install python@3.11` |
| Docker | Docker Desktop / OrbStack | để chạy Postgres |
| ffmpeg, espeak | bản mới nhất | `brew install ffmpeg espeak` |

> [!NOTE]
> `espeak` là bắt buộc cho VieNeu-TTS; `ffmpeg` dùng cho Whisper và render video.

---

## 2. Clone & cấu hình biến môi trường

```bash
git clone <repo-url> rac-vl
cd rac-vl
cp .env.example .env
```

Mở `.env` và điền các key cần thiết:

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `GEMINI_API_KEY` | Khuyến nghị | Chia phân cảnh + sinh prompt ảnh. Không có sẽ dùng heuristic |
| `GROQ_API_KEY` | Tuỳ chọn | LLM thay thế (nhanh, free tier) |
| `HF_TOKEN` | Tuỳ chọn | Tải model từ HuggingFace |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | Tuỳ chọn | Cloudflare Workers AI (vẽ ảnh FLUX) |
| `VIENEU_VOICE` | Tuỳ chọn | Giọng mặc định, ví dụ `Thiện Minh` |
| `WHISPER_MODEL` | Tuỳ chọn | `tiny` / `base` / `small` / `medium` / `large-v3` |

Cổng mặc định: API `9090`, Web `3000`, AI worker `8000`. Nếu đổi `API_PORT`, nhớ đổi luôn `API_PUBLIC_URL` và `NEXT_PUBLIC_API_URL`.

---

## 3. Khởi động Postgres

```bash
docker compose up -d
```

Lần chạy đầu tiên, file `apps/api/migrations/*.sql` sẽ tự động được áp dụng để tạo bảng.

Kiểm tra: `docker compose ps` → container `postgres` ở trạng thái `running`.

---

## 4. Cài dependencies JavaScript

```bash
pnpm install
```

---

## 5. Cài AI worker (Python, chỉ làm lần đầu)

```bash
cd apps/ai-worker
python3.11 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
cd ../..
```

> [!TIP]
> Lần chạy đầu tiên, VieNeu-TTS và faster-whisper sẽ tải model (vài trăm MB → vài GB tuỳ `WHISPER_MODEL`), nên lần đầu sẽ hơi chậm.

---

## 6. Cài module Go cho API

```bash
cd apps/api && go mod download && cd ../..
```

---

## 7. Chạy toàn bộ hệ thống

```bash
pnpm dev
```

Turbo sẽ chạy song song cả 3 service `web` + `api` + `ai-worker`.

Mở **http://localhost:3000**, sau đó:
- **Video sản phẩm (9:16):** http://localhost:3000/product
- **Video bóng đá / bản tin:** http://localhost:3000/football

Muốn chạy riêng từng service:

```bash
pnpm --filter @storytoon/web dev        # :3000
pnpm --filter @storytoon/api dev        # :9090
pnpm --filter @storytoon/ai-worker dev  # :8000
```

---

## 8. Xuất video MP4

Có 2 cách:
- Trong Studio, chuyển sang tab **Deliver (Xuất Video)** rồi bấm Render.
- Hoặc dùng CLI:

```bash
pnpm --filter @storytoon/video-engine render <projectId> 9:16   # hoặc 16:9
# → storage/<projectId>/video_9x16.mp4
```

---

## 9. Kiểm tra code

```bash
pnpm typecheck   # TypeScript toàn monorepo
pnpm build       # build web + api
```

---

## 10. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân & cách xử lý |
|---|---|
| `@storytoon/api#dev exited (1)` | Postgres chưa chạy → `docker compose up -d`. Hoặc cổng `9090` đang bị chiếm (script dev đã tự kill cổng cũ) |
| Web báo `Failed to fetch` | Kiểm tra `NEXT_PUBLIC_API_URL` khớp với `API_PORT`, rồi restart `pnpm dev` |
| `.venv/bin/uvicorn: not found` | Chưa làm bước 5 (tạo venv cho AI worker) |
| VieNeu lỗi `espeak not found` | `brew install espeak` |
| Whisper chạy quá chậm | Đặt `WHISPER_MODEL=base` hoặc `tiny` |
| Muốn xoá sạch DB | `docker compose down -v && docker compose up -d` |

---

## 11. Bảo mật

Các file sau **không bao giờ được commit** (đã có trong `.gitignore`):
`.env`, `apps/web/.env.local`, `client_secrets.json`, `token.json` (OAuth YouTube), `storage/`.

Để upload YouTube, đặt `client_secrets.json` (OAuth Desktop App lấy từ Google Cloud Console) ở thư mục gốc. Lần đầu upload sẽ mở trình duyệt để xác thực và tự tạo `token.json`.
