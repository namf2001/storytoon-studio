#!/usr/bin/env python3
"""
Unified 5-Worker Queue Pool Orchestrator for 2 New TPU Cutting Board TVCs:
1. Video 1 (product-tpu-hygiene-v3): "Chuẩn Vệ Sinh 2 Mặt Sống-Chín & Kháng Khuẩn"
2. Video 2 (product-tpu-compact-v4): "Siêu Gọn Cho Bếp Nhỏ, Phòng Trọ & Cắm Trại Dã Ngoại"

Key Optimizations:
- Thread-safe Profile Pool (`queue.Queue` of 5 isolated GFlow profiles) -> Zero ProfileLockedError (exit 11), zero idle worker wait between Video 1 and Video 2
- Per-scene immediate `I2I -> I2V` pipeline
- Parallel Audio + Faster-Whisper + Go REST API + DB setup for both projects
- Immediate Remotion 1080p MP4 render per video as soon as its 5 scenes complete
"""
import concurrent.futures
import json
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

FLOW_PROJECT_ID = "83ac9d5b-fb21-4657-8fa4-7c43c341ccae"  # Existing TPU Cutting Board Flow Project
RAC_VL_ROOT = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl")
AI_WORKER_DIR = RAC_VL_ROOT / "apps" / "ai-worker"
STORAGE_DIR = RAC_VL_ROOT / "storage"
SOURCE_RAW_DIR = RAC_VL_ROOT / "apps" / "web" / "public" / "product-tpu-cutting-board" / "raw_images"

PROFILES = ["quangtu99772005", "worker_1", "worker_2", "worker_3", "worker_4"]
profile_pool: queue.Queue[str] = queue.Queue()
for _p in PROFILES:
    profile_pool.put(_p)

print_lock = threading.Lock()
tts_lock = threading.Lock()
START_TIME = time.time()


def log(msg: str) -> None:
    elapsed = time.time() - START_TIME
    with print_lock:
        print(f"[{elapsed:6.1f}s] {msg}", flush=True)


