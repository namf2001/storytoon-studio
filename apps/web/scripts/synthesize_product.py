#!/usr/bin/env python3
"""Synthesize product video voiceover using VieNeu Turbo and Faster-Whisper with distinct voice support."""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

# Add ai-worker to python path
AI_WORKER_DIR = Path(__file__).resolve().parent.parent.parent / "ai-worker"
sys.path.insert(0, str(AI_WORKER_DIR))

try:
    from app.tts import _synth_vieneu, DEFAULT_VIENEU_VOICE
    from app.captions import transcribe
except Exception as e:
    print(json.dumps({"error": f"Failed to import ai-worker: {e}"}))
    sys.exit(1)


def synth_macos_linh(text: str, out_wav: Path):
    """Use macOS native Linh neural voice."""
    tmp_aiff = out_wav.with_suffix(".aiff")
    subprocess.run(["say", "-v", "Linh", text, "-o", str(tmp_aiff)], check=True)
    subprocess.run(["ffmpeg", "-y", "-i", str(tmp_aiff), str(out_wav)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tmp_aiff.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True, help="Script text")
    parser.add_argument("--voice", default="Mai Anh", help="Voice ID")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        raw_voice = args.voice.strip()
        timestamp = int(time.time() * 1000)
        slug = re.sub(r"[^a-zA-Z0-9]", "_", raw_voice).strip("_").lower() or "voice"
        filename = f"voice_{slug}_{timestamp}.wav"
        out_wav = out_dir / filename

        engine = "vieneu"
        actual_voice = raw_voice

        if raw_voice == "Linh":
            synth_macos_linh(args.text, out_wav)
            engine = "macos_linh"
        else:
            # Map friendly names to exact VieNeu ONNX voices
            if raw_voice in ["Duyên Hà My", "Ngọc Linh"]:
                actual_voice = "Ngọc Linh"  # Nữ TikToker trẻ trung, năng động
            elif raw_voice == "Mai Anh":
                actual_voice = "Mai Anh"    # Nữ Truyền hình trong trẻo
            elif raw_voice == "Trúc Ly":
                actual_voice = "Trúc Ly"    # Nữ BTV sắc sảo
            elif raw_voice == "Thùy Dung":
                actual_voice = "Thùy Dung"  # Nữ nhẹ nhàng truyền cảm
            elif raw_voice in ["Thiện Minh", "Nam"]:
                actual_voice = "Thiện Minh" # Nam truyền cảm
            elif raw_voice == "Quang Sơn":
                actual_voice = "Quang Sơn"  # Nam kịch tính
            elif raw_voice == "Hải Đăng":
                actual_voice = "Hải Đăng"   # Nam nhanh trẻ trung
            else:
                actual_voice = "Mai Anh"

            _synth_vieneu(args.text, out_wav, actual_voice)

        # Transcribe with Faster-Whisper to get word timestamps
        words, segs, dur_ms = transcribe(out_wav, args.text)

        rel_url = f"/product-trashcan/{filename}?t={timestamp}"

        result = {
            "success": True,
            "audioUrl": rel_url,
            "durationMs": dur_ms,
            "words": words,
            "engine": engine,
            "voiceId": raw_voice,
            "actualVoice": actual_voice,
        }
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
