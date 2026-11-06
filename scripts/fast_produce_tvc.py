#!/usr/bin/env python3
"""
Multi-Threaded Pipelined AI Product TVC Producer (Version 3 - Pinewoods Foldable Step Stool)
- Uses isolated GFlow worker profiles (worker_1..4 + quangtu99772005) so all 5 scenes run 100% in parallel without ProfileLockedError (exit 11)
- Runs Audio + Whisper + Go API / DB Ingestion in parallel with GFlow Media Workers
- Runs per-scene pipelined concurrency (Scene i: I2I -> immediately I2V without waiting for other scenes)
- Thread-safe media_id lookup by matching exact video_prompt tag in `gflow data list videos`
- Automatically triggers Remotion 1080p MP4 render upon completion
"""
import concurrent.futures
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

FLOW_PROJECT_ID = "f78365e9-de3f-4b85-9a11-40e3f305ae7a"
RAC_VL_ROOT = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl")
AI_WORKER_DIR = RAC_VL_ROOT / "apps" / "ai-worker"
STORAGE_DIR = RAC_VL_ROOT / "storage"
BASE_DIR = RAC_VL_ROOT / "apps" / "web" / "public" / "product-step-stool-v3"
SOURCE_RAW_DIR = RAC_VL_ROOT / "apps" / "web" / "public" / "product-step-stool" / "raw_images"
RAW_DIR = BASE_DIR / "raw_images"
IMG_DIR = BASE_DIR / "images"
CLIP_DIR = BASE_DIR / "clips"

# Dedicated profile per scene index so 5 headless browser workers never contend on ProfileLease (exit 11)
SCENE_PROFILES = {
    1: "worker_1",
    2: "quangtu99772005",
    3: "worker_2",
    4: "worker_3",
    5: "worker_4",
}

MAX_SCENE_WORKERS = 5
print_lock = threading.Lock()
START_TIME = time.time()


def log(msg: str) -> None:
    elapsed = time.time() - START_TIME
    with print_lock:
        print(f"[{elapsed:6.1f}s] {msg}", flush=True)


TITLE = "🏠 TVC Ghế Bậc Thang Gấp Gọn Cho Bé - Tự Do Khám Phá Mọi Góc Nhà (29s)"
VOICE_ID = "Ngọc Linh"  # Giữ nguyên giọng đọc năng động