CAMPAIGNS = [
    {
        "slug": "product-tpu-hygiene-v3",
        "title": "🛡️ TVC Thớt Dẻo TPU 2 Mặt Sống-Chín Chuẩn Vệ Sinh Kháng Khuẩn (26s)",
        "voice": "Ngọc Linh",
        "scenes": [
            {
                "index": 1,
                "tag": "TPU_V3_S1:",
                "text": "Dùng chung một mặt thớt cho cả thịt sống lẫn đồ chín cực kỳ dễ nhiễm khuẩn chéo và ám mùi hôi! Bảo vệ sức khỏe cả nhà ngay với thớt dẻo TPU kháng khuẩn hai mặt hình bán nguyệt này!",
                "setting": "[1. HOOK VỆ SINH SỐNG-CHÍN] • Nỗi lo nhiễm khuẩn chéo thớt cũ -> Đổi sang thớt dẻo TPU kháng khuẩn 2 mặt",
                "calloutTag": "NHIỄM KHUẨN CHÉO?",
                "calloutText": "Đổi Ngay Thớt TPU Kháng Khuẩn",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["ref_3_ribbed_knife.jpg", "ref_2_smooth_side.png"],
                "image_prompt": (
                    "Cinematic commercial shot in a bright hygienic modern kitchen, 9:16 vertical, softbox lighting. "
                    "Neck-down framing only, no head or face visible: On a clean white quartz countertop, a chef's hands in clean sleeves push away a stained old wooden board and present this exact terracotta-red semi-circular ribbed TPU cutting board with its D-shaped hanging loop shining hygienically beside fresh vegetables and cooked meat."
                ),
                "video_prompt": (
                    "TPU_V3_S1: Cinematic commercial shot, bright hygienic modern kitchen, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Hands push away a dark stained wooden cutting board and place this exact terracotta-red semi-circular TPU cutting board onto the clean quartz counter. "
                    "Seconds 2.5 to 5.0: Hands flip the semi-circular TPU board to showcase both the ribbed anti-slip front side and the smooth rimmed back side for separating raw and cooked food. "
                    "Seconds 5.0 to 6.0: Smooth push-in on the antibacterial TPU surface."
                ),
            },
            {
                "index": 2,
                "tag": "TPU_V3_S2:",
                "text": "Một mặt vân sọc giữ rau củ đứng yên không trượt, mặt kia có rãnh chặn nước thừa khi thái thịt, kèm cạnh đáy vát xiên giúp nhấc thớt lên khỏi mặt bàn cực kỳ nhẹ nhàng.",
                "setting": "[2. THIẾT KẾ 2 MẶT & CẠNH VÁT XIÊN] • Mặt vân sọc chống trượt + Mặt rãnh ngăn nước & Cạnh đáy cắt xiên dễ nhấc",
                "calloutTag": "2 MẶT SỐNG - CHÍN",
                "calloutText": "Vân Chống Trượt · Cạnh Vát Xiên",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["ref_2_smooth_side.png", "ref_3_ribbed_knife.jpg"],
                "image_prompt": (
                    "Macro commercial close-up in a sunlit kitchen, 9:16 vertical, softbox lighting. "
                    "Neck-down framing only, no head or face visible: Close-up showing the beveled bottom edge and smooth juice-groove border of this exact terracotta-red semi-circular TPU cutting board as fingers effortlessly lift the beveled edge off the countertop and slice juicy oranges without liquid spilling over the rim."
                ),
                "video_prompt": (
                    "TPU_V3_S2: Macro commercial close-up, sunlit modern kitchen, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Close-up of fingers effortlessly lifting the beveled bottom edge of the terracotta-red semi-circular TPU cutting board off the flat marble counter. "
                    "Seconds 2.5 to 5.0: Hands slice juicy red tomatoes and oranges on the board while all liquid stays neatly inside the raised perimeter rim. "
                    "Seconds 5.0 to 6.0: Crisp close-up of the anti-slip ribs and juice groove."
                ),
            },
            {
                "index": 3,
                "tag": "TPU_V3_S3:",
                "text": "Thái xong chỉ cần bóp nhẹ hai bên là chiếc thớt uốn cong thành máng phễu, trút thẳng nguyên liệu vào chảo nóng không rơi vãi một giọt.",
                "setting": "[3. UỐN CONG LÀM PHỄU ĐỔ CHẢO] • Bóp nhẹ 2 bên uốn cong thớt TPU trút gọn thức ăn vào chảo nóng",
                "calloutTag": "UỐN CONG LINH HOẠT",
                "calloutText": "Trút Gọn Vào Chảo · Không Rơi Vãi",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["ref_3_ribbed_knife.jpg"],
                "image_prompt": (
                    "Cinematic commercial action shot above a modern kitchen stove, 9:16 vertical, warm lighting. "
                    "Neck-down framing only, no head or face visible: Two hands bend this exact flexible terracotta-red semi-circular TPU cutting board into a smooth curved funnel, pouring freshly diced bell peppers, onions, and beef cubes straight into a sizzling skillet without a single piece falling outside."
                ),
                "video_prompt": (
                    "TPU_V3_S3: Cinematic commercial shot, modern kitchen stove, warm lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Two hands gently squeeze and curve the flexible terracotta-red semi-circular TPU cutting board into a U-shaped chute above a hot frying pan. "
                    "Seconds 2.5 to 5.0: Diced bell peppers and meat slide smoothly down the curved TPU funnel straight into the sizzling pan with zero spills. "
                    "Seconds 5.0 to 6.0: The TPU board flexes back flat in the cook's hands."
                ),
            },
            {
                "index": 4,
                "tag": "TPU_V3_S4:",
                "text": "Chất liệu TPU cao cấp đàn hồi chịu lực băm chặt mà không để lại rãnh dao đen sì, tráng nhẹ dưới vòi nước là trôi sạch dầu mỡ rồi móc lên lỗ treo chữ D khô thoáng.",
                "setting": "[4. CHỐNG HẰN VẾT DAO & RỬA SẠCH] • Bề mặt TPU đàn hồi không xước + Tráng nước sạch bong & Treo lỗ chữ D",
                "calloutTag": "CHỐNG HẰN VẾT DAO",
                "calloutText": "Không Bám Mùi · Lỗ Treo Chữ D",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["ref_3_ribbed_knife.jpg", "ref_2_smooth_side.png"],
                "image_prompt": (
                    "Close-up commercial shot at a modern stainless steel kitchen sink, 9:16 vertical, bright lighting. "
                    "Neck-down framing only, no head or face visible: Clear water from a sleek faucet rinses this exact terracotta-red semi-circular ribbed TPU cutting board spotless in seconds, with a hand hanging it up by its corner D-shaped hanging hole on a wall hook."
                ),
                "video_prompt": (
                    "TPU_V3_S4: Close-up commercial shot, modern kitchen sink, bright lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Running faucet water washes across the terracotta-red semi-circular ribbed TPU cutting board, rinsing away food residue effortlessly with zero knife scratches visible. "
                    "Seconds 2.5 to 5.0: A hand lifts the spotless TPU board and hangs it neatly on a stainless wall hook using the corner D-shaped hanging loop. "
                    "Seconds 5.0 to 6.0: Clean hold as water droplets roll off the hygienic surface."
                ),
            },
            {
                "index": 5,
                "tag": "TPU_V3_S5:",
                "text": "Sắm trọn bộ bốn màu tươi tắn để phân loại đồ sống, đồ chín và trái cây chuẩn đầu bếp, bấm giỏ hàng góc trái chốt đơn ưu đãi ngay hôm nay!",
                "setting": "[5. BỘ 4 MÀU PHÂN LOẠI & CTA] • Bộ 4 màu Đỏ, Trắng kem, Xanh lá, Cam phân loại thực phẩm & Chốt đơn",
                "calloutTag": "BỘ 4 MÀU PHÂN LOẠI",
                "calloutText": "Sống · Chín · Trái Cây · Đặt Ngay!",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["ref_1_four_colors.png"],
                "image_prompt": (
                    "Bright commercial outro showcase on a sunlit marble kitchen island, 9:16 vertical, warm morning light. "
                    "All four vibrant colors of this exact semi-circular ribbed TPU cutting board with D-shaped hanging loops—terracotta red, cream white, lime green, and bright orange—arranged neatly upright in a fan formation beside fresh fruits and herbs, leaving clean lower-third space for a shopping cart CTA."
                ),
                "video_prompt": (
                    "TPU_V3_S5: Lifestyle commercial outro shot, sunlit marble kitchen island, 9:16 vertical. "
                    "Seconds 0 to 2.5: Smooth camera push-in toward the four colorful semi-circular ribbed TPU cutting boards—terracotta red, cream white, lime green, and bright orange—standing in a neat display. "
                    "Seconds 2.5 to 5.0: Camera glides gently highlighting the D-shaped hanging loops, raised juice borders, and anti-slip ribs. "
                    "Seconds 5.0 to 6.0: Steady hero hold leaving clean lower-third space for shopping cart CTA."
                ),
            },
        ],
    },
    {
        "slug": "product-tpu-compact-v4",
        "title": "🏕️ TVC Thớt Dẻo TPU Bán Nguyệt Siêu Gọn Cho Bếp Nhỏ & Cắm Trại (26s)",
        "voice": "Ngọc Linh",
        "scenes": [
            {
                "index": 1,
                "tag": "TPU_V4_S1:",
                "text": "Bếp phòng trọ hay căn hộ nhỏ chật kín chỗ mà vẫn ôm chiếc thớt gỗ dày cộp nặng trịch? Giải phóng không gian bếp tức thì với chiếc thớt dẻo TPU bán nguyệt siêu mỏng nhẹ này!",
                "setting": "[1. HOOK BẾP NHỎ PHÒNG TRỌ] • Bếp nhỏ chật chội thớt gỗ nặng -> Giải phóng không gian với thớt TPU bán nguyệt",
                "calloutTag": "BẾP NHỎ CHẬT CHỘI?",
                "calloutText": "Giải Pháp Thớt TPU Siêu Mỏng Nhẹ",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["ref_1_four_colors.png", "ref_3_ribbed_knife.jpg"],
                "image_prompt": (
                    "Cinematic commercial shot in a cozy minimalist small apartment kitchen counter, 9:16 vertical, warm daylight. "
                    "Neck-down framing only, no head or face visible: Hands remove a bulky heavy thick wooden block and lay down this sleek ultra-thin terracotta-red semi-circular ribbed TPU cutting board that fits the compact countertop edge with plenty of room to spare."
                ),
                "video_prompt": (
                    "TPU_V4_S1: Cinematic commercial shot, compact modern apartment kitchen, warm daylight, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Hands lift away a heavy bulky wooden cutting block from a small kitchen counter. "
                    "Seconds 2.5 to 5.0: Hands smoothly place this sleek lightweight terracotta-red semi-circular ribbed TPU cutting board flush against the counter edge, instantly freeing up workspace. "
                    "Seconds 5.0 to 6.0: Smooth camera push-in showcasing the space-saving semi-circular design."
                ),
            },
            {
                "index": 2,
                "tag": "TPU_V4_S2:",
                "text": "Kiểu dáng nửa hình tròn đặt vừa khít sát mép bàn bếp hẹp, dùng xong treo gọn lên tường nhờ lỗ chữ D thông minh, trả lại mặt bàn rộng rãi sạch bong.",
                "setting": "[2. ĐẶT SÁT MÉP BÀN & TREO TƯỜNG] • Hình bán nguyệt vừa khít mép bàn hẹp & Lỗ treo chữ D gọn gàng",
                "calloutTag": "DÁNG BÁN NGUYỆT",
                "calloutText": "Đặt Sát Mép Bàn · Treo Lỗ Chữ D",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["ref_2_smooth_side.png", "ref_1_four_colors.png"],
                "image_prompt": (
                    "Cinematic commercial shot in a minimalist studio kitchen, 9:16 vertical, softbox lighting. "
                    "Neck-down framing only, no head or face visible: A hand hangs this exact semi-circular TPU cutting board by its corner D-shaped loop onto a sleek wall rail above a spotless narrow kitchen counter alongside kitchen utensils."
                ),
                "video_prompt": (
                    "TPU_V4_S2: Cinematic commercial shot, minimalist studio kitchen, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Close-up of the straight bottom edge of the semi-circular TPU cutting board aligned flush against a narrow kitchen counter edge. "
                    "Seconds 2.5 to 5.0: A hand lifts the lightweight board by its beveled edge and hangs it effortlessly on a wall hook via the D-shaped hanging hole. "
                    "Seconds 5.0 to 6.0: Wide hold showing the tidy, clutter-free countertop below."
                ),
            },
            {
                "index": 3,
                "tag": "TPU_V4_S3:",
                "text": "Độ dẻo TPU êm ái giảm hẳn tiếng ồn lạch cạch khi thái đồ ăn, mặt vân nhỏ giữ cà chua dưa leo cố định giúp người mới tập nấu ăn cũng thái đẹp như ngoài hàng.",
                "setting": "[3. THÁI ÊM ÁI KHÔNG TRƯỢT] • Bề mặt TPU êm dao giảm tiếng ồn & Vân sọc giữ cà chua cố định dễ thái",
                "calloutTag": "THÁI ÊM · KHÔNG TRƯỢT",
                "calloutText": "Vân Sọc Giữ Chặt Rau Củ Quả",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["ref_3_ribbed_knife.jpg"],
                "image_prompt": (
                    "Macro commercial close-up in a warm sunlit kitchen, 9:16 vertical, softbox lighting. "
                    "Neck-down framing only, no head or face visible: A young cook's hands slicing cherry tomatoes and crisp green cucumbers into even thin slices with a white-handled knife on the vertical anti-slip ribs of this exact terracotta-red semi-circular TPU cutting board."
                ),
                "video_prompt": (
                    "TPU_V4_S3: Macro commercial close-up, warm sunlit kitchen, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: Hands place slippery cherry tomatoes and cucumber on the vertical anti-slip ribs of the terracotta-red semi-circular TPU cutting board. "
                    "Seconds 2.5 to 5.0: A white-handled knife glides smoothly and quietly through the vegetables, producing even slices while the TPU surface cushions the blade without scratches. "
                    "Seconds 5.0 to 6.0: Clean macro hold on the neat vegetable slices."
                ),
            },
            {
                "index": 4,
                "tag": "TPU_V4_S4:",
                "text": "Đặc biệt thớt siêu nhẹ và uốn cong linh hoạt, dễ dàng cuộn gọn bỏ vào túi mang đi cắm trại hay nướng BBQ ngoài trời, đổ thẳng đồ ăn vào nồi cực tiện.",
                "setting": "[4. CUỘN GỌN ĐI CẮM TRẠI BBQ] • Uốn cong siêu nhẹ mang đi cắm trại dã ngoại & Trút đồ ăn ngoài trời",
                "calloutTag": "MANG ĐI CẮM TRẠI",
                "calloutText": "Siêu Nhẹ · Uốn Cong Đa Năng",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["ref_3_ribbed_knife.jpg", "ref_1_four_colors.png"],
                "image_prompt": (
                    "Cinematic outdoor camping picnic commercial shot on a sunlit wooden camp table surrounded by green nature bokeh, 9:16 vertical. "
                    "Neck-down framing only, no head or face visible: Hands curve this exact flexible terracotta-red semi-circular TPU cutting board to funnel freshly sliced BBQ meat and bell peppers straight into a camping skillet on a portable stove."
                ),
                "video_prompt": (
                    "TPU_V4_S4: Cinematic outdoor camping commercial shot, sunlit wooden picnic table, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                    "Seconds 0 to 2.5: On an outdoor camping table, two hands bend the flexible terracotta-red semi-circular TPU cutting board into a curved funnel. "
                    "Seconds 2.5 to 5.0: Sliced BBQ vegetables and meat pour smoothly down the curved TPU board straight into a sizzling camping pan on a portable stove without spilling. "
                    "Seconds 5.0 to 6.0: Hands flatten the lightweight TPU board effortlessly."
                ),
            },
            {
                "index": 5,
                "tag": "TPU_V4_S5:",
                "text": "Chống mốc chống xước bền bỉ gấp nhiều lần thớt thường, bốn màu cực xinh giá siêu tiết kiệm, bấm giỏ hàng rinh ngay về bếp nha!",
                "setting": "[5. SIÊU BỀN 4 MÀU & CTA] • 4 màu Đỏ, Trắng kem, Xanh lá, Cam bền bỉ tiết kiệm & Kêu gọi chốt đơn",
                "calloutTag": "SIÊU BỀN · GIÁ HỜI",
                "calloutText": "Đủ 4 Màu Xinh · Chốt Đơn Ngay!",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["ref_1_four_colors.png"],
                "image_prompt": (
                    "Vibrant commercial finale shot in a sunlit modern kitchen, 9:16 vertical, warm daylight. "
                    "Hands (framed from chest down) fan out all four bright colors of this exact semi-circular ribbed TPU cutting board with D-shaped hanging loops—terracotta red, cream white, lime green, and bright orange—above a clean kitchen counter with clean lower-third space for a shopping cart CTA."
                ),
                "video_prompt": (
                    "TPU_V4_S5: Vibrant commercial finale shot, sunlit modern kitchen, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands fan out the four vibrant semi-circular ribbed TPU cutting boards—terracotta red, cream white, lime green, and bright orange—in front of the camera. "
                    "Seconds 2.5 to 5.0: Camera pushes in gently highlighting the flexible TPU texture, raised juice border, and D-shaped hanging loops. "
                    "Seconds 5.0 to 6.0: Steady hero hold leaving clean lower-third space for shopping cart CTA."
                ),
            },
        ],
    },
]


