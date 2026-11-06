"""Remotion MP4 Renderer & YouTube Data API v3 Uploader."""
import json
import logging
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

from . import config

log = logging.getLogger(__name__)

ROOT_DIR = config.STORAGE_DIR.parent
VIDEO_ENGINE_DIR = ROOT_DIR / "packages" / "video-engine"
UPLOAD_SCRIPT = Path(
    "/Users/flnam2001/.gemini/config/plugins/google-antigravity-sdk/skills/youtube-upload/scripts/upload.py"
)
SECRETS_FILE = ROOT_DIR / "client_secrets.json"
TOKEN_FILE = ROOT_DIR / "token.json"
MEDIA_BASE_URL = "http://localhost:9090/media"


def resolve_video_file(file_or_url: str) -> Path:
    """Resolve a media URL, relative storage path, or absolute path to a local MP4 file."""
    raw = file_or_url.strip().split("#")[0].split("?")[0]
    if raw.startswith(MEDIA_BASE_URL + "/"):
        rel = raw[len(MEDIA_BASE_URL) + 1 :]
        return config.STORAGE_DIR / rel
    p = Path(raw)
    if p.is_absolute() and p.exists():
        return p
    candidate = config.STORAGE_DIR / raw
    if candidate.exists():
        return candidate
    raise FileNotFoundError(f"Không tìm thấy file video: {file_or_url}")


def render_video(project_id: str, composition_id: str, input_props: dict) -> dict:
    """Render a Remotion composition to MP4 in storage/renders/."""
    renders_dir = config.STORAGE_DIR / "renders"
    renders_dir.mkdir(parents=True, exist_ok=True)

    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", project_id or "project")
    if composition_id == "VtvNewsTemplate":
        safe_comp = "VtvNewsTemplate"
    elif composition_id == "FootballShortVideo":
        safe_comp = "FootballShortVideo"
    elif composition_id == "ProductCommercialVideo":
        safe_comp = "ProductCommercialVideo"
    else:
        safe_comp = "StoryVideo"

    props_path = renders_dir / f"{safe_id}_{safe_comp}_props.json"
    out_path = renders_dir / f"{safe_id}_{safe_comp}.mp4"

    def to_abs_url(url: str | None) -> str | None:
        if not url:
            return url
        url_clean = str(url).strip()
        if not url_clean:
            return url_clean
        if url_clean.startswith("blob:"):
            return f"{MEDIA_BASE_URL}/035e4ce0-cb0a-42fb-a9a3-22d35c0bd275/images/scene_001_1792999583.jpeg"
        if url_clean.startswith("http://") or url_clean.startswith("https://") or url_clean == "none":
            return url_clean
        clean_rel = url_clean.lstrip("/")
        if clean_rel.startswith("media/"):
            clean_rel = clean_rel[len("media/"):]
        return f"{MEDIA_BASE_URL}/{clean_rel}"

    # Sanitize all media URLs to absolute URLs so headless Chromium never 404s
    if "bgmUrl" in input_props:
        input_props["bgmUrl"] = to_abs_url(input_props.get("bgmUrl"))
    if "audioUrl" in input_props:
        input_props["audioUrl"] = to_abs_url(input_props.get("audioUrl"))

    for sc in input_props.get("scenes", []):
        sc["imageUrl"] = to_abs_url(sc.get("imageUrl"))
        for lay in sc.get("layers", []):
            if isinstance(lay, dict) and "mediaUrl" in lay:
                lay["mediaUrl"] = to_abs_url(lay.get("mediaUrl"))

    bc = input_props.get("broadcastConfig")
    if isinstance(bc, dict) and "backgroundVideoUrl" in bc:
        bc["backgroundVideoUrl"] = to_abs_url(bc.get("backgroundVideoUrl"))

    props_path.write_text(json.dumps(input_props, ensure_ascii=False, indent=2), encoding="utf-8")

    cmd = [
        "node",
        "scripts/render.mjs",
        "--props",
        str(props_path),
        "--comp",
        safe_comp,
        "--out",
        str(out_path),
    ]
    log.info("Running Remotion render: %s", " ".join(cmd))
    proc = subprocess.run(
        cmd,
        cwd=str(VIDEO_ENGINE_DIR),
        capture_output=True,
        text=True,
        timeout=600,
        check=False,
    )
    if proc.returncode != 0 or not out_path.exists():
        err_msg = (proc.stderr or proc.stdout or "Render failed")[-800:]
        raise RuntimeError(f"Lỗi Render Remotion: {err_msg}")

    rel_path = out_path.relative_to(config.STORAGE_DIR).as_posix()
    return {
        "videoUrl": f"{MEDIA_BASE_URL}/{rel_path}",
        "filePath": str(out_path),
        "relativePath": rel_path,
    }


