"""AI scene breakdown: splits script by narrative beats (Hook 3s, goals/turning points, CTA) and aligns to word timestamps."""
import json
import logging
import urllib.request

from . import config
from .captions import Segment

log = logging.getLogger(__name__)

STYLE = (
    "flat 2D minimalist cartoon, thick black outlines, simple round-headed characters, "
    "muted colors, satirical storytelling illustration"
)

FOOTBALL_STYLE = (
    "photorealistic sports press photography, dramatic stadium floodlights, intense emotion, "
    "shallow depth of field, 8k DSLR broadcast quality, no text"
)

PRODUCT_STYLE = (
    "commercial cinematography, smooth cinematic pacing, studio softbox illumination, "
    "subtle specular highlights, clean reflections, no speech, crisp tactile mechanical sound effects"
)

FOOTBALL_KEYWORDS = (
    "bóng đá", "cầu thủ", "hlv", "sân vận động", "bàn thắng", "champions league", "c1",
    "world cup", "ngoại hạng", "ronaldo", "messi", "haaland", "mbappe", "real madrid",
    "barca", "barcelona", "man city", "psg", "mu ", "manchester", "đt việt nam", "vff",
    "aff cup", "la liga", "camp nou", "bernabeu", "raphinha", "yamal", "siêu kinh điển",
)

PRODUCT_KEYWORDS = (
    "sản phẩm", "tính năng", "thùng rác", "thiết bị", "thông minh", "cánh bướm",
    "bảo hành", "giá ưu đãi", "mua ngay", "chất liệu", "dung tích", "cảm ứng",
    "tiện lợi", "ngăn đựng", "bàn đạp", "pedal", "gạt chân", "đóng mở", "review",
    "giỏ hàng", "rước em nó", "khử mùi", "inox", "gia dụng", "tai nghe", "nồi cơm",
    "máy pha", "loa ", "bàn phím", "chuột ", "ghế ", "máy hút bụi",
)