def ensure_worker_profiles() -> None:
    gflow_home = Path.home() / "Library" / "Application Support" / "gflow-cli"
    src_profile = gflow_home / "profile_quangtu99772005"
    if not src_profile.exists():
        return
    for w in range(1, 5):
        dst_profile = gflow_home / f"profile_worker_{w}"
        if not dst_profile.exists():
            subprocess.run(
                [
                    "rsync", "-a", "--delete",
                    "--exclude=Singleton*",
                    "--exclude=RunningChromeVersion",
                    "--exclude=*Cache*",
                    "--exclude=Code Cache",
                    "--exclude=Service Worker",
                    f"{src_profile}/",
                    f"{dst_profile}/",
                ],
                check=True,
            )


def find_media_id_by_prompt(prompt_tag: str) -> str | None:
    res = subprocess.run(["gflow", "data", "list", "videos"], capture_output=True, text=True)
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
            if row.get("project_id") == FLOW_PROJECT_ID and prompt_tag in row.get("prompt", ""):
                if row.get("media_id"):
                    return row["media_id"]
        except Exception:
            pass
    return None


def download_by_media_id(label: str, profile: str, media_id: str, clip_dir: Path, target_mp4: Path) -> bool:
    env = {**os.environ, "GFLOW_CLI_PROFILE": profile}
    for attempt in range(1, 4):
        log(f"📥 [{label} · {profile} · Attempt {attempt}/3] Downloading media_id={media_id}...")
        res = subprocess.run(
            ["gflow", "data", "download", media_id, "--out", str(clip_dir), "--json"],
            capture_output=True,
            text=True,
            env=env,
        )
        candidate = clip_dir / f"{media_id}.mp4"
        if candidate.exists() and candidate.stat().st_size > 50000:
            shutil.move(str(candidate), str(target_mp4))
            log(f"✅ [{label} · {profile}] Video ready: {target_mp4.name} ({target_mp4.stat().st_size} B)")
            return True
        time.sleep(3)
    return False


