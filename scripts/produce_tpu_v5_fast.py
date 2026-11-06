#!/usr/bin/env python3
"""
5-Worker Parallel Orchestrator for TPU Cutting Board V5 (`product-tpu-chef-v5`):
Angle: "Chuẩn Bị Đồ Ăn Dặm Sạch Khuẩn & Bảo Vệ Lưỡi Dao Sắc Bén — Tự Phục Hồi Vết Cắt & Khử Trùng Nước Sôi"

All 5 scenes run 100% simultaneously across 5 isolated worker profiles on the existing
TPU Cutting Board Google Flow Project (`83ac9d5b-fb21-4657-8fa4-7c43c341ccae`), while a 6th thread
synthesizes sample-accurate per-scene VieNeu-TTS audio + Faster-Whisper word timestamps + Go API project.
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

FLOW_PROJECT_ID = "83ac9d5b-fb21-4657-8fa4-7c43c341ccae"
RAC_VL_ROOT = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl")
AI_WORKER_DIR = RAC_VL_ROOT / "apps" / "ai-worker"
STORAGE_DIR = RAC_VL_ROOT / "storage"
SOURCE_RAW_DIR = RAC_VL_ROOT / "apps" / "web" / "public" / "product-tpu-cutting-board" / "raw_images"

PROFILES = ["quangtu99772005"]
profile_pool: queue.Queue[str] = queue.Queue()
for _p in PROFILES:
    profile_pool.put(_p)
started_profiles: set[str] = set()
started_lock = threading.Lock()

print_lock = threading.Lock()
tts_lock = threading.Lock()
START_TIME = time.time()


def log(msg: str) -> None:
    elapsed = time.time() - START_TIME
    with print_lock:
        print(f"[{elapsed:6.1f}s] {msg}", flush=True)


CAMPAIGN = {
    "slug": "product-tpu-chef-v5",
    "title": "🔪 [V5: Êm Dao & Sạch Khuẩn Cho Bé] TVC Thớt Dẻo TPU Kháng Khuẩn 2 Mặt Hình Bán Nguyệt (28s)",
    "voice": "Ngọc Linh",
    "atempo": 1.38,
    "scenes": [
        {
            "index": 1,
            "tag": "TPU_V5_S1:",
            "text": "Thớt gỗ dùng lâu dễ lên mùn dằm mốc đen, còn thớt kính thì kêu chát chúa làm cùn hết cả bộ dao xịn? Lên đời ngay chiếc thớt dẻo TPU kháng khuẩn hình bán nguyệt chuẩn Hàn Quốc này nhé!",
            "setting": "[1. HOOK THỚT MÙN DẰM & CÙN DAO] • Bỏ thớt gỗ mốc đen cùn dao -> Đổi sang thớt dẻo TPU hình bán nguyệt kháng khuẩn",
            "calloutTag": "MÙN DẰM · MỐC ĐEN?",
            "calloutText": "Đổi Ngay Thớt Dẻo TPU Chuẩn Hàn",
            "cameraEffect": "zoom_in",
            "transition": "fade",
            "refs": ["ref_3_ribbed_knife.jpg", "ref_1_four_colors.png"],
            "image_prompt": (
                "Cinematic commercial shot in a sunlit modern kitchen, 9:16 vertical, warm studio lighting. "
                "Neck-down framing only, no head or face visible: Hands sweep away a splintered moldy wooden cutting board and lay down this exact sleek terracotta-red semi-circular ribbed TPU cutting board with a D-shaped hanging hole alongside a gleaming chef's knife and fresh baby vegetables."
            ),
            "video_prompt": (
                "TPU_V5_S1: Cinematic commercial shot, sunlit modern kitchen, warm studio lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                "Seconds 0 to 2.5: Hands push aside an old scarred wooden board and place this exact terracotta-red semi-circular ribbed TPU cutting board onto the marble counter. "
                "Seconds 2.5 to 5.0: Hands glide a gleaming chef's knife smoothly over the hygienic terracotta-red TPU surface with zero splinters or noise. "
                "Seconds 5.0 to 6.0: Crisp hero push-in on the semi-circular TPU cutting board."
            ),
        },
        {
            "index": 2,
            "tag": "TPU_V5_S2:",
            "text": "Chất liệu TPU nguyên sinh có độ đàn hồi tự phục hồi bề mặt, giúp lưỡi dao lướt cực êm, giữ dao luôn sắc bén và không để lại rãnh xước sâu tích tụ vi khuẩn.",
            "setting": "[2. ĐÀN HỒI BẢO VỆ LƯỠI DAO] • Cận cảnh lưỡi dao thái cực êm trên bề mặt TPU đàn hồi chống hằn vết cắt",
            "calloutTag": "ĐÀN HỒI ÊM DAO",
            "calloutText": "Giữ Dao Sắc Bén · Không Rãnh Xước",
            "cameraEffect": "static",
            "transition": "slide",
            "refs": ["ref_3_ribbed_knife.jpg"],
            "image_prompt": (
                "Extreme macro commercial close-up in a bright modern kitchen, 9:16 vertical, softbox lighting. "
                "Neck-down framing only, no head or face visible: A sharp stainless steel knife finely juliennes fresh orange carrots and tender beef on the vertical anti-slip ribs of this exact terracotta-red semi-circular TPU cutting board while the resilient TPU surface stays completely smooth and scratch-free."
            ),
            "video_prompt": (
                "TPU_V5_S2: Extreme macro commercial close-up, bright modern kitchen, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                "Seconds 0 to 2.5: A sharp chef's knife slices finely through bright orange carrots and herbs on the terracotta-red ribbed TPU cutting board with a soft cushioned impact. "
                "Seconds 2.5 to 5.0: Hands brush the diced carrots aside to reveal the resilient TPU surface looking pristine with zero deep knife grooves. "
                "Seconds 5.0 to 6.0: Macro hold on the scratch-resistant antibacterial TPU texture."
            ),
        },
        {
            "index": 3,
            "tag": "TPU_V5_S3:",
            "text": "Mặt trước dập vân nổi chống trượt giữ chặt cà chua cá tươi không bị xê dịch khi thái lát mỏng, mặt sau có viền chặn nước khóa gọn nước cốt không chảy tràn ra bàn bếp.",
            "setting": "[3. VÂN CHỐNG TRƯỢT & RÃNH KHÓA NƯỚC] • Mặt vân nổi giữ chặt thực phẩm trơn & Mặt sau có viền ngăn nước tràn",
            "calloutTag": "VÂN NỔI CHỐNG TRƯỢT",
            "calloutText": "Viền Khóa Nước Cốt · Bàn Bếp Luôn Khô",
            "cameraEffect": "zoom_in",
            "transition": "fade",
            "refs": ["ref_2_smooth_side.png", "ref_3_ribbed_knife.jpg"],
            "image_prompt": (
                "Cinematic commercial close-up shot in a sunlit kitchen, 9:16 vertical, warm daylight. "
                "Neck-down framing only, no head or face visible: Hands slice ripe juicy red tomatoes and fresh salmon fillets on this exact terracotta-red semi-circular TPU cutting board, showing how the raised perimeter rim traps every drop of juice inside the board."
            ),
            "video_prompt": (
                "TPU_V5_S3: Cinematic commercial close-up, sunlit modern kitchen, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                "Seconds 0 to 2.5: Hands slice ripe juicy tomatoes and fresh salmon effortlessly on the anti-slip surface of the terracotta-red semi-circular TPU cutting board without any slipping. "
                "Seconds 2.5 to 5.0: Camera zooms in on the raised perimeter juice border holding all liquid neatly inside while the countertop stays completely dry. "
                "Seconds 5.0 to 6.0: Steady macro hold on the dual-sided functional design."
            ),
        },
        {
            "index": 4,
            "tag": "TPU_V5_S4:",
            "text": "Thiết kế cạnh đáy vát xiên thông minh giúp nhấc thớt dễ dàng chỉ bằng một ngón tay, uốn cong nhẹ nhàng để trút gọn toàn bộ rau củ băm nhỏ vào nồi súp nóng hổi mà không rơi một miếng.",
            "setting": "[4. CẠNH VÁT XIÊN & UỐN CONG TRÚT NỒI] • Nhấc nhẹ cạnh đáy vát xiên & Bóp cong làm phễu trút rau củ vào nồi súp",
            "calloutTag": "CẠNH ĐÁY VÁT XIÊN",
            "calloutText": "Nhấc 1 Ngón Tay · Uốn Cong Trút Nồi",
            "cameraEffect": "static",
            "transition": "slide",
            "refs": ["ref_2_smooth_side.png", "ref_3_ribbed_knife.jpg"],
            "image_prompt": (
                "Cinematic commercial action shot above a simmering glass soup pot on a modern stove, 9:16 vertical, warm lighting. "
                "Neck-down framing only, no head or face visible: Hands lift the beveled bottom edge of this exact flexible terracotta-red semi-circular TPU cutting board and curve it into a smooth funnel, pouring finely diced baby vegetables straight into the steaming soup pot."
            ),
            "video_prompt": (
                "TPU_V5_S4: Cinematic commercial shot, modern kitchen stove, warm lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
                "Seconds 0 to 2.5: A finger easily lifts the beveled bottom edge of the terracotta-red semi-circular TPU cutting board, and two hands curve it into a U-shaped funnel. "
                "Seconds 2.5 to 5.0: Finely diced colorful vegetables slide smoothly down the curved TPU chute straight into a simmering pot of soup with zero spills. "
                "Seconds 5.0 to 6.0: The flexible TPU board springs back flat effortlessly."
            ),
        },
        {
            "index": 5,
            "tag": "TPU_V5_S5:",
            "text": "Dễ dàng tráng nước nóng khử trùng sạch bóng trong vài giây, đủ bốn màu xinh xắn phân loại đồ ăn cho bé và gia đình, bấm ngay giỏ hàng góc trái để săn giá hời hôm nay!",
            "setting": "[5. KHỬ TRÙNG NƯỚC SÔI & BỘ 4 MÀU CTA] • Tráng nước nóng khử trùng sạch bóng & Trưng bày đủ 4 màu kèm nút mua",
            "calloutTag": "KHỬ TRÙNG NƯỚC NÓNG",
            "calloutText": "Đủ 4 Màu Phân Loại · Săn Giá Hời Ngay!",
            "cameraEffect": "zoom_in",
            "transition": "fade",
            "refs": ["ref_1_four_colors.png"],
            "image_prompt": (
                "Vibrant commercial finale shot on a sunlit white marble kitchen counter, 9:16 vertical, golden morning light. "
                "All four vibrant colors of this exact semi-circular ribbed TPU cutting board with D-shaped hanging loops—terracotta red, cream white, lime green, and bright orange—displayed upright in a neat fan arrangement with gentle warm steam rising, leaving clean lower-third space for a shopping cart CTA."
            ),
            "video_prompt": (
                "TPU_V5_S5: Vibrant commercial finale shot, sunlit marble kitchen counter, 9:16 vertical. Neck-down framing only. "
                "Seconds 0 to 2.5: Warm steaming water rinses off the terracotta-red TPU board, followed by a smooth camera reveal of all four colors—terracotta red, cream white, lime green, and bright orange—standing in a neat fan formation. "
                "Seconds 2.5 to 5.0: Camera pushes in gently showcasing the D-shaped hanging loops, anti-slip ribs, and spotless hygienic finish. "
                "Seconds 5.0 to 6.0: Steady hero hold leaving clean lower-third space for shopping cart CTA."
            ),
        },
    ],
}


def ensure_worker_profiles() -> None:
    """Ensure no cloned worker profiles exist that could fork Google 1PSIDTS session cookies."""
    gflow_home = Path.home() / "Library" / "Application Support" / "gflow-cli"
    for w in range(1, 6):
        dst_profile = gflow_home / f"profile_worker_{w}"
        if dst_profile.exists():
            shutil.rmtree(dst_profile, ignore_errors=True)


def find_image_id_by_prompt(prompt_substr: str) -> str | None:
    res = subprocess.run(["gflow", "data", "list", "images", "--limit", "30", "--json"], capture_output=True, text=True)
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
            if row.get("project_id") == FLOW_PROJECT_ID and prompt_substr[:60] in (row.get("prompt") or ""):
                if row.get("media_id"):
                    return row["media_id"]
        except Exception:
            pass
    return None


def find_media_id_by_prompt(prompt_tag: str) -> str | None:
    res = subprocess.run(["gflow", "data", "list", "videos", "--limit", "40", "--json"], capture_output=True, text=True)
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
            if row.get("project_id") == FLOW_PROJECT_ID and prompt_tag in (row.get("prompt") or ""):
                if row.get("media_id"):
                    return row["media_id"]
        except Exception:
            pass
    return None


def download_by_media_id(label: str, profile: str, media_id: str, clip_dir: Path, target_mp4: Path) -> bool:
    env = {**os.environ, "GFLOW_CLI_PROFILE": profile}
    for attempt in range(1, 4):
        log(f"📥 [{label} · {profile} · Attempt {attempt}/3] Downloading media_id={media_id}...")
        subprocess.run(
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
        with started_lock:
            if profile not in started_profiles:
                delay = len(started_profiles) * 2.0
                started_profiles.add(profile)
            else:
                delay = 0.0
        if delay > 0:
            time.sleep(delay)

        env = {**os.environ, "GFLOW_CLI_PROFILE": profile}

        # 1. Generate I2I Keyframe
        if not (img_out.exists() and img_out.stat().st_size > 10000):
            for attempt in range(1, 5):
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
                img_id = find_image_id_by_prompt(sc["image_prompt"])
                if img_id:
                    subprocess.run(["gflow", "data", "download", img_id, "--out", str(img_dir), "--json"], capture_output=True, text=True, env=env)
                    for ext in (".jpg", ".png", ".jpeg"):
                        cand = img_dir / f"{img_id}{ext}"
                        if cand.exists() and cand.stat().st_size > 10000:
                            shutil.move(str(cand), str(img_out))
                            break
                    if img_out.exists() and img_out.stat().st_size > 10000:
                        log(f"✅ [{label} I2I · {profile}] Keyframe recovered via media_id={img_id} -> Immediately launching I2V!")
                        break
                log(f"⚠️ [{label} I2I · {profile}] Attempt {attempt} failed (exit {res.returncode}), retrying...")
                time.sleep(4)
            if not (img_out.exists() and img_out.stat().st_size > 10000):
                raise RuntimeError(f"Failed {label} I2I image")
        else:
            log(f"⏭️ [{label} I2I · {profile}] Keyframe exists -> Immediately launching I2V!")

        # 2. Immediately generate I2V Video
        if not (clip_out.exists() and clip_out.stat().st_size > 50000):
            for attempt in range(1, 4):
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
    """Sample-accurate per-scene VieNeu-TTS synthesis + Faster-Whisper word alignment + Go API / DB ingestion."""
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
    import numpy as np
    import soundfile as sf
    from app.tts import _synth_vieneu
    from app.captions import transcribe

    all_audio = []
    all_words = []
    all_segs = []
    scene_bounds = []
    cur_ms = 0
    sr = 24000
    atempo = camp.get("atempo", 1.38)

    with tts_lock:
        log(f"🎙️ [{slug} Audio] Synthesizing 5 scenes with VieNeu-TTS ({camp['voice']} @ {atempo}x)...")
        for sc in camp["scenes"]:
            idx = sc["index"]
            sc_raw = base_dir / f"sc_{idx}_raw.wav"
            sc_wav = base_dir / f"sc_{idx}.wav"
            _synth_vieneu(sc["text"], sc_raw, camp["voice"])
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", str(sc_raw),
                    "-filter:a", f"atempo={atempo},apad=pad_dur=0.12",
                    "-ar", "24000", str(sc_wav),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            data, _ = sf.read(sc_wav)
            dur_ms = int(round(len(data) / sr * 1000))
            w_list, _, _ = transcribe(sc_wav, sc["text"])
            for w in w_list:
                w["startMs"] += cur_ms
                w["endMs"] += cur_ms
                all_words.append(w)

            start_ms = cur_ms
            end_ms = cur_ms + dur_ms
            scene_bounds.append((start_ms, end_ms))
            all_segs.append({"index": idx - 1, "startMs": start_ms, "endMs": end_ms, "text": sc["text"]})
            all_audio.append(data)
            cur_ms = end_ms
            sc_raw.unlink(missing_ok=True)
            sc_wav.unlink(missing_ok=True)

        sf.write(out_wav, np.concatenate(all_audio), sr)

    words_json = json.dumps(all_words, ensure_ascii=False, indent=2)
    words_file.write_text(words_json, encoding="utf-8")
    (base_dir / "segments.json").write_text(json.dumps(all_segs, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"✅ [{slug} Audio] Sample-accurate voiceover ready: {cur_ms} ms ({len(all_words)} words)")

    full_script = " ".join(sc["text"] for sc in camp["scenes"])
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

    sql = f"""
    UPDATE projects
    SET audio_path = '{project_id}/voice.wav',
        duration_ms = {cur_ms},
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
        s_ms, e_ms = scene_bounds[i]
        scenes_payload["scenes"].append({
            "sceneIndex": sc["index"],
            "startMs": s_ms,
            "endMs": e_ms,
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

    log(f"✅ [{slug} Audio] Created Go API project_id={project_id} & saved 5 sample-accurate scenes!")
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

    slug = CAMPAIGN["slug"]
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    raw_dir = base_dir / "raw_images"
    (base_dir / "images").mkdir(parents=True, exist_ok=True)
    (base_dir / "clips").mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    symlink_path = STORAGE_DIR / slug
    if not symlink_path.exists():
        symlink_path.symlink_to(base_dir)

    for img_file in SOURCE_RAW_DIR.glob("*"):
        if img_file.is_file():
            shutil.copy2(img_file, raw_dir / img_file.name)

    log("🚀 Starting 5-Worker Parallel Pipeline for TPU Cutting Board V5 (all 5 scenes in parallel + Audio/DB thread)...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        audio_future = executor.submit(setup_audio_and_db_for_campaign, CAMPAIGN)
        scene_futures = [executor.submit(run_scene_task, slug, sc) for sc in CAMPAIGN["scenes"]]

        completed = 0
        for fut in concurrent.futures.as_completed(scene_futures):
            _, idx = fut.result()
            completed += 1
            log(f"🎉 [{slug}#S{idx}] Finished ({completed}/5 scenes complete)!")

        project_id = audio_future.result()
        render_res = render_campaign_mp4(slug, project_id)

    total_sec = time.time() - START_TIME
    log(f"🏆 TPU CUTTING BOARD V5 COMPLETE in {total_sec:.1f}s ({total_sec/60:.2f} minutes)!")
    log(f"👉 [{slug}] Studio: http://localhost:3000/product?id={project_id} | MP4: {render_res['videoUrl']}")


if __name__ == "__main__":
    main()