PRODUCT_PROMPT = """Bạn là chuyên gia đạo diễn hình ảnh và kỹ sư Prompt AI hàng đầu cho video thương mại sản phẩm (chuyên sâu Google Veo 3, Kling AI 3.0, Runway Gen-4, MiniMax Hailuo H3).
Hãy phân rã script sản phẩm dưới đây thành các cảnh quay thương mại chuẩn mực theo đúng 5 Shot Góc Vàng:

5 GÓC CHỤP VÀNG CHO SẢN PHẨM:
1. Hero Shot: Góc nghiêng 45 độ toàn thân sản phẩm đặt trong không gian cao cấp (Scandinavian luxury interior / contemporary kitchen).
2. Mechanism Shot: Cận cảnh cơ chế cơ học chính (ví dụ: nắp đôi cánh bướm mở êm sang 2 bên, tay pha portafilter, màng loa titan, bản lề gập).
3. Action Angle: Góc thấp cận cảnh thao tác vật lý (bàn đạp chân inox được ấn nhẹ, nút bấm xúc giác, cần gạt áp suất).
4. Interior Shot: Góc mở toàn phần từ trên xuống thấy rõ cấu trúc bên trong (2 khung cài túi rác riêng biệt để phân loại rác, buồng lọc, ngăn chứa).
5. Scale/Context Shot: Đặt cạnh tủ bếp hoặc góc bàn làm việc để người xem cảm nhận kích thước thực tế và chốt CTA.

QUY TẮC VÀNG IMAGE-TO-VIDEO (I2V PROMPT ENGINEERING):
⚠️ QUAN TRỌNG NHẤT: Ảnh gốc đã định nghĩa toàn bộ hình dáng, màu sắc, logo của sản phẩm.
1. TUYỆT ĐỐI KHÔNG BỊA RA VẬT THỂ CŨ/HỎNG (NO MORPHING):
   - Kịch bản có thể nói về "chiếc thùng rác cũ bẩn", nhưng trong `image_prompt` TUYỆT ĐỐI KHÔNG VIẾT "transition from old/messy bin to new bin"!
   - Ảnh nạp vào là ảnh sản phẩm mới. Nếu bảo AI "chuyển từ thùng rác cũ", AI sẽ tự vẽ ra một cái thùng rác cũ bẩn màu xám có bánh xe làm hỏng toàn bộ video!
   - Cảnh 1 (Hook) PHẢI là: Slow push-in hoặc dramatic orbital pan quanh chính sản phẩm mới trong ảnh, kết hợp ánh sáng kịch tính.
2. TUYỆT ĐỐI KHÔNG NHỒI NHÉT TỪ KHÓA KỸ THUẬT GÂY IN CHỮ RÁC (NO TEXT HALLUCINATIONS):
   - CẤM VIẾT: "8k", "60fps", "photorealistic", "ray-traced", "prompt:", "Veo 3", "Kling", "9:16 vertical".
   - Các từ khóa này sẽ kích hoạt AI in phụ đề rác hoặc watermark nhảm nhí lên video!
3. TUYỆT ĐỐI KHÔNG TẢ LẠI MÀU SẮC HAY VẬT LIỆU SẢN PHẨM:
   - CẤM tả lại "white", "black", "stainless steel cylinder", "sleek modern trash bin", "smooth surface and elegant design". AI sẽ vẽ đè làm méo logo và biến dạng cấu trúc sản phẩm!
4. CHỈ ĐẠO CƠ HỌC VẬT LÝ CHÍNH XÁC (EXACT PHYSICAL MECHANICS):
   - Nếu là nắp cánh bướm: Phải viết rõ "butterfly split dual-lid smoothly swings open to both sides". Tuyệt đối không để AI tự vẽ nắp đơn mở ngược!
   - Nếu là bàn đạp: Phải viết rõ "low-angle shot as foot gently presses polished metal pedal, smooth mechanical linkage".
   - Nếu là khoang trong: Phải viết rõ "top-down perspective showing dual recycling compartments with inner liner rings".

Trong `image_prompt`, CHỈ ĐƯỢC VIẾT theo đúng công thức 4 tầng I2V bằng tiếng Anh súc tích (dưới 50 từ):
[Camera Movement] + [Physical Mechanics Action] + [Lighting Shift] + [sound direction: no speech, crisp mechanical sfx], ending with {style}

Bộ từ khóa Camera chuyên nghiệp bắt buộc chọn:
- "Slow macro push-in" (Đẩy máy từ từ vào chi tiết)
- "Smooth 45-degree orbital pan" (Lượn vòng quay nhẹ quanh sản phẩm)
- "Tilt-down from top lid to metal foot pedal" (Hạ góc quay từ nắp xuống chân đạp)
- "Low-angle tracking shot" (Góc quay thấp bám theo chuyển động)

QUY TẮC THỜI LƯỢNG:
- Mỗi cảnh PHẢI có thời lượng tối ưu từ 5.0 giây đến tối đa 8.0 giây (khống chế trong khoảng 3s <= thời lượng <= 10s) để AI giữ nguyên vẹn hình thể vật lý không bị méo.
- BẮT BUỘC: Khi ghép toàn bộ `spoken_text` của các cảnh lại theo thứ tự, phải khớp ĐỦ 100% nội dung Script gốc.

Trả về JSON đúng schema:
{{
  "characters": [],
  "scenes": [
    {{
      "spoken_text": "lời đọc nguyên văn của cảnh này trích từ script",
      "text_overlay": "TIÊU ĐỀ TÍNH NĂNG (2-5 TỪ VIẾT HOA)",
      "footage": "Góc vàng: [Hero/Mechanism/Action/Interior/Context] • Mô tả chuyển động cơ học (tiếng Việt)",
      "estimated_time": "00:00 - 00:06",
      "characters": [],
      "image_prompt": "[Camera Movement], [Physical Mechanics Action], [Lighting Shift], [sound direction: no speech, crisp mechanical sfx], {style}",
      "camera_effect": "zoom_in",
      "transition": "slide"
    }}
  ]
}}

Script:
{script}
"""

