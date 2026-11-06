#!/usr/bin/env python3
"""
Automated I2I + I2V generation script for Pinewoods Foldable Kids Step Stool 25s TVC
Strictly uses a single Google Flow Project ID: f78365e9-de3f-4b85-9a11-40e3f305ae7a
Follows Headless Human Framing (neck-down / chest-down) and Second-by-Second prompting.
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

FLOW_PROJECT_ID = "f78365e9-de3f-4b85-9a11-40e3f305ae7a"
BASE_DIR = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl/apps/web/public/product-step-stool")
RAW_DIR = BASE_DIR / "raw_images"
IMG_DIR = BASE_DIR / "images"
CLIP_DIR = BASE_DIR / "clips"

SCENES = [
    {
        "index": 1,
        "refs": [str(RAW_DIR / "ref_1_angle_room.jpg")],
        "image_prompt": (
            "Cinematic commercial shot in a sunlit modern bathroom, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: A toddler in pastel yellow pajamas stands effortlessly on the top step of this exact cream-white and coral-orange 2-step foldable kids step stool in front of a warm wooden bathroom vanity sink, washing little hands under running water with soap bubbles while a mother's hands rest calmly nearby. "
            "Clean product-focused commercial photography, ultra-detailed."
        ),
        "video_prompt": (
            "Cinematic commercial shot, sunlit modern bathroom, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Camera pans from a high bathroom sink down to this exact cream-white and coral-orange 2-step foldable step stool positioned firmly in front of the vanity. "
            "Seconds 2.5 to 5.0: A toddler in pastel pajamas (framed from chest down) stands securely on the top coral ribbed step, happily washing little hands under gentle faucet water without needing to be lifted. "
            "Seconds 5.0 to 6.0: Smooth push-in highlighting the sturdy 2-step stool and independent handwashing."
        ),
    },
    {
        "index": 2,
        "refs": [str(RAW_DIR / "ref_2_dimensions_white.png"), str(RAW_DIR / "ref_1_angle_room.jpg")],
        "image_prompt": (
            "Cinematic commercial hero shot in a warm sunlit kids bedroom, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: A toddler's small feet in cute socks stepping up smoothly onto the first 15cm coral-orange ribbed step of this exact cream-white 2-step foldable step stool while little hands grip the smooth rounded side handles with coral inner trim. "
            "Showcasing the ergonomic 2-step height and rounded safety armrests, 8k commercial photography."
        ),
        "video_prompt": (
            "Cinematic commercial hero shot, warm sunlit bedroom, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Low-angle close-up of this exact cream-white and coral-orange 2-step foldable step stool showing its two 15cm steps and rounded side handles. "
            "Seconds 2.5 to 5.0: A child (framed from waist down) grips the smooth rounded side handles and steps up confidently from the first coral ribbed step to the second step to reach a bookshelf. "
            "Seconds 5.0 to 6.0: Steady hero hold on the rock-solid A-frame structure."
        ),
    },
    {
        "index": 3,
        "refs": [str(RAW_DIR / "ref_1_angle_room.jpg")],
        "image_prompt": (
            "Macro commercial close-up in a bright modern hallway and bathroom floor, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: Close-up of a toddler's bare feet standing firmly on the raised wavy anti-slip coral-orange textured surface of this exact cream-white 2-step foldable step stool, with TPE anti-slip rubber pads gripping the wet tile floor securely. "
            "Crystal clear texture detail of the virgin PP and TPE material."
        ),
        "video_prompt": (
            "Cinematic commercial close-up, bright modern interior, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Macro close-up of the wavy coral-orange anti-slip textured step surface and non-slip TPE base pads gripping the tile floor without budging a millimeter. "
            "Seconds 2.5 to 5.0: A toddler (framed from neck down) easily lifts and carries this lightweight cream-white and coral step stool by its side handle slots across the room. "
            "Seconds 5.0 to 6.0: The child sets the stool down gently and securely in front of the bed."
        ),
    },
    {
        "index": 4,
        "refs": [str(RAW_DIR / "ref_3_foldable_bathroom.png")],
        "image_prompt": (
            "Cinematic commercial demonstration shot in a clean modern bathroom beside a wooden vanity cabinet and white toilet, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: A mother's hands (in a beige cardigan, framed from chest down) effortlessly folding this exact cream-white and coral-orange 2-step stool flat to 15cm thickness and sliding it neatly underneath the floating bathroom sink cabinet. "
            "Space-saving minimalist home aesthetic."
        ),
        "video_prompt": (
            "Cinematic commercial shot, modern bathroom vanity, softbox lighting, 9:16 vertical. A person in beige knitwear, neck-down framing, head and face out of frame. "
            "Seconds 0 to 2.5: Hands press the side folding latch and smoothly fold the rear legs of the cream-white and coral-orange 2-step stool flat in two seconds. "
            "Seconds 2.5 to 5.0: Hands slide the slim folded step stool neatly into the narrow gap underneath the floating wooden bathroom vanity cabinet. "
            "Seconds 5.0 to 6.0: Clean wide hold showing the tidy, spacious bathroom floor."
        ),
    },
    {
        "index": 5,
        "refs": [str(RAW_DIR / "ref_1_angle_room.jpg"), str(RAW_DIR / "ref_2_dimensions_white.png")],
        "image_prompt": (
            "Lifestyle commercial outro shot in a bright sunlit modern playroom, 9:16 vertical, warm morning light. "
            "This exact foldable 2-step kids step stool showcased in three pastel colorways—cream-white with coral-orange steps, white with pastel blue trim, and white with soft grey trim—arranged neatly on a warm floor with clean space at the lower third for a shopping cart CTA."
        ),
        "video_prompt": (
            "Lifestyle commercial outro shot, sunlit modern playroom, warm morning light, 9:16 vertical. "
            "Seconds 0 to 2.5: Smooth camera push-in toward the foldable 2-step kids step stools in pastel colors—cream-white with coral-orange, pastel blue, and soft grey—displayed in a cozy modern room. "
            "Seconds 2.5 to 5.0: Camera glides gently highlighting the smooth virgin PP finish, rounded handles, and anti-slip ribbed steps. "
            "Seconds 5.0 to 6.0: Steady hero hold leaving clean lower-third space for shopping cart CTA."
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
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    CLIP_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Generate all 5 I2I images
    for sc in SCENES:
        idx = sc["index"]
        img_out = IMG_DIR / f"ref_scene_0{idx}.jpg"
        if img_out.exists() and img_out.stat().st_size > 10000:
            print(f"⏭️ Scene {idx} image already exists: {img_out.name}", flush=True)
            continue
        for attempt in range(1, 3):
            cmd = [
                "gflow", "image", "i2i",
                "--project", FLOW_PROJECT_ID,
                "--aspect", "9:16",
                "-o", str(img_out),
            ]
            for r in sc["refs"]:
                cmd.extend(["--ref", r])
            cmd.append(sc["image_prompt"])
            print(f"🎨 [Scene {idx} I2I · Attempt {attempt}] Generating keyframe...", flush=True)
            res = subprocess.run(cmd)
            if res.returncode == 0 and img_out.exists() and img_out.stat().st_size > 10000:
                print(f"✅ Scene {idx} I2I saved: {img_out.name}", flush=True)
                break
            time.sleep(3)
        if not (img_out.exists() and img_out.stat().st_size > 10000):
            raise RuntimeError(f"Failed Scene {idx} I2I image")

    # Step 2: Generate all 5 I2V videos
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

    print("🎉 All 5 I2I images and 5 AI video clips are ready!", flush=True)


if __name__ == "__main__":
    main()
