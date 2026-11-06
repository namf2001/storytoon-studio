"""Runtime configuration loaded from environment variables."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

# Load .env safely even if python-dotenv is not installed
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

STORAGE_DIR = Path(os.getenv("STORAGE_DIR_ABS", ROOT / "storage")).resolve()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
HF_TOKEN = os.getenv("HF_TOKEN", "")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "")
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VIENEU_VOICE = os.getenv("VIENEU_VOICE", "")
VIENEU_REF_AUDIO = os.getenv("VIENEU_REF_AUDIO", "")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
TTS_FALLBACK_EDGE = os.getenv("TTS_FALLBACK_EDGE", "1") == "1"
TARGET_SCENE_SEC = float(os.getenv("TARGET_SCENE_SEC", "6"))
