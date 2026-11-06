"""Football Shorts workflow helpers: Article Media Extractor & Broadcast AI Copywriter."""
import html
import io
import json
import logging
import re
import time
import urllib.parse
import urllib.request

from PIL import Image

from . import config

log = logging.getLogger(__name__)

SKIP_IMG_PATTERNS = (
    "avatar", "icon", "logo", "ads", "banner", "sprite", "thumb_80", "1x1",
    "pixel", "tracking", "svg", "gif", "base64", "button", "badge", "emoji",
)

FOOTBALL_COPY_PROMPT = """Bạn là biên tập viên cao cấp của kênh TikTok/YouTube Shorts bóng đá 'NGƯỜI ĐÁ BÓNG' (phong cách bản tin truyền hình thể thao).
Dựa trên thông tin đầu vào dưới đây, hãy biên tập một gói sản xuất Video Football Short (9:16, thời lượng ~35-50 giây):

1. Nếu chưa có kịch bản hoàn chỉnh, hãy viết `script` gồm ĐÚNG 6 CÂU hoàn chỉnh (tổng khoảng 120 - 140 từ, đọc trong ~40-44 giây, mỗi câu khoảng 18-25 từ tương ứng 6-7 giây) để tách thành ĐÚNG 6 PHÂN CẢNH B-ROLL chuẩn cấu trúc:
   - Câu 1 (Hook 00:00–00:06): Điểm nổ chấn động / tỷ số trận đấu ngay tại sân vận động.
   - Câu 2 (00:06–00:13): Bối cảnh trước trận và thế trận nhập cuộc ép sân.
   - Câu 3 (00:13–00:20): Khoảnh khắc bàn thắng mở tỷ số / bước ngoặt hiệp một.
   - Câu 4 (00:20–00:28): Cao trào hiệp hai / bàn gỡ hòa khiến khán đài nổ tung.
   - Câu 5 (00:28–00:37): Bàn thắng định đoạt phút cuối / cột mốc lịch sử của ngôi sao.
   - Câu 6 (CTA 00:37–00:43): Cục diện cuộc đua vô địch và câu hỏi tương tác khán giả bình luận.
   - Lưu ý: Viết các con số tỷ số/phút thi đấu thành chữ tiếng Việt (ví dụ: "hai một", "phút tám mươi bảy", "một đều") để TTS đọc tự nhiên nhất.
   (Nếu đầu vào đã là một kịch bản hoàn chỉnh, hãy giữ nguyên 6 câu của người dùng).
2. Tạo bộ thông số đồ họa truyền hình bản tin / Người Đá Bóng:
   - `title`: Tên dự án ngắn gọn (VD: "Man City thảm bại 2-4 PSG").
   - `categoryText`: Cụm từ in hoa ngắn (2-4 chữ) kết thúc bằng dấu hai chấm `:` (VD: "ĐỊA CHẤN C1:", "NGƯỢC DÒNG ĐIÊN RỒ:", "ĐỘI TUYỂN VIỆT NAM:").
   - `headlines`: Mảng gồm ĐÚNG 2 dòng tiêu đề tin tức ngắn gọn (mỗi dòng 4-7 chữ) hiển thị phía dưới khung video (VD: ["Man City thảm bại 2-4 PSG:", "Kỷ lục của Haaland thành công cốc!"]).
   - `tickerText`: Dòng chữ in hoa chạy ở thanh Ticker chân video (VD: "ĐỊA CHẤN CHAMPIONS LEAGUE").

Trả về JSON hợp lệ theo đúng schema:
{
  "title": "string",
  "script": "string",
  "categoryText": "string",
  "headlines": ["dòng 1", "dòng 2"],
  "tickerText": "string"
}

Thông tin đầu vào:
"""


