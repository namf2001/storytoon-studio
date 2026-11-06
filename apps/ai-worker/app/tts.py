"""Voiceover synthesis: VieNeu-TTS v3 Turbo (local ONNX) with optional Edge-TTS fallback."""
import asyncio
import hashlib
import logging
import os
import re
from pathlib import Path

import numpy as np
import soundfile as sf

from . import config

log = logging.getLogger(__name__)
_tts = None
_voice_cache: dict[str, object] = {}

MAX_CHUNK_CHARS = 250
PAUSE_SEC = 0.25

DEFAULT_VIENEU_VOICE = "Thiện Minh"
FEMALE_FALLBACK = "Mỹ Duyên"

VOICE_ALIASES: dict[str, str] = {
    "duyên hà my": "Duyên Hà My",
    "duyen ha my": "Duyên Hà My",
    "duyên hamy": "Duyên Hà My",
    "hà my": "Duyên Hà My",
}

FEMALE_VOICES = {
    "trúc ly", "mai anh", "ngọc linh", "thùy dung", "ngọc huyền", "ngọc trân",
    "đoan trang", "thục đoan", "mỹ duyên", "quỳnh anh", "kim thanh",
    "duyên hà my", "duyen ha my", "hà my",
}

DEFAULT_PREVIEW_TEXT = (
    "Camp Nou chết lặng ở phút tám mươi bảy, Kylian Mbappe lập cú đúp nhấn chìm Barcelona!"
)
FEMALE_PREVIEW_TEXT = (
    "Xin chào, đây là bản nghe thử giọng đọc trí tuệ nhân tạo cực kỳ truyền cảm và cuốn hút!"
)

VOICE_CATALOG = [
  {
    "id": "Duyên Hà My",
    "name": "Duyên Hà My",
    "gender": "Nữ",
    "style": "Review & Bán Hàng · Giọng Nữ Cuốn Hút (TikTok/Shorts)",
    "engine": "vieneu",
  },
  {
    "id": "Mỹ Duyên",
    "name": "Mỹ Duyên",
    "gender": "Nữ",
    "style": "Giọng Miền Nam · Đọc Truyện & Review Tự Nhiên",
    "engine": "vieneu",
  },
  {
    "id": "Thiện Minh",
    "name": "Thiện Minh",
    "gender": "Nam",
    "style": "Bản tin Thể thao · Truyền cảm (Mặc định)",
    "engine": "vieneu",
  },
  {
    "id": "Quang Sơn",
    "name": "Quang Sơn",
    "gender": "Nam",
    "style": "BLV Bóng đá · Kịch tính & Năng lượng",
    "engine": "vieneu",
  },
  {
    "id": "Hải Đăng",
    "name": "Hải Đăng",
    "gender": "Nam",
    "style": "Bản tin Thể thao · Trẻ trung & Nhanh",
    "engine": "vieneu",
  },
  {
    "id": "Thái Sơn",
    "name": "Thái Sơn",
    "gender": "Nam",
    "style": "Trầm ấm · Phóng sự & Phân tích",
    "engine": "vieneu",
  },
  {
    "id": "Đức Trí",
    "name": "Đức Trí",
    "gender": "Nam",
    "style": "Kể chuyện · Điềm đạm & Sâu sắc",
    "engine": "vieneu",
  },
  {
    "id": "Minh Đức",
    "name": "Minh Đức",
    "gender": "Nam",
    "style": "Sắc bén · Tin nóng Tốc độ",
    "engine": "vieneu",
  },
  {
    "id": "Thanh Bình",
    "name": "Thanh Bình",
    "gender": "Nam",
    "style": "Chuẩn mực · Thời sự Truyền hình",
    "engine": "vieneu",
  },
  {
    "id": "Xuân Vĩnh",
    "name": "Xuân Vĩnh",
    "gender": "Nam",
    "style": "Giọng Bắc trầm · Cổ điển",
    "engine": "vieneu",
  },
  {
    "id": "Phạm Tuyên",
    "name": "Phạm Tuyên",
    "gender": "Nam",
    "style": "Giọng miền Nam · Gần gũi",
    "engine": "vieneu",
  },
  {
    "id": "Adam bựa",
    "name": "Adam Bựa",
    "gender": "Nam",
    "style": "Giải trí · Hài hước TikTok",
    "engine": "vieneu",
  },
  {
    "id": "Trúc Ly",
    "name": "Trúc Ly",
    "gender": "Nữ",
    "style": "BTV Nữ Truyền hình · Sắc sảo & Rõ ràng",
    "engine": "vieneu",
  },
  {
    "id": "Mai Anh",
    "name": "Mai Anh",
    "gender": "Nữ",
    "style": "Truyền hình · Trong trẻo & Hiện đại",
    "engine": "vieneu",
  },
  {
    "id": "Ngọc Linh",
    "name": "Ngọc Linh",
    "gender": "Nữ",
    "style": "TikTok / Shorts · Trẻ trung & Năng động",
    "engine": "vieneu",
  },
  {
    "id": "Thùy Dung",
    "name": "Thùy Dung",
    "gender": "Nữ",
    "style": "Tin tức · Nhẹ nhàng & Truyền cảm",
    "engine": "vieneu",
  },
  {
    "id": "Ngọc Huyền",
    "name": "Ngọc Huyền",
    "gender": "Nữ",
    "style": "Giọng Bắc chuẩn · Kể chuyện",
    "engine": "vieneu",
  },
  {
    "id": "Ngọc Trân",
    "name": "Ngọc Trân",
    "gender": "Nữ",
    "style": "Giọng miền Nam · Ngọt ngào",
    "engine": "vieneu",
  },
  {
    "id": "edge:vi-VN-NamMinhNeural",
    "name": "Nam Minh (Edge-TTS)",
    "gender": "Nam",
    "style": "Microsoft Neural · Nhanh & Rõ",
    "engine": "edge",
  },
  {
    "id": "edge:vi-VN-HoaiMyNeural",
    "name": "Hoài My (Edge-TTS)",
    "gender": "Nữ",
    "style": "Microsoft Neural · Nữ chuẩn",
    "engine": "edge",
  },
]