SCENES = [
    {
        "index": 1,
        "text": "Con muốn tự lấy cốc uống nước hay phụ mẹ nhặt rau nhưng bàn bếp quá cao? Có ngay ghế bậc thang gấp gọn Pinewoods đồng hành cùng con ở mọi góc nhà!",
        "setting": "[1. HOOK PHÒNG BẾP] • Bàn bếp cao tầm với -> Bé đứng ghế 2 bậc Pinewoods tự rót nước & phụ mẹ",
        "calloutTag": "BÀN BẾP QUÁ CAO?",
        "calloutText": "Bé Tự Lấy Nước · Phụ Mẹ",
        "cameraEffect": "zoom_in",
        "transition": "fade",
        "refs": ["ref_1_angle_room.jpg"],
        "image_prompt": (
            "Cinematic commercial shot in a warm sunlit modern kitchen, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: A young child in a cute apron stands securely on the top coral-orange ribbed step of this exact cream-white 2-step foldable kids step stool beside a kitchen island counter, happily pouring water into a kids cup and washing fresh strawberries next to mother's hands. "
            "Ultra-detailed commercial photography."
        ),
        "video_prompt": (
            "V3_SCENE_1: Cinematic commercial shot, sunlit modern kitchen counter, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Camera pans down from a kitchen counter to this exact cream-white and coral-orange 2-step foldable step stool placed firmly beside the island. "
            "Seconds 2.5 to 5.0: A child in a cute apron (framed from chest down) stands securely on the top coral ribbed step, happily washing strawberries and reaching a water cup alongside mother's hands. "
            "Seconds 5.0 to 6.0: Smooth push-in highlighting the stable 2-step kitchen helper."
        ),
    },
    {
        "index": 2,
        "text": "Khung chữ A chịu lực cực khỏe cùng hai bậc cao chuẩn mười lăm xăng-ti-mét và tay cầm bo tròn, bé đứng vững vàng không lo chao đảo.",
        "setting": "[2. KHUNG CHỮ A CHỊU LỰC] • Kết cấu chữ A vững chãi + 2 bậc 15cm & Tay vịn bo tròn chống lật",
        "calloutTag": "KHUNG CHỮ A VỮNG CHÃI",
        "calloutText": "2 Bậc 15cm · Chống Lật Đổ",
        "cameraEffect": "static",
        "transition": "slide",
        "refs": ["ref_2_dimensions_white.png", "ref_1_angle_room.jpg"],
        "image_prompt": (
            "Cinematic commercial side-angle hero shot in a sunlit modern living room, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: Clear side profile showcasing the sturdy A-frame triangle structure, side locking latch, and two 15cm coral-orange ribbed steps of this exact cream-white 2-step foldable step stool as a child's feet in sneakers step firmly onto the top platform. "
            "8k commercial product photography."
        ),
        "video_prompt": (
            "V3_SCENE_2: Cinematic commercial hero shot, sunlit modern living room, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Side-profile close-up highlighting the rock-solid A-frame structure, coral side locking latch, and two 15cm steps of this cream-white foldable step stool. "
            "Seconds 2.5 to 5.0: A child (framed from waist down) grips the rounded handles and climbs onto the top step while the A-frame base remains 100 percent rock-solid with zero wobble. "
            "Seconds 5.0 to 6.0: Steady hero hold on the sturdy A-frame geometry."
        ),
    },
    {
        "index": 3,
        "text": "Bề mặt dập vân nổi ma sát cao kết hợp chân đế cao su TPE bám chặt cả sàn gạch ướt lẫn sàn gỗ, bảo vệ an toàn tuyệt đối cho từng bước chân con.",
        "setting": "[3. VÂN NỔI & ĐẾ TPE BÁM SÀN] • Cận cảnh vân nổi chống trơn & Đế cao su TPE bám chặt sàn gạch ướt",
        "calloutTag": "MA SÁT KÉP AN TOÀN",
        "calloutText": "Vân Nổi + Đế TPE Chống Trượt",
        "cameraEffect": "zoom_in",
        "transition": "fade",
        "refs": ["ref_1_angle_room.jpg"],
        "image_prompt": (
            "Macro commercial close-up in a bright modern bathroom with wet glossy floor tiles, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: Sharp close-up of the raised wavy coral-orange anti-slip step texture and the TPE rubber anti-slip foot pads at the bottom of this exact cream-white 2-step foldable step stool gripping a wet bathroom floor with water droplets around it."
        ),
        "video_prompt": (
            "V3_SCENE_3: Macro commercial close-up, bright modern bathroom floor, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Extreme close-up of the TPE rubber anti-slip base pads gripping the wet tile floor firmly and the raised wavy coral-orange anti-slip step ribs. "
            "Seconds 2.5 to 5.0: A child's bare feet step securely onto the coral ribbed surface in the bathroom with zero slipping or sliding. "
            "Seconds 5.0 to 6.0: Smooth macro hold on the anti-slip textured surface."
        ),
    },
    {
        "index": 4,
        "text": "Trọng lượng siêu nhẹ bé tự xách về phòng ngủ leo lên giường, dùng xong gập gọn trong ba giây cất vừa vặn vào khe hẹp chỉ mười lăm xăng-ti-mét.",
        "setting": "[4. TỰ XÁCH LEO GIƯỜNG & GẬP GỌN] • Bé tự xách ghế leo lên giường ngủ & Gập gọn 15cm cất cạnh tủ",
        "calloutTag": "BÉ TỰ XÁCH · GẬP 3S",
        "calloutText": "Mỏng 15cm · Tiết Kiệm Diện Tích",
        "cameraEffect": "static",
        "transition": "slide",
        "refs": ["ref_3_foldable_bathroom.png", "ref_1_angle_room.jpg"],
        "image_prompt": (
            "Cinematic commercial shot in a cozy sunlit bedroom, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: This exact cream-white and coral-orange 2-step foldable step stool is placed beside a cozy bed so a toddler can climb up easily, then folded flat to 15cm and tucked neatly into the narrow gap between the bedside table and wall."
        ),
        "video_prompt": (
            "V3_SCENE_4: Cinematic commercial shot, cozy sunlit bedroom, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: A child (framed from waist down) steps up the cream-white and coral 2-step stool to climb onto a cozy bed. "
            "Seconds 2.5 to 5.0: Mother's hands quickly fold the lightweight step stool flat to 15cm in three seconds and slide it neatly into the narrow gap beside the nightstand. "
            "Seconds 5.0 to 6.0: Clean hold showing the tidy space-saving storage."
        ),
    },
    {
        "index": 5,
        "text": "Nhựa PP nguyên sinh không mùi không BPA cùng màu pastel sang xịn cho bé từ hai đến bảy tuổi, bấm giỏ hàng săn ngay giá hời hôm nay nhé!",
        "setting": "[5. NHỰA PP NGUYÊN SINH & CTA] • Chất liệu PP không BPA an toàn + 3 màu Pastel & Chốt đơn",
        "calloutTag": "NHỰA PP KHÔNG BPA",
        "calloutText": "An Toàn Cho Bé · Săn Giá Hời!",
        "cameraEffect": "zoom_in",
        "transition": "fade",
        "refs": ["ref_2_dimensions_white.png", "ref_1_angle_room.jpg"],
        "image_prompt": (
            "Bright commercial outro showcase in a sunlit modern family living room, 9:16 vertical, warm daylight. "
            "This exact foldable 2-step kids step stool displayed in three pastel colorways—cream-white with coral-orange steps, white with pastel blue, and white with soft grey—on a clean wooden floor with soft sunlit plants in the background and clean lower-third space for a shopping cart CTA."
        ),
        "video_prompt": (
            "V3_SCENE_5: Lifestyle commercial outro shot, sunlit modern living room, warm daylight, 9:16 vertical. "
            "Seconds 0 to 2.5: Smooth camera push-in toward the three pastel colorways of the Pinewoods foldable 2-step kids step stool—cream-coral, white-blue, and white-grey—on a warm wooden floor. "
            "Seconds 2.5 to 5.0: Camera glides gently highlighting the smooth BPA-free virgin PP finish, rounded handles, and anti-slip steps. "
            "Seconds 5.0 to 6.0: Steady hero hold leaving clean lower-third space for shopping cart CTA."
        ),
    },
]