def extract_article_media(url: str) -> dict:
    """Scrapes high-resolution press photos and text from a sports news article URL."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw_html = resp.read().decode("utf-8", errors="replace")

    title_match = re.search(r"<title[^>]*>(.*?)</title>", raw_html, flags=re.I | re.S)
    title = html.unescape(title_match.group(1).strip()) if title_match else ""

    images: list[str] = []
    seen: set[str] = set()

    def _add_img(candidate: str) -> None:
        if not candidate:
            return
        candidate = html.unescape(candidate.strip())
        if candidate.startswith("//"):
            candidate = "https:" + candidate
        elif candidate.startswith("/"):
             candidate = urllib.parse.urljoin(url, candidate)
        if not candidate.startswith("http"):
            return
        lower = candidate.lower()
        if any(pat in lower for pat in SKIP_IMG_PATTERNS):
            return
        if candidate not in seen:
            seen.add(candidate)
            images.append(candidate)

    # 1. OpenGraph & Twitter meta images
    for m in re.finditer(
        r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)["\']',
        raw_html,
        flags=re.I,
    ):
        _add_img(m.group(1))

    # 2. Article <img> tags (prefer data-original, data-src, then src)
    for tag in re.findall(r"<img\b[^>]*>", raw_html, flags=re.I):
        for attr in ("data-original", "data-src", "data-lazy-src", "src"):
            m = re.search(rf'\b{attr}=["\']([^"\']+)["\']', tag, flags=re.I)
            if m:
                _add_img(m.group(1))
                break

    # 3. Extract clean article paragraphs
    paragraphs: list[str] = []
    for p in re.findall(r"<p\b[^>]*>(.*?)</p>", raw_html, flags=re.I | re.S):
        clean_p = re.sub(r"<[^>]+>", " ", p)
        clean_p = html.unescape(re.sub(r"\s+", " ", clean_p)).strip()
        if len(clean_p) > 45:
            paragraphs.append(clean_p)

    article_text = "\n".join(paragraphs[:18])
    return {
        "url": url,
        "title": title,
        "text": article_text,
        "images": images[:24],
    }


def generate_football_package(topic_or_url: str, existing_script: str = "") -> dict:
    """Generates a football short script + broadcast headlines (+ scraped press images if URL provided)."""
    article_images: list[str] = []
    source_context = topic_or_url.strip()

    if source_context.startswith("http://") or source_context.startswith("https://"):
        try:
            extracted = extract_article_media(source_context)
            article_images = extracted["images"]
            source_context = f"Tiêu đề bài báo: {extracted['title']}\nNội dung:\n{extracted['text']}"
        except Exception as e:  # noqa: BLE001
            log.warning("Could not scrape article URL %s: %s", source_context, e)

    if existing_script.strip():
        source_context += f"\n\nKịch bản người dùng đã cung cấp:\n{existing_script.strip()}"

    if not config.GROQ_API_KEY:
        return {
            "title": "Bản tin Bóng đá Nóng",
            "script": existing_script.strip() or source_context[:500],
            "categoryText": "TIN NÓNG BÓNG ĐÁ:",
            "headlines": ["Tâm điểm làng túc cầu hôm nay:", "Diễn biến kịch tính không thể rời mắt!"],
            "tickerText": "BẢN TIN NGƯỜI ĐÁ BÓNG",
            "articleImages": article_images,
        }

    models = [config.GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b"]
    parsed: dict = {}
    for model_name in dict.fromkeys(models):
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Vietnamese sports broadcast producer. Always return valid JSON.",
                },
                {"role": "user", "content": FOOTBALL_COPY_PROMPT + source_context},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
        }
        try:
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {config.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "StorytoonStudio/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                parsed = json.loads(body["choices"][0]["message"]["content"] or "{}")
                break
        except Exception as e:  # noqa: BLE001
            log.warning("Groq football copy model %s failed (%s), trying next...", model_name, e)

    headlines = parsed.get("headlines") or []
    if not isinstance(headlines, list) or len(headlines) == 0:
        headlines = ["Tâm điểm bóng đá 24h qua:", "Diễn biến bất ngờ phút chót!"]

    return {
        "title": parsed.get("title") or "Bản tin Bóng đá",
        "script": parsed.get("script") or existing_script,
        "categoryText": parsed.get("categoryText") or "TIN NÓNG BÓNG ĐÁ:",
        "headlines": headlines[:2],
        "tickerText": parsed.get("tickerText") or "TIN NÓNG BÓNG ĐÁ",
        "articleImages": article_images,
    }


def download_remote_image(project_id: str, scene_index: int, image_url: str) -> str:
    """Downloads a press photo from a remote URL and stores it in the project's images directory."""
    req = urllib.request.Request(
        image_url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        raw_bytes = resp.read()

    out_dir = config.STORAGE_DIR / project_id / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"scene_{scene_index:03d}_{int(time.time())}.jpg"
    out_path = out_dir / filename

    im = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    im.save(out_path, format="JPEG", quality=92)
    return out_path.relative_to(config.STORAGE_DIR).as_posix()