FOOTBALL_PROMPT = """Hãy chia script tin tức bóng đá dưới đây thành 6–8 scene cho TikTok/YouTube Shorts 45–60 giây. Mỗi scene phải có: lời đọc (`spoken_text`), footage nên dùng (`footage`), text overlay ngắn (`text_overlay`), mốc thời lượng ước tính (`estimated_time`), prompt tạo ảnh tiếng Anh (`image_prompt`), nhân vật (`characters`), chuyển động máy (`camera_effect`) và hiệu ứng chuyển cảnh (`transition`).
Ưu tiên:
- Hook gây tò mò trong 3 giây đầu (có thể tách riêng câu/vế mở đầu làm Scene 1).
- Các khoảnh khắc bàn thắng / biến cố là điểm chuyển scene.
- Kết thúc bằng câu hỏi để kéo bình luận ở Scene cuối.
- BẮT BUỘC: Phải chia ĐỦ TỪ ĐẦU ĐẾN CUỐI SCRIPT thành 6 đến 8 scene (TUYỆT ĐỐI KHÔNG bỏ sót câu nào ở cuối script; ghép tất cả `spoken_text` lại phải đủ 100% các câu trong Script).
- Trong `image_prompt` (tiếng Anh): mô tả chi tiết hình ảnh báo chí thể thao từ `footage` (ghi đúng CLB hiện tại 2025-2026: Kylian Mbappe / Vinicius / Bellingham khoác áo trắng Real Madrid; Lamine Yamal / Raphinha / Lewandowski khoác áo sọc xanh đỏ FC Barcelona), kết thúc bằng "{style}".
- `camera_effect`: chọn trong [zoom_in, pan_right, pan_left, zoom_out, shake, static].
- `transition`: Scene 1 là "cut", các scene sau chọn trong [slide, fade].

Trả về JSON hợp lệ theo đúng schema:
{{
  "characters": [{{"name": "string", "description": "string"}}],
  "scenes": [
    {{
      "spoken_text": "lời đọc nguyên văn của scene này trích từ script",
      "text_overlay": "TEXT OVERLAY NGẮN (3-6 TỪ)",
      "footage": "Mô tả footage nên dùng (tiếng Việt)",
      "estimated_time": "00:00 - 00:04",
      "characters": ["tên cầu thủ / CLB"],
      "image_prompt": "Detailed English sports press photo prompt ending with {style}",
      "camera_effect": "zoom_in",
      "transition": "slide"
    }}
  ]
}}

Script:
{script}
"""

STORYTOON_PROMPT = """Bạn là đạo diễn phân cảnh cho video kể chuyện hoạt hình 2D.
Hãy chia script dưới đây thành các phân cảnh (scenes) theo đúng mạch chuyển biến câu chuyện và hành động.
QUAN TRỌNG: Khi ghép `spoken_text` của tất cả các scene lại theo thứ tự phải khớp ĐÚNG 100% toàn bộ Script gốc.
Mỗi scene gồm:
- `spoken_text`: lời đọc nguyên văn trích từ script.
- `text_overlay`: tiêu đề ngắn của cảnh.
- `footage`: bối cảnh tiếng Việt ngắn gọn.
- `characters`: danh sách nhân vật xuất hiện.
- `image_prompt`: prompt tiếng Anh mô tả góc máy, hành động, biểu cảm và ngoại hình nhân vật, kết thúc bằng "{style}".
- `camera_effect`: chọn trong [static, zoom_in, zoom_out, pan_left, pan_right, shake].
- `transition`: chọn trong [cut, fade, slide].

Trả về JSON đúng schema:
{{
  "characters": [{{"name": "string", "description": "string"}}],
  "scenes": [
    {{
      "spoken_text": "string",
      "text_overlay": "string",
      "footage": "string",
      "characters": ["string"],
      "image_prompt": "string",
      "camera_effect": "zoom_in",
      "transition": "cut"
    }}
  ]
}}

Script:
{script}
"""

CAMERA_CYCLE = ["zoom_in", "pan_right", "zoom_in", "pan_left", "zoom_in", "zoom_out", "shake"]
TRANSITION_CYCLE = ["cut", "slide", "slide", "fade", "slide", "fade", "slide"]


def _is_football_script(text: str) -> bool:
    lower = text.lower()
    return sum(1 for kw in FOOTBALL_KEYWORDS if kw in lower) >= 2


def _is_product_script(text: str) -> bool:
    lower = text.lower()
    return sum(1 for kw in PRODUCT_KEYWORDS if kw in lower) >= 2