def suggest_youtube_metadata(
    title: str,
    script: str,
    headlines: list[str] | None = None,
) -> dict:
    """Generate SEO-optimized YouTube Shorts title, description, hashtags, and tags."""
    headline_str = " ".join(headlines or []).strip()
    base_title = headline_str or title or "Tin nóng bóng đá hôm nay"

    if config.GROQ_API_KEY:
        prompt = f"""Bạn là chuyên gia SEO YouTube Shorts bóng đá.
Dựa trên tiêu đề và kịch bản dưới đây, hãy viết bộ Metadata chuẩn SEO YouTube Shorts (tiếng Việt):
- `title`: Tiêu đề giật tít hấp dẫn dưới 90 ký tự, có kết thúc bằng #Shorts
- `description`: Mô tả 2-3 câu tóm tắt kịch tính + câu hỏi kêu gọi bình luận + 5 hashtag chuẩn ở cuối (ví dụ: #bongda #elclasico #realmadrid #barcelona #shorts)
- `keywords`: Danh sách 8-12 từ khóa cách nhau bởi dấu phẩy (ví dụ: bóng đá, tin bóng đá, el clasico, mbappe, real madrid, barcelona, shorts)

Tiêu đề: {base_title}
Kịch bản: {script}

Trả về JSON hợp lệ:
{{
  "title": "string",
  "description": "string",
  "keywords": "string"
}}"""
        try:
            body = json.dumps(
                {
                    "model": config.GROQ_MODEL,
                    "response_format": {"type": "json_object"},
                    "temperature": 0.4,
                    "messages": [{"role": "user", "content": prompt}],
                }
            ).encode()
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=body,
                headers={
                    "Authorization": f"Bearer {config.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "Storytoon/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=25) as r:
                raw = json.loads(r.read())["choices"][0]["message"]["content"]
            parsed = json.loads(raw)
            if parsed.get("title") and parsed.get("description"):
                return {
                    "title": parsed["title"][:98],
                    "description": parsed["description"],
                    "keywords": parsed.get(
                        "keywords", "bóng đá, tin nóng bóng đá, người đá bóng, shorts"
                    ),
                }
        except Exception as e:  # noqa: BLE001
            log.warning("Groq metadata fallback: %s", e)

    short_title = f"{base_title[:85]} #Shorts"
    desc = (
        f"{script.strip()}\n\n"
        "Đăng ký kênh Người Đá Bóng để cập nhật tin nóng bóng đá mỗi ngày!\n\n"
        "#bongda #tintucbongda #nguoidabong #laliga #shorts"
    )
    return {
        "title": short_title,
        "description": desc,
        "keywords": "bóng đá, tin nóng bóng đá, người đá bóng, kết quả bóng đá, shorts",
    }


def upload_to_youtube(
    file_or_url: str,
    title: str,
    description: str,
    keywords: str = "bóng đá, shorts",
    privacy: str = "unlisted",
    category: str = "17",
) -> dict:
    """Upload an MP4 file to YouTube using OAuth2 credentials and return the video URL."""
    video_path = resolve_video_file(file_or_url)

    cmd = [
        sys.executable,
        str(UPLOAD_SCRIPT),
        "--file",
        str(video_path),
        "--title",
        title.strip()[:100],
        "--description",
        description.strip(),
        "--keywords",
        keywords.strip(),
        "--privacy",
        privacy if privacy in ("public", "unlisted", "private") else "unlisted",
        "--category",
        category or "17",
        "--secrets",
        str(SECRETS_FILE),
        "--token",
        str(TOKEN_FILE),
    ]
    log.info("Uploading to YouTube: %s", video_path)
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    output = (proc.stdout or "") + "\n" + (proc.stderr or "")
    if proc.returncode != 0:
        raise RuntimeError(f"Lỗi đăng YouTube: {output[-600:]}")

    match = re.search(r"Video ID:\s*([A-Za-z0-9_-]+)", output)
    video_id = match.group(1) if match else ""
    return {
        "videoId": video_id,
        "watchUrl": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
        "shortsUrl": f"https://www.youtube.com/shorts/{video_id}" if video_id else "",
        "privacy": privacy,
    }
