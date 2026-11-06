"""Whisper transcription aligned to ground-truth script sentences and words."""
from dataclasses import dataclass
from pathlib import Path
import re

# Fix compatibility between PyAV and faster-whisper (PyAV>=18 dropped metadata_errors argument)
try:
    import av

    _orig_av_open = av.open

    def _patched_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)

    av.open = _patched_av_open
except Exception:
    pass

from . import config

_model = None

MAX_SENTENCE_WORDS = 36


@dataclass
class Segment:
    """A sentence-level narrative beat with timing in milliseconds."""
    index: int
    start_ms: int
    end_ms: int
    text: str


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(config.WHISPER_MODEL, device="auto", compute_type="int8")
    return _model


def split_script_sentences(script: str) -> list[str]:
    """Splits a script into natural sentences (1 sentence = 1 narrative scene beat ~5-8s)."""
    raw_parts = re.split(r"(?<=[.!?…])\s+|\n+", script.strip())
    sentences: list[str] = []
    for part in (p.strip() for p in raw_parts):
        if not part:
            continue
        words = part.split()
        # Only split at a comma if a single sentence is overly long (> 36 words)
        while len(words) > MAX_SENTENCE_WORDS:
            chunk_str = " ".join(words[:MAX_SENTENCE_WORDS])
            comma_idx = chunk_str.rfind(",")
            if comma_idx > len(chunk_str) // 2:
                left = chunk_str[: comma_idx + 1].strip()
                used_words = len(left.split())
                sentences.append(left)
                words = words[used_words:]
            else:
                sentences.append(" ".join(words[:24]))
                words = words[24:]
        if words:
            sentences.append(" ".join(words))
    return sentences


def _align_script_to_whisper(
    script: str, whisper_words: list[dict], duration_ms: int
) -> tuple[list[dict], list[Segment]]:
    """Aligns ground-truth script sentences and tokens to Whisper word timestamps."""
    sentences = split_script_sentences(script)
    if not sentences:
        return whisper_words, []

    sentence_tokens = [s.split() for s in sentences]
    flat_script_tokens = [tok for toks in sentence_tokens for tok in toks]
    total_script_tokens = len(flat_script_tokens)
    total_whisper = len(whisper_words)

    if total_script_tokens == 0:
        return whisper_words, []

    # Build aligned word list using ground-truth spelling from script + Whisper timings
    aligned_words: list[dict] = []
    for idx, tok in enumerate(flat_script_tokens):
        if total_whisper > 0:
            w_start_idx = min(int(idx * total_whisper / total_script_tokens), total_whisper - 1)
            w_end_idx = min(
                max(w_start_idx, int((idx + 1) * total_whisper / total_script_tokens) - 1),
                total_whisper - 1,
            )
            start_ms = whisper_words[w_start_idx]["startMs"]
            end_ms = max(whisper_words[w_end_idx]["endMs"], start_ms + 80)
        else:
            start_ms = int(idx * duration_ms / total_script_tokens)
            end_ms = int((idx + 1) * duration_ms / total_script_tokens)

        aligned_words.append({
            "text": tok,
            "startMs": start_ms,
            "endMs": end_ms,
        })

    # Build 1 Segment per ground-truth sentence
    segments: list[Segment] = []
    cursor = 0
    for s_idx, toks in enumerate(sentence_tokens):
        count = len(toks)
        if count == 0:
            continue
        first_w = aligned_words[cursor]
        last_w = aligned_words[min(cursor + count - 1, len(aligned_words) - 1)]
        start_ms = 0 if s_idx == 0 else first_w["startMs"]
        end_ms = (
            duration_ms
            if s_idx == len(sentence_tokens) - 1
            else max(last_w["endMs"], start_ms + 500)
        )
        segments.append(
            Segment(
                index=s_idx,
                start_ms=start_ms,
                end_ms=end_ms,
                text=" ".join(toks),
            )
        )
        cursor += count

    # Ensure contiguous non-overlapping boundaries
    for i in range(len(segments) - 1):
        segments[i].end_ms = segments[i + 1].start_ms
    if segments:
        segments[-1].end_ms = max(segments[-1].end_ms, duration_ms)

    return aligned_words, segments


def transcribe(audio: Path, script: str) -> tuple[list[dict], list[Segment], int]:
    """Returns (words, sentence_segments, duration_ms) aligned to the original script."""
    segs, info = _get_model().transcribe(
        str(audio), language="vi", word_timestamps=True, initial_prompt=script[:800], vad_filter=False
    )
    whisper_words: list[dict] = []
    for s in segs:
        for w in s.words or []:
            t = w.word.strip()
            if t:
                whisper_words.append({
                    "text": t,
                    "startMs": int(w.start * 1000),
                    "endMs": int(w.end * 1000),
                })

    duration_ms = int(info.duration * 1000)
    words, segments = _align_script_to_whisper(script, whisper_words, duration_ms)
    return words, segments, duration_ms


def _ts(ms: int, sep: str) -> str:
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"


def write_captions(segments: list[Segment], out_dir: Path) -> tuple[Path, Path]:
    """Writes captions.srt and captions.vtt from sentence segments."""
    srt = out_dir / "captions.srt"
    vtt = out_dir / "captions.vtt"
    srt.write_text(
        "\n".join(f"{i + 1}\n{_ts(s.start_ms, ',')} --> {_ts(s.end_ms, ',')}\n{s.text}\n" for i, s in enumerate(segments)),
        encoding="utf-8",
    )
    vtt.write_text(
        "WEBVTT\n\n" + "\n".join(f"{_ts(s.start_ms, '.')} --> {_ts(s.end_ms, '.')}\n{s.text}\n" for i, s in enumerate(segments)),
        encoding="utf-8",
    )
    return srt, vtt