def _call_groq(script_text: str, is_football: bool, is_product: bool = False) -> dict:
    if is_product:
        prompt_text = PRODUCT_PROMPT.format(style=PRODUCT_STYLE, script=script_text)
        sys_msg = (
            "You are a top-tier commercial advertising director for 9:16 product videos (TikTok/Reels/Shorts). "
            "You split scripts into fast-paced scenes under 7.5s (< 8s strict limit) with 6-layer 3D commercial product prompts, "
            "and output strictly valid JSON."
        )
    elif is_football:
        prompt_text = FOOTBALL_PROMPT.format(style=FOOTBALL_STYLE, script=script_text)
        sys_msg = (
            "You are an expert TikTok/YouTube Shorts football video director. "
            "You split football scripts into 6-8 dynamic scenes (3s hook, goal/event turning points, CTA question) "
            "and output strictly valid JSON."
        )
    else:
        prompt_text = STORYTOON_PROMPT.format(style=STYLE, script=script_text)
        sys_msg = "You are a storyboard director for 2D animated videos. You output strictly valid JSON."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {config.GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "Storytoon/1.0",
    }
    models = [config.GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b"]
    last_err: Exception | None = None
    for model_name in dict.fromkeys(models):
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": sys_msg},
                {"role": "user", "content": prompt_text},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
        }
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content or "{}")
                scenes_list = parsed.get("scenes", [])
                # Verify the model didn't truncate the script (< 80% words covered)
                spoken_words = sum(len((s.get("spoken_text") or "").split()) for s in scenes_list)
                script_words = len(script_text.split())
                if is_football and (len(scenes_list) < 5 or spoken_words < script_words * 0.8):
                    log.warning(
                        "Model %s returned %d scenes covering %d/%d words, trying next model...",
                        model_name, len(scenes_list), spoken_words, script_words,
                    )
                    continue
                return parsed
        except Exception as e:  # noqa: BLE001
            log.warning("Groq model %s failed (%s), trying next model...", model_name, e)
            last_err = e
    raise RuntimeError(f"All Groq models failed: {last_err}")