def split_sentences(text: str) -> list[str]:
    """Splits a script into sentence-sized chunks suitable for TTS."""
    parts = re.split(r"(?<=[.!?…])\s+|\n+", text.strip())
    chunks: list[str] = []
    for p in (x.strip() for x in parts):
        if not p:
            continue
        while len(p) > MAX_CHUNK_CHARS:
            cut = p.rfind(",", 0, MAX_CHUNK_CHARS)
            cut = cut if cut > 50 else MAX_CHUNK_CHARS
            chunks.append(p[: cut + 1].strip())
            p = p[cut + 1 :].strip()
        if p:
            chunks.append(p)
    return chunks


def _patch_vieneu_hf_symlinks() -> None:
    """Replaces cross-directory HF Hub symlinks with hardlinks so ONNXRuntime security checks pass."""
    try:
        from vieneu._v3_turbo_engine.onnx_runtime_lite import OnnxV3LiteEngine

        orig_fetch = OnnxV3LiteEngine._fetch

        @staticmethod
        def _safe_fetch(repo, files, subfolder):
            d = orig_fetch(repo, files, subfolder)
            for f in Path(d).iterdir():
                if f.is_symlink():
                    target = f.resolve()
                    if target.exists():
                        f.unlink()
                        os.link(target, f)
            return d

        OnnxV3LiteEngine._fetch = _safe_fetch
    except Exception as e:  # noqa: BLE001
        log.warning("Could not patch OnnxV3LiteEngine._fetch: %s", e)


def _get_vieneu_voice(voice_id: str | None = None):
    global _tts
    if _tts is None:
        _patch_vieneu_hf_symlinks()
        from vieneu import Vieneu

        _tts = Vieneu()
        try:
            if hasattr(_tts, "_preset_voices") and "Mỹ Duyên" in _tts._preset_voices and "Duyên Hà My" not in _tts._preset_voices:
                import copy
                duyen = copy.deepcopy(_tts._preset_voices["Mỹ Duyên"])
                duyen["description"] = "Nữ · Nam · Rõ ràng, TikToker thời trang"
                duyen["style"] = "Review & Bán Hàng · Giọng Nữ Cuốn Hút (TikTok/Shorts)"
                _tts._preset_voices["Duyên Hà My"] = duyen
        except Exception as err:  # noqa: BLE001
            log.warning("Could not register Duyên Hà My preset: %s", err)

    raw_id = (voice_id or config.VIENEU_VOICE or DEFAULT_VIENEU_VOICE).strip()
    norm_key = raw_id.lower()
    target_id = VOICE_ALIASES.get(norm_key, raw_id)

    if target_id in _voice_cache:
        return _tts, _voice_cache[target_id]

    if config.VIENEU_REF_AUDIO and Path(config.VIENEU_REF_AUDIO).exists() and not voice_id:
        v = _tts.encode_reference(config.VIENEU_REF_AUDIO)
        _voice_cache[target_id] = v
        return _tts, v

    try:
        v = _tts.get_preset_voice(target_id)
        _voice_cache[target_id] = v
        return _tts, v
    except Exception as e:  # noqa: BLE001
        fallback_voice = FEMALE_FALLBACK if norm_key in FEMALE_VOICES else DEFAULT_VIENEU_VOICE
        log.warning("Preset voice %s not found (%s), falling back to %s", target_id, e, fallback_voice)
        try:
            v = _tts.get_preset_voice(fallback_voice)
            _voice_cache[target_id] = v
            return _tts, v
        except Exception:  # noqa: BLE001
            return _tts, None