def run_scene_task(slug: str, sc: dict) -> tuple[str, int]:
    """Acquires a free GFlow profile from the pool, runs I2I -> immediately I2V, and returns the profile to the pool."""
    idx = sc["index"]
    label = f"{slug}#S{idx}"
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    raw_dir = base_dir / "raw_images"
    img_dir = base_dir / "images"
    clip_dir = base_dir / "clips"
    img_out = img_dir / f"ref_scene_0{idx}.jpg"
    clip_out = clip_dir / f"scene_0{idx}.mp4"
    prompt_tag = sc["tag"]

    profile = profile_pool.get()
    try:
        env = {**os.environ, "GFLOW_CLI_PROFILE": profile}

        # 1. Generate I2I Keyframe
        if not (img_out.exists() and img_out.stat().st_size > 10000):
            for attempt in range(1, 4):
                cmd = [
                    "gflow", "image", "i2i",
                    "--project", FLOW_PROJECT_ID,
                    "--aspect", "9:16",
                    "-o", str(img_out),
                ]
                for r in sc["refs"]:
                    cmd.extend(["--ref", str(raw_dir / r)])
                cmd.append(sc["image_prompt"])
                log(f"🎨 [{label} I2I · {profile} · Attempt {attempt}] Generating keyframe...")
                res = subprocess.run(cmd, capture_output=True, text=True, env=env)
                if res.returncode == 0 and img_out.exists() and img_out.stat().st_size > 10000:
                    log(f"✅ [{label} I2I · {profile}] Keyframe saved ({img_out.stat().st_size} B) -> Immediately launching I2V!")
                    break
                log(f"⚠️ [{label} I2I · {profile}] Attempt {attempt} failed (exit {res.returncode}), retrying...")
                time.sleep(3)
            if not (img_out.exists() and img_out.stat().st_size > 10000):
                raise RuntimeError(f"Failed {label} I2I image")
        else:
            log(f"⏭️ [{label} I2I · {profile}] Keyframe exists -> Immediately launching I2V!")

        # 2. Immediately generate I2V Video
        if not (clip_out.exists() and clip_out.stat().st_size > 50000):
            for attempt in range(1, 3):
                cmd = [
                    "gflow", "video", "i2v",
                    "--project", FLOW_PROJECT_ID,
                    "--model", "omni-flash",
                    "--duration", "6",
                    "--resolution", "360p",
                    "--aspect", "9:16",
                    "-i", str(img_out),
                    "-o", str(clip_out),
                    sc["video_prompt"],
                ]
                log(f"🎬 [{label} I2V · {profile} · Attempt {attempt}] Generating 6s AI video clip...")
                res = subprocess.run(cmd, capture_output=True, text=True, env=env)
                if res.returncode == 0 and clip_out.exists() and clip_out.stat().st_size > 50000:
                    log(f"✅ [{label} I2V · {profile}] Video saved directly: {clip_out.name}")
                    break

                time.sleep(2)
                vid_id = find_media_id_by_prompt(prompt_tag)
                if vid_id:
                    log(f"🔄 [{label} I2V · {profile}] Matched media_id={vid_id} by tag '{prompt_tag}', downloading...")
                    if download_by_media_id(label, profile, vid_id, clip_dir, clip_out):
                        break
                log(f"⚠️ [{label} I2V · {profile}] Attempt {attempt} did not produce downloadable video, retrying...")
                time.sleep(3)

            if not (clip_out.exists() and clip_out.stat().st_size > 50000):
                raise RuntimeError(f"Failed {label} I2V video")
        else:
            log(f"⏭️ [{label} I2V · {profile}] Video already exists: {clip_out.name}")

        return slug, idx
    finally:
        profile_pool.put(profile)