def _align_scenes_to_words(
    raw_scenes: list[dict],
    words: list[dict],
    segments: list[Segment],
    duration_ms: int,
    is_football: bool,
    is_product: bool = False,
) -> list[dict]:
    """Aligns each LLM scene's spoken_text to exact word-level timestamps."""
    if not raw_scenes:
        style = PRODUCT_STYLE if is_product else (FOOTBALL_STYLE if is_football else STYLE)
        return [
            {
                "sceneIndex": i + 1,
                "startMs": s.start_ms,
                "endMs": s.end_ms,
                "transcriptText": s.text,
                "setting": f"Cảnh #{i + 1}",
                "characters": [],
                "imagePrompt": f"{s.text}. {style}",
                "cameraEffect": CAMERA_CYCLE[i % len(CAMERA_CYCLE)],
                "transition": "cut" if i == 0 else TRANSITION_CYCLE[i % len(TRANSITION_CYCLE)],
            }
            for i, s in enumerate(segments)
        ]

    # Use word-level timestamps to compute exact startMs & endMs for each scene's spoken_text
    total_words = len(words)
    scene_word_counts = [max(1, len((sc.get("spoken_text") or "").split())) for sc in raw_scenes]
    sum_scene_words = sum(scene_word_counts)

    scenes: list[dict] = []
    word_cursor = 0
    for idx, sc in enumerate(raw_scenes):
        is_last = idx == len(raw_scenes) - 1
        if total_words > 0 and sum_scene_words > 0:
            # Proportional word count matched to aligned words list
            allocated = (
                total_words - word_cursor
                if is_last
                else max(1, round(scene_word_counts[idx] * total_words / sum_scene_words))
            )
            w_start = min(word_cursor, total_words - 1)
            w_end = min(max(w_start, word_cursor + allocated - 1), total_words - 1)
            start_ms = 0 if idx == 0 else words[w_start]["startMs"]
            end_ms = duration_ms if is_last else words[w_end]["endMs"]
            spoken = (sc.get("spoken_text") or "").strip() or " ".join(
                w["text"] for w in words[w_start : w_end + 1]
            )
            word_cursor = w_end + 1
        else:
            start_ms = int(idx * duration_ms / len(raw_scenes))
            end_ms = int((idx + 1) * duration_ms / len(raw_scenes))
            spoken = (sc.get("spoken_text") or "").strip()

        overlay = (sc.get("text_overlay") or "").strip()
        footage = (sc.get("footage") or sc.get("setting") or "").strip()
        if overlay and footage:
            setting_str = f"[{overlay}] • Footage: {footage}"
        elif footage:
            setting_str = footage
        elif overlay:
            setting_str = f"[{overlay}]"
        else:
            setting_str = f"Cảnh #{idx + 1}"

        cam = sc.get("camera_effect") or CAMERA_CYCLE[idx % len(CAMERA_CYCLE)]
        tr = "cut" if idx == 0 else (sc.get("transition") or TRANSITION_CYCLE[idx % len(TRANSITION_CYCLE)])

        scenes.append({
            "sceneIndex": idx + 1,
            "startMs": start_ms,
            "endMs": max(end_ms, start_ms + 500),
            "transcriptText": spoken,
            "setting": setting_str,
            "characters": sc.get("characters", []),
            "imagePrompt": sc.get("image_prompt", ""),
            "cameraEffect": cam,
            "transition": tr,
        })

    # For product commercial videos: enforce 3.0s <= duration <= 10.0s
    if is_product and scenes:
        # 1. Merge scenes shorter than 3000ms into their neighbors
        merged: list[dict] = []
        for sc in scenes:
            dur = sc["endMs"] - sc["startMs"]
            if dur < 3000 and merged:
                # Merge into previous scene
                prev = merged[-1]
                prev["endMs"] = sc["endMs"]
                prev["transcriptText"] = f"{prev['transcriptText']} {sc['transcriptText']}".strip()
                if sc.get("imagePrompt") and not prev.get("imagePrompt"):
                    prev["imagePrompt"] = sc["imagePrompt"]
            else:
                merged.append(sc)

        # If the first scene was < 3000ms and subsequent scenes exist, merge into next
        if len(merged) > 1 and (merged[0]["endMs"] - merged[0]["startMs"]) < 3000:
            first = merged.pop(0)
            merged[0]["startMs"] = first["startMs"]
            merged[0]["transcriptText"] = f"{first['transcriptText']} {merged[0]['transcriptText']}".strip()

        # 2. Split scenes longer than 10000ms into two 3s-10s sub-scenes
        split_scenes: list[dict] = []
        for sc in merged:
            dur = sc["endMs"] - sc["startMs"]
            if dur > 10000 and dur >= 6000:
                mid_ms = sc["startMs"] + (dur // 2)
                words_list = sc["transcriptText"].split()
                mid_idx = max(1, len(words_list) // 2)
                text_a = " ".join(words_list[:mid_idx])
                text_b = " ".join(words_list[mid_idx:])

                part_a = dict(sc)
                part_a["endMs"] = mid_ms
                part_a["transcriptText"] = text_a
                part_a["cameraEffect"] = "zoom_in"
                part_a["transition"] = sc.get("transition", "cut")

                part_b = dict(sc)
                part_b["startMs"] = mid_ms
                part_b["transcriptText"] = text_b
                part_b["setting"] = f"{sc['setting']} (Cận cảnh cơ học)"
                part_b["cameraEffect"] = "pan_right"
                part_b["transition"] = "slide"
                if sc.get("imagePrompt"):
                    part_b["imagePrompt"] = (
                        f"Extreme macro close-up, tactile mechanical movement: {sc['imagePrompt']}"
                    )
                split_scenes.extend([part_a, part_b])
            else:
                split_scenes.append(sc)

        scenes = split_scenes

    # Ensure contiguous non-overlapping scene boundaries
    for idx, sc in enumerate(scenes):
        sc["sceneIndex"] = idx + 1
    for i in range(len(scenes) - 1):
        scenes[i]["endMs"] = scenes[i + 1]["startMs"]
    if scenes:
        scenes[-1]["endMs"] = max(scenes[-1]["endMs"], duration_ms)

    return scenes


def breakdown(
    segments: list[Segment],
    duration_ms: int,
    words: list[dict] | None = None,
    script: str = "",
    video_type: str = "",
) -> tuple[list[dict], list[dict]]:
    """Returns (characters, scenes) aligned to word timestamps."""
    if not segments and not script.strip():
        return [], []

    full_script = script.strip() or " ".join(s.text for s in segments)
    is_football = _is_football_script(full_script)
    is_product = video_type == "product" or _is_product_script(full_script)

    # Flatten words from segments if word list not explicitly passed
    if not words:
        words = []
        for s in segments:
            toks = s.text.split()
            for j, t in enumerate(toks):
                w_start = s.start_ms + int(j * (s.end_ms - s.start_ms) / max(1, len(toks)))
                w_end = s.start_ms + int((j + 1) * (s.end_ms - s.start_ms) / max(1, len(toks)))
                words.append({"text": t, "startMs": w_start, "endMs": w_end})

    raw: dict = {}
    if config.GROQ_API_KEY:
        try:
            raw = _call_groq(full_script, is_football, is_product)
        except Exception as e:  # noqa: BLE001
            log.warning("Groq breakdown failed, using sentence fallback: %s", e)

    scenes = _align_scenes_to_words(
        raw.get("scenes", []),
        words,
        segments,
        duration_ms,
        is_football,
        is_product,
    )
    return raw.get("characters", []), scenes