def _synth_vieneu(text: str, out_wav: Path, voice_id: str | None = None) -> None:
    tts, voice = _get_vieneu_voice(voice_id)
    pieces = []
    sr = None
    for chunk in split_sentences(text):
        audio = tts.infer(text=chunk, voice=voice) if voice is not None else tts.infer(text=chunk)
        tmp = out_wav.with_suffix(".chunk.wav")
        tts.save(audio, str(tmp))
        data, sr = sf.read(tmp, dtype="float32")
        tmp.unlink(missing_ok=True)
        if data.ndim > 1:
            data = data.mean(axis=1)
        pieces.append(data)
        pieces.append(np.zeros(int(sr * PAUSE_SEC), dtype="float32"))
    if not pieces:
        raise ValueError("empty script")
    sf.write(out_wav, np.concatenate(pieces), sr)


def _synth_edge(text: str, out_path: Path, edge_voice: str = "vi-VN-NamMinhNeural") -> None:
    import edge_tts

    async def run():
        await edge_tts.Communicate(text, edge_voice, rate="+10%", pitch="-4Hz").save(str(out_path))

    asyncio.run(run())


def synthesize(text: str, out_dir: Path, voice_id: str | None = None) -> tuple[Path, str]:
    """Generates a single continuous voiceover file using the chosen voice_id. Returns (path, engine)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    chosen = (voice_id or config.VIENEU_VOICE or DEFAULT_VIENEU_VOICE).strip()

    if chosen.startswith("edge:"):
        edge_name = chosen.split("edge:", 1)[1] or "vi-VN-NamMinhNeural"
        mp3 = out_dir / "voice.mp3"
        _synth_edge(text, mp3, edge_name)
        log.info("Synthesized voiceover using Edge-TTS (%s) -> %s", edge_name, mp3)
        return mp3, "edge"

    wav = out_dir / "voice.wav"
    try:
        _synth_vieneu(text, wav, chosen)
        log.info("Synthesized voiceover using VieNeu-TTS v3 Turbo (%s) -> %s", chosen, wav)
        return wav, "vieneu"
    except Exception as e:  # noqa: BLE001
        if not config.TTS_FALLBACK_EDGE:
            raise
        log.warning("VieNeu failed (%s), falling back to Edge-TTS", e)
        mp3 = out_dir / "voice.mp3"
        _synth_edge(text, mp3)
        return mp3, "edge"


def synthesize_preview(voice_id: str, custom_text: str | None = None) -> dict:
    """Synthesizes a short preview audio clip for the given voice_id and returns its media URL."""
    chosen = (voice_id or DEFAULT_VIENEU_VOICE).strip()
    norm_key = chosen.lower()
    sample_text = (custom_text or "").strip()
    if sample_text:
        # Take first sentence or up to 150 chars for fast preview
        first_sent = split_sentences(sample_text)
        sample_text = (first_sent[0] if first_sent else sample_text)[:150].strip()
    else:
        sample_text = FEMALE_PREVIEW_TEXT if norm_key in FEMALE_VOICES else DEFAULT_PREVIEW_TEXT

    previews_dir = config.STORAGE_DIR / "voice-previews"
    previews_dir.mkdir(parents=True, exist_ok=True)

    digest = hashlib.md5(f"{chosen}::{sample_text}".encode("utf-8")).hexdigest()[:12]
    ext = "mp3" if chosen.startswith("edge:") else "wav"
    filename = f"preview_{digest}.{ext}"
    out_file = previews_dir / filename

    if not out_file.exists():
        if chosen.startswith("edge:"):
            edge_name = chosen.split("edge:", 1)[1] or "vi-VN-NamMinhNeural"
            _synth_edge(sample_text, out_file, edge_name)
        else:
            _synth_vieneu(sample_text, out_file, chosen)

    return {
        "voiceId": chosen,
        "text": sample_text,
        "audioUrl": f"http://localhost:9090/media/voice-previews/{filename}",
    }