def ensure_worker_profiles() -> None:
    """Ensure worker_1..worker_4 profile directories exist so 5 threads can run concurrently."""
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
    """Thread-safe lookup of media_id in `gflow data list videos` using unique prompt prefix."""
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


def download_by_media_id(scene_idx: int, profile: str, media_id: str, target_mp4: Path) -> bool:
    env = {**os.environ, "GFLOW_CLI_PROFILE": profile}
    for attempt in range(1, 4):
        log(f"📥 [Scene {scene_idx} · {profile} · Attempt {attempt}/3] Downloading media_id={media_id}...")
        res = subprocess.run(
            ["gflow", "data", "download", media_id, "--out", str(CLIP_DIR), "--json"],
            capture_output=True,
            text=True,
            env=env,
        )
        candidate = CLIP_DIR / f"{media_id}.mp4"
        if candidate.exists() and candidate.stat().st_size > 50000:
            shutil.move(str(candidate), str(target_mp4))
            log(f"✅ [Scene {scene_idx} · {profile}] Video ready: {target_mp4.name} ({target_mp4.stat().st_size} B)")
            return True
        time.sleep(3)
    return False


def run_scene_pipeline(sc: dict) -> int:
    """Per-scene worker: runs I2I -> immediately I2V on its own isolated GFlow profile."""
    idx = sc["index"]
    profile = SCENE_PROFILES[idx]
    env = {**os.environ, "GFLOW_CLI_PROFILE": profile}
    img_out = IMG_DIR / f"ref_scene_0{idx}.jpg"
    clip_out = CLIP_DIR / f"scene_0{idx}.mp4"
    prompt_tag = f"V3_SCENE_{idx}:"

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
                cmd.extend(["--ref", str(RAW_DIR / r)])
            cmd.append(sc["image_prompt"])
            log(f"🎨 [Scene {idx} I2I · {profile} · Attempt {attempt}] Starting keyframe generation...")
            res = subprocess.run(cmd, capture_output=True, text=True, env=env)
            if res.returncode == 0 and img_out.exists() and img_out.stat().st_size > 10000:
                log(f"✅ [Scene {idx} I2I · {profile}] Keyframe saved ({img_out.stat().st_size} B) -> Immediately launching I2V!")
                break
            log(f"⚠️ [Scene {idx} I2I · {profile}] Attempt {attempt} failed (exit {res.returncode}), retrying...")
            time.sleep(3)
        if not (img_out.exists() and img_out.stat().st_size > 10000):
            raise RuntimeError(f"Failed Scene {idx} I2I image")
    else:
        log(f"⏭️ [Scene {idx} I2I · {profile}] Keyframe already exists -> Immediately launching I2V!")

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
            log(f"🎬 [Scene {idx} I2V · {profile} · Attempt {attempt}] Generating 6s AI video clip...")
            res = subprocess.run(cmd, capture_output=True, text=True, env=env)
            if res.returncode == 0 and clip_out.exists() and clip_out.stat().st_size > 50000:
                log(f"✅ [Scene {idx} I2V · {profile}] Video saved directly: {clip_out.name}")
                break

            # Thread-safe fallback: find media_id by unique V3_SCENE_{idx}: tag in prompt
            time.sleep(2)
            vid_id = find_media_id_by_prompt(prompt_tag)
            if vid_id:
                log(f"🔄 [Scene {idx} I2V · {profile}] Matched media_id={vid_id} by prompt tag '{prompt_tag}', downloading...")
                if download_by_media_id(idx, profile, vid_id, clip_out):
                    break
            log(f"⚠️ [Scene {idx} I2V · {profile}] Attempt {attempt} did not produce downloadable video, retrying...")
            time.sleep(3)

        if not (clip_out.exists() and clip_out.stat().st_size > 50000):
            raise RuntimeError(f"Failed Scene {idx} I2V video")
    else:
        log(f"⏭️ [Scene {idx} I2V · {profile}] Video already exists: {clip_out.name}")

    return idx


