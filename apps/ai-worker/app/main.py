"""FastAPI entrypoint for the AI worker."""
import logging
import re
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config
from .captions import transcribe, write_captions
from .football import download_remote_image, extract_article_media, generate_football_package
from .image_gen import generate_scene_image
from .render_upload import render_video, suggest_youtube_metadata, upload_to_youtube
from .scenes import breakdown
from .tts import DEFAULT_VIENEU_VOICE, VOICE_CATALOG, synthesize, synthesize_preview

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Storytoon AI Worker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    """Input for the full audio + scene pipeline."""
    project_id: str
    script: str
    voice_id: str = DEFAULT_VIENEU_VOICE
    video_type: str = ""


class VoicePreviewRequest(BaseModel):
    """Input for previewing a TTS voice with optional custom text."""
    voice_id: str = DEFAULT_VIENEU_VOICE
    text: str = ""


class GenerateImageRequest(BaseModel):
    """Input for generating a 2D cartoon illustration for a single scene."""
    project_id: str
    scene_index: int
    prompt: str
    aspect_ratio: str = "16:9"
    seed: int | None = None


class ExtractArticleRequest(BaseModel):
    """Input for scraping images and content from a sports news article URL."""
    url: str


class FootballPackageRequest(BaseModel):
    """Input for generating a Football Short script and broadcast headlines."""
    topic_or_url: str
    script: str = ""


class RemoteImageRequest(BaseModel):
    """Input for attaching a remote press photo URL to a scene."""
    project_id: str
    scene_index: int
    image_url: str


class RenderVideoRequest(BaseModel):
    """Input for rendering a Remotion composition to MP4."""
    project_id: str
    composition_id: str = "FootballShortVideo"
    input_props: dict


class SuggestYoutubeMetaRequest(BaseModel):
    """Input for generating SEO-optimized YouTube Shorts metadata."""
    title: str = ""
    script: str = ""
    headlines: list[str] = []


class UploadYoutubeRequest(BaseModel):
    """Input for uploading a rendered MP4 file to YouTube."""
    file_or_url: str
    title: str
    description: str
    keywords: str = "bóng đá, shorts"
    privacy: str = "unlisted"
    category: str = "17"


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/tts/voices")
def list_tts_voices():
    """Returns the catalog of available VieNeu-TTS v3 Turbo and Edge-TTS voices."""
    return {"voices": VOICE_CATALOG}


@app.post("/tts/preview")
def preview_tts_voice(req: VoicePreviewRequest):
    """Synthesizes a short audio preview for the selected voice and returns its HTTP media URL."""
    try:
        return synthesize_preview(req.voice_id, req.text)
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to preview TTS voice")
        raise HTTPException(502, str(e)) from e


@app.post("/media/upload")
async def media_upload(file: UploadFile = File(...)):
    """Uploads an image or video file into storage/uploads/ and returns its HTTP media URL."""
    uploads_dir = config.STORAGE_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "media.mp4")
    out_name = f"{int(time.time() * 1000)}_{safe_name}"
    out_path = uploads_dir / out_name
    content = await file.read()
    out_path.write_bytes(content)
    is_vid = safe_name.lower().endswith((".mp4", ".webm", ".mov"))
    url = f"http://localhost:9090/media/uploads/{out_name}"
    if is_vid:
        url += "#crop=50,50,1,0&v=1"
    return {"url": url, "relativePath": f"uploads/{out_name}"}


@app.post("/football/extract-article")
def football_extract_article(req: ExtractArticleRequest):
    """Scrapes high-res press photos and article text from a news URL."""
    try:
        return extract_article_media(req.url.strip())
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to extract article media")
        raise HTTPException(502, str(e)) from e


@app.post("/football/generate-package")
def football_generate_package(req: FootballPackageRequest):
    """Generates Hook-Body-CTA football script + broadcast headlines + scraped images."""
    try:
        return generate_football_package(req.topic_or_url, req.script)
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to generate football package")
        raise HTTPException(502, str(e)) from e


@app.post("/football/attach-remote-image")
def football_attach_remote_image(req: RemoteImageRequest):
    """Downloads a remote image into project storage and returns its relative path."""
    try:
        rel_path = download_remote_image(req.project_id, req.scene_index, req.image_url)
        return {"imagePath": rel_path}
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to download remote image")
        raise HTTPException(502, str(e)) from e


@app.post("/video/render")
def video_render(req: RenderVideoRequest):
    """Renders a Remotion composition to an MP4 file in storage/renders/."""
    try:
        return render_video(req.project_id, req.composition_id, req.input_props)
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to render video")
        raise HTTPException(502, str(e)) from e


@app.post("/youtube/suggest-metadata")
def youtube_suggest_metadata(req: SuggestYoutubeMetaRequest):
    """Generates SEO title, description, hashtags, and tags for YouTube Shorts."""
    try:
        return suggest_youtube_metadata(req.title, req.script, req.headlines)
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to suggest YouTube metadata")
        raise HTTPException(502, str(e)) from e


@app.post("/youtube/upload")
def youtube_upload(req: UploadYoutubeRequest):
    """Uploads an MP4 file to YouTube using Google Data API v3."""
    if not req.title.strip():
        raise HTTPException(400, "title is empty")
    try:
        return upload_to_youtube(
            file_or_url=req.file_or_url,
            title=req.title,
            description=req.description,
            keywords=req.keywords,
            privacy=req.privacy,
            category=req.category,
        )
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to upload video to YouTube")
        raise HTTPException(502, str(e)) from e


@app.post("/generate-image")
def generate_image(req: GenerateImageRequest):
    """Generates a single scene image via FLUX.1-schnell and stores it in project storage."""
    if not req.prompt.strip():
        raise HTTPException(400, "prompt is empty")
    try:
        image_path = generate_scene_image(
            project_id=req.project_id,
            scene_index=req.scene_index,
            prompt=req.prompt,
            aspect_ratio=req.aspect_ratio,
            seed=req.seed,
        )
        return {"imagePath": image_path}
    except Exception as e:  # noqa: BLE001
        logging.exception("Failed to generate scene image")
        raise HTTPException(502, str(e)) from e


@app.post("/process")
def process(req: ProcessRequest):
    """Script -> voice (VieNeu/Edge) -> captions (Whisper) -> scenes (LLM)."""
    if not req.script.strip():
        raise HTTPException(400, "script is empty")
    out_dir = config.STORAGE_DIR / req.project_id
    audio, engine = synthesize(req.script, out_dir, req.voice_id)
    words, segments, duration_ms = transcribe(audio, req.script)
    srt, vtt = write_captions(segments, out_dir)
    characters, scenes = breakdown(
        segments, duration_ms, words=words, script=req.script, video_type=req.video_type
    )
    rel = lambda p: p.relative_to(config.STORAGE_DIR).as_posix()  # noqa: E731
    return {
        "engine": engine,
        "audioPath": rel(audio),
        "srtPath": rel(srt),
        "vttPath": rel(vtt),
        "durationMs": duration_ms,
        "words": words,
        "characters": characters,
        "scenes": scenes,
    }
