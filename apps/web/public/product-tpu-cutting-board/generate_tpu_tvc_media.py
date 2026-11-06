#!/usr/bin/env python3
"""
Automated I2V generation + fallback download script for TPU Cutting Board 25s TVC
Strictly uses a single Google Flow Project ID: 83ac9d5b-fb21-4657-8fa4-7c43c341ccae
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

FLOW_PROJECT_ID = "83ac9d5b-fb21-4657-8fa4-7c43c341ccae"
BASE_DIR = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl/apps/web/public/product-tpu-cutting-board")
IMG_DIR = BASE_DIR / "images"
CLIP_DIR = BASE_DIR / "clips"

SCENES = [
    {
        "index": 1,
        "video_prompt": (
            "Cinematic commercial shot, modern sunlit kitchen, 9:16 vertical. A person in neutral beige apron, neck down framing, head and face out of frame. "
            "Seconds 0 to 2.5: Hands push aside the old messy wooden cutting board with spilled vegetables. "
            "Seconds 2.5 to 5.0: Hands smoothly slide and showcase the pristine terracotta-red semi-circular TPU cutting board centered on the counter. "
            "Seconds 5.0 to 6.0: Smooth camera push-in highlighting the clean ribbed TPU surface."
        ),
    },
    {
        "index": 2,
        "video_prompt": (
            "Macro commercial close-up, modern sunlit kitchen, 9:16 vertical. A person in neutral clothing, neck down framing, head and face out of frame. "
            "Seconds 0 to 2.5: Hands steady a fresh green cucumber on the terracotta-red ribbed TPU cutting board. "
            "Seconds 2.5 to 5.0: The white-handled kitchen knife slices crisp cucumber rounds smoothly with zero slipping on the vertical anti-slip ribs while juice stays inside the raised border. "
            "Seconds 5.0 to 6.0: Clean macro hold on the scratch-resistant surface."
        ),
    },
    {
        "index": 3,
        "video_prompt": (
            "Eye-level commercial shot, modern sunlit kitchen, 9:16 vertical. A person in neutral knit sleeves, neck down framing, head and face out of frame. "
            "Seconds 0 to 2.5: Two hands hold the flexible terracotta-red semi-circular TPU cutting board curved into a U-shaped funnel above a steaming stainless steel pot. "
            "Seconds 2.5 to 5.0: Freshly chopped carrots, tomatoes, and greens slide smoothly down the curved TPU board straight into the simmering pot without spilling outside. "
            "Seconds 5.0 to 6.0: Hands relax the board, showing its flexible bounce-back."
        ),
    },
    {
        "index": 4,
        "video_prompt": (
            "Close-up commercial shot, modern stainless steel kitchen sink, 9:16 vertical. A person in neutral clothing, neck down framing, head and face out of frame. "
            "Seconds 0 to 2.5: Hands hold the terracotta-red semi-circular ribbed TPU cutting board under running faucet water, rinsing it effortlessly clean. "
            "Seconds 2.5 to 5.0: Water droplets roll cleanly off the stain-resistant surface as hands lift the board showing the D-shaped hanging tab at the corner. "
            "Seconds 5.0 to 6.0: Steady close-up of the spotless hygienic TPU surface."
        ),
    },
    {
        "index": 5,
        "video_prompt": (
            "Lifestyle commercial outro shot, sunlit marble kitchen counter, 9:16 vertical. "
            "Seconds 0 to 2.5: Slow smooth camera push-in toward the four colorful semi-circular ribbed TPU cutting boards—terracotta red, cream white, lime green, and bright orange—fanned out beside a fresh salad bowl. "
            "Seconds 2.5 to 5.0: Camera glides gently highlighting the vibrant colors, D-shaped hanging loops, and fine anti-slip ribs under warm morning light. "
            "Seconds 5.0 to 6.0: Steady hero hold leaving clean space at the lower third for shopping cart CTA."
        ),
    },
]


def get_project_video_ids() -> list[str]:
    res = subprocess.run(["gflow", "data", "list", "videos"], capture_output=True, text=True)
    ids = []
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
            if row.get("project_id") == FLOW_PROJECT_ID and row.get("media_id"):
                ids.append(row["media_id"])
        except Exception:
            pass
    return ids


def download_by_media_id(media_id: str, target_mp4: Path) -> bool:
    for attempt in range(1, 4):
        print(f"📥 [Attempt {attempt}/3] gflow data download {media_id} -> {target_mp4.name}...", flush=True)
        res = subprocess.run(
            ["gflow", "data", "download", media_id, "--out", str(CLIP_DIR), "--json"],
            capture_output=True,
            text=True,
        )
        candidate = CLIP_DIR / f"{media_id}.mp4"
        if candidate.exists() and candidate.stat().st_size > 50000:
            shutil.move(str(candidate), str(target_mp4))
            print(f"✅ Downloaded and saved {target_mp4} ({target_mp4.stat().st_size} bytes)", flush=True)
            return True
        print(f"⚠️ Download attempt {attempt} output: {res.stdout} {res.stderr}", flush=True)
        time.sleep(5)
    return False


def main():
    CLIP_DIR.mkdir(parents=True, exist_ok=True)

    for sc in SCENES:
        idx = sc["index"]
        img_out = IMG_DIR / f"ref_scene_0{idx}.jpg"
        clip_out = CLIP_DIR / f"scene_0{idx}.mp4"
        if clip_out.exists() and clip_out.stat().st_size > 50000:
            print(f"⏭️ Scene {idx} video already exists: {clip_out.name} ({clip_out.stat().st_size} B)", flush=True)
            continue

        for attempt in range(1, 3):
            seen_before = set(get_project_video_ids())
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
            print(f"🎬 [Scene {idx} · Attempt {attempt}] Generating video via I2V from {img_out.name}...", flush=True)
            res = subprocess.run(cmd)
            if res.returncode == 0 and clip_out.exists() and clip_out.stat().st_size > 50000:
                print(f"✅ Scene {idx} video saved directly: {clip_out.name}", flush=True)
                break

            after_ids = get_project_video_ids()
            new_ids = [vid for vid in after_ids if vid not in seen_before]
            if new_ids:
                new_vid = new_ids[0]
                print(f"🔄 Scene {idx} created new Flow media_id={new_vid} (exit {res.returncode}), downloading...", flush=True)
                time.sleep(4)
                if download_by_media_id(new_vid, clip_out):
                    break
            print(f"⚠️ Scene {idx} attempt {attempt} did not produce downloadable video, retrying...", flush=True)
            time.sleep(4)

        if not (clip_out.exists() and clip_out.stat().st_size > 50000):
            raise RuntimeError(f"Failed to generate or download Scene {idx} video")

    print("🎉 All 5 AI video clips are ready!", flush=True)


if __name__ == "__main__":
    main()