def run_audio_and_db_pipeline() -> str:
    """Runs VieNeu-TTS + Faster-Whisper + Go REST API project creation + DB update in parallel with GFlow."""
    proj_id_file = BASE_DIR / "project_id.txt"
    out_wav = BASE_DIR / "voice.wav"
    words_file = BASE_DIR / "words.json"
    if proj_id_file.exists() and out_wav.exists() and words_file.exists():
        existing_id = proj_id_file.read_text(encoding="utf-8").strip()
        if existing_id:
            log(f"⏭️ [Audio Thread] Reusing already synthesized voiceover & Go API project_id={existing_id}")
            return existing_id

    sys.path.insert(0, str(AI_WORKER_DIR))
    from app.tts import _synth_vieneu
    from app.captions import transcribe

    raw_wav = BASE_DIR / "voice_raw.wav"
    full_script = " ".join(sc["text"] for sc in SCENES)

    log(f"🎙️ [Audio Thread] Synthesizing script with VieNeu-TTS ({VOICE_ID})...")
    _synth_vieneu(full_script, raw_wav, VOICE_ID)

    log("🎙️ [Audio Thread] Applying 1.38x commercial speed via ffmpeg atempo...")
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(raw_wav), "-filter:a", "atempo=1.38", str(out_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    log("🎙️ [Audio Thread] Transcribing word-level timestamps with Faster-Whisper...")
    words, segments, dur_ms = transcribe(out_wav, full_script)
    words_file.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    seg_dicts = [{"index": i, "startMs": s.start_ms, "endMs": s.end_ms, "text": s.text} for i, s in enumerate(segments)]
    (BASE_DIR / "segments.json").write_text(json.dumps(seg_dicts, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"✅ [Audio Thread] Voiceover ready: {dur_ms} ms ({len(words)} words, {len(seg_dicts)} Whisper segments)")

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
            "title": TITLE,
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
    for i, sc in enumerate(SCENES):
        start_ms, end_ms = bounds[i]
        scenes_payload["scenes"].append({
            "sceneIndex": sc["index"],
            "startMs": start_ms,
            "endMs": end_ms,
            "transcriptText": sc["text"],
            "setting": sc["setting"],
            "characters": [],
            "imagePrompt": "",
            "imageUrl": f"http://localhost:9090/media/product-step-stool-v3/clips/scene_0{sc['index']}.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=6.04",
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

    log(f"✅ [Audio Thread] Created Go API project_id={project_id} & saved 5 scenes with Whisper timings!")
    return project_id


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    CLIP_DIR.mkdir(parents=True, exist_ok=True)

    symlink_path = STORAGE_DIR / "product-step-stool-v3"
    if not symlink_path.exists():
        symlink_path.symlink_to(BASE_DIR)

    for f in SOURCE_RAW_DIR.iterdir():
        if f.is_file():
            shutil.copy2(f, RAW_DIR / f.name)

    ensure_worker_profiles()

    log(f"🚀 Starting 5-Worker Parallel Pipelined TVC Production (5 isolated GFlow profiles + 1 Audio/DB thread)...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_SCENE_WORKERS + 1) as executor:
        audio_future = executor.submit(run_audio_and_db_pipeline)
        scene_futures = {executor.submit(run_scene_pipeline, sc): sc["index"] for sc in SCENES}

        for fut in concurrent.futures.as_completed(scene_futures):
            sc_idx = scene_futures[fut]
            fut.result()
            log(f"🎉 [Scene {sc_idx}] Full I2I -> I2V pipeline finished!")

        project_id = audio_future.result()

    proj_storage = STORAGE_DIR / project_id
    proj_storage.mkdir(parents=True, exist_ok=True)
    for clip in CLIP_DIR.glob("scene_*.mp4"):
        shutil.copy2(clip, proj_storage / clip.name)

    log("🎬 All threads finished! Triggering Remotion 1080p MP4 render via AI Worker (:8000)...")
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
        render_res = json.loads(r.read().decode("utf-8"))

    total_sec = time.time() - START_TIME
    log(f"🏆 COMPLETE! Total parallel pipelined run time: {total_sec:.1f}s ({total_sec/60:.2f} minutes)")
    log(f"👉 Studio URL: http://localhost:3000/product?id={project_id}")
    log(f"👉 MP4 URL:    {render_res['videoUrl']}")
    log(f"👉 Local File: {render_res['filePath']}")


if __name__ == "__main__":
    main()