def setup_audio_and_db_for_campaign(camp: dict) -> str:
    """Synthesizes voiceover, extracts Whisper timestamps, creates Go API project & saves 5 scenes."""
    slug = camp["slug"]
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    proj_id_file = base_dir / "project_id.txt"
    out_wav = base_dir / "voice.wav"
    words_file = base_dir / "words.json"

    if proj_id_file.exists() and out_wav.exists() and words_file.exists():
        existing_id = proj_id_file.read_text(encoding="utf-8").strip()
        if existing_id:
            log(f"⏭️ [{slug} Audio] Reusing existing voiceover & project_id={existing_id}")
            return existing_id

    sys.path.insert(0, str(AI_WORKER_DIR))
    from app.tts import _synth_vieneu
    from app.captions import transcribe

    raw_wav = base_dir / "voice_raw.wav"
    full_script = " ".join(sc["text"] for sc in camp["scenes"])

    with tts_lock:
        log(f"🎙️ [{slug} Audio] Synthesizing script with VieNeu-TTS ({camp['voice']})...")
        _synth_vieneu(full_script, raw_wav, camp["voice"])

        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw_wav), "-filter:a", "atempo=1.38", str(out_wav)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        log(f"🎙️ [{slug} Audio] Transcribing word-level timestamps with Faster-Whisper...")
        words, segments, dur_ms = transcribe(out_wav, full_script)

    words_file.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    seg_dicts = [{"index": i, "startMs": s.start_ms, "endMs": s.end_ms, "text": s.text} for i, s in enumerate(segments)]
    (base_dir / "segments.json").write_text(json.dumps(seg_dicts, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"✅ [{slug} Audio] Voiceover ready: {dur_ms} ms ({len(words)} words, {len(seg_dicts)} segments)")

    if len(seg_dicts) >= 6:
        bounds = [
            (0, seg_dicts[1]["endMs"]),
            (seg_dicts[1]["endMs"], seg_dicts[2]["endMs"]),
            (seg_dicts[2]["endMs"], seg_dicts[3]["endMs"]),
            (seg_dicts[3]["endMs"], seg_dicts[4]["endMs"]),
            (seg_dicts[4]["endMs"], dur_ms),
        ]
    elif len(seg_dicts) == 5:
        bounds = [(seg_dicts[i]["startMs"], seg_dicts[i]["endMs"] if i < 4 else dur_ms) for i in range(5)]
    else:
        step = dur_ms // 5
        bounds = [(i * step, (i + 1) * step if i < 4 else dur_ms) for i in range(5)]

    req = urllib.request.Request(
        "http://localhost:9090/api/v1/projects",
        data=json.dumps({
            "title": camp["title"],
            "script": full_script,
            "aspectRatio": "9:16",
            "videoType": "product",
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        project_id = json.loads(resp.read().decode("utf-8"))["data"]["id"]

    proj_id_file.write_text(project_id, encoding="utf-8")
    proj_storage = STORAGE_DIR / project_id
    proj_storage.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_wav, proj_storage / "voice.wav")

    words_json = words_file.read_text(encoding="utf-8")
    sql = f"""
    UPDATE projects
    SET audio_path = '{project_id}/voice.wav',
        duration_ms = {dur_ms},
        status = 'ready',
        words = $w${words_json}$w$::jsonb
    WHERE id = '{project_id}';
    """
    subprocess.run(
        ["psql", "postgres://storytoon:storytoon@localhost:5432/storytoon?sslmode=disable", "-c", sql],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    scenes_payload = {"scenes": []}
    for i, sc in enumerate(camp["scenes"]):
        start_ms, end_ms = bounds[i]
        scenes_payload["scenes"].append({
            "sceneIndex": sc["index"],
            "startMs": start_ms,
            "endMs": end_ms,
            "transcriptText": sc["text"],
            "setting": sc["setting"],
            "characters": [],
            "imagePrompt": "",
            "imageUrl": f"http://localhost:9090/media/{slug}/clips/scene_0{sc['index']}.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=6.04",
            "cameraEffect": sc["cameraEffect"],
            "transition": sc["transition"],
            "showCaption": True,
            "layoutType": "standard",
            "layers": [],
            "calloutTag": sc["calloutTag"],
            "calloutText": sc["calloutText"],
            "calloutPosition": "top_center",
            "calloutTheme": "dark",
        })

    req_scenes = urllib.request.Request(
        f"http://localhost:9090/api/v1/projects/{project_id}/scenes",
        data=json.dumps(scenes_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req_scenes) as resp:
        json.loads(resp.read().decode("utf-8"))

    log(f"✅ [{slug} Audio] Created Go API project_id={project_id} & saved 5 scenes!")
    return project_id


def render_campaign_mp4(slug: str, project_id: str) -> dict:
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    clip_dir = base_dir / "clips"
    proj_storage = STORAGE_DIR / project_id
    proj_storage.mkdir(parents=True, exist_ok=True)
    for clip in clip_dir.glob("scene_*.mp4"):
        shutil.copy2(clip, proj_storage / clip.name)

    log(f"🎬 [{slug}] Triggering Remotion 1080p MP4 render for project_id={project_id}...")
    with urllib.request.urlopen(f"http://localhost:9090/api/v1/projects/{project_id}") as resp:
        proj = json.loads(resp.read().decode("utf-8"))["data"]

    render_payload = {
        "project_id": project_id,
        "composition_id": "ProductCommercialVideo",
        "input_props": {
            "audioUrl": proj["audioUrl"],
            "durationMs": proj["durationMs"],
            "aspectRatio": "9:16",
            "words": proj["words"],
            "scenes": proj["scenes"],
            "bgmUrl": "http://localhost:9090/media/football-assets/bgm.mp3",
            "bgmVolume": 0.12,
        },
    }
    req = urllib.request.Request(
        "http://localhost:8000/video/render",
        data=json.dumps(render_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.loads(r.read().decode("utf-8"))
    log(f"🏆 [{slug}] Render MP4 Complete -> {res['videoUrl']}")
    return res


def main():
    ensure_worker_profiles()

    for camp in CAMPAIGNS:
        slug = camp["slug"]
        base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
        raw_dir = base_dir / "raw_images"
        (base_dir / "images").mkdir(parents=True, exist_ok=True)
        (base_dir / "clips").mkdir(parents=True, exist_ok=True)
        raw_dir.mkdir(parents=True, exist_ok=True)

        symlink_path = STORAGE_DIR / slug
        if not symlink_path.exists():
            symlink_path.symlink_to(base_dir)

        for f in SOURCE_RAW_DIR.iterdir():
            if f.is_file():
                shutil.copy2(f, raw_dir / f.name)

    log("🚀 Starting Unified 5-Worker Queue Pool for 2 TPU Cutting Board TVCs (10 scenes total + Audio/DB thread)...")

    # Submit Audio/DB setup for both campaigns + all 10 scene tasks (5 for V3 first, then 5 for V4)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        audio_futures = {
            camp["slug"]: executor.submit(setup_audio_and_db_for_campaign, camp)
            for camp in CAMPAIGNS
        }

        scene_futures = {}
        for camp in CAMPAIGNS:
            for sc in camp["scenes"]:
                fut = executor.submit(run_scene_task, camp["slug"], sc)
                scene_futures[fut] = (camp["slug"], sc["index"])

        completed_counts = {camp["slug"]: 0 for camp in CAMPAIGNS}
        render_futures = {}

        for fut in concurrent.futures.as_completed(scene_futures):
            slug, idx = fut.result()
            completed_counts[slug] += 1
            log(f"🎉 [{slug}#S{idx}] Finished ({completed_counts[slug]}/5 scenes complete for {slug})!")

            # As soon as all 5 scenes of a campaign finish, render its MP4 immediately!
            if completed_counts[slug] == 5 and slug not in render_futures:
                proj_id = audio_futures[slug].result()
                render_futures[slug] = executor.submit(render_campaign_mp4, slug, proj_id)

        results = {}
        for camp in CAMPAIGNS:
            slug = camp["slug"]
            proj_id = audio_futures[slug].result()
            render_res = render_futures[slug].result()
            results[slug] = {"project_id": proj_id, "render": render_res}

    total_sec = time.time() - START_TIME
    log(f"🏆 ALL 2 TPU CUTTING BOARD TVCS COMPLETE in {total_sec:.1f}s ({total_sec/60:.2f} minutes)!")
    for slug, info in results.items():
        log(f"👉 [{slug}] Studio: http://localhost:3000/product?id={info['project_id']} | MP4: {info['render']['videoUrl']}")


if __name__ == "__main__":
    main()
