#!/usr/bin/env python3
"""
Automated I2I + I2V generation script for Pinewoods Foldable Kids Step Stool - Version 2 TVC
("Mẹ ơi, con tự làm được rồi!" - Potty training, bookshelf toy reach, 1-hand carry & under-bed fold)
Strictly reuses the single Google Flow Project ID: f78365e9-de3f-4b85-9a11-40e3f305ae7a
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

FLOW_PROJECT_ID = "f78365e9-de3f-4b85-9a11-40e3f305ae7a"
BASE_DIR = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl/apps/web/public/product-step-stool-v2")
RAW_DIR = BASE_DIR / "raw_images"
IMG_DIR = BASE_DIR / "images"
CLIP_DIR = BASE_DIR / "clips"

SCENES = [
    {
        "index": 1,
        "refs": [str(RAW_DIR / "ref_1_angle_room.jpg")],
        "image_prompt": (
            "Cinematic commercial shot in a warm sunlit playroom with a wooden bookshelf, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: An old wobbly single plastic stool is pushed aside on the floor, while a toddler in a cute striped shirt stands proudly on the top step of this exact cream-white and coral-orange 2-step foldable kids step stool, reaching a colorful picture book and plush toy from the shelf. "
            "Ultra-detailed commercial photography."
        ),
        "video_prompt": (
            "Cinematic commercial shot, sunlit modern playroom, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Adult hands push away a wobbly ordinary plastic stool and place this exact sturdy cream-white and coral-orange 2-step foldable step stool in front of a wooden bookshelf. "
            "Seconds 2.5 to 5.0: A child (framed from chest down) climbs smoothly onto the top coral ribbed step and happily grabs a storybook and toy from the shelf without needing help. "
            "Seconds 5.0 to 6.0: Smooth camera push-in celebrating the child's independence."
        ),
    },
    {
        "index": 2,
        "refs": [str(RAW_DIR / "ref_3_foldable_bathroom.png"), str(RAW_DIR / "ref_2_dimensions_white.png")],
        "image_prompt": (
            "Cinematic commercial shot in a clean bright modern bathroom, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: This exact cream-white and coral-orange 2-step foldable step stool is positioned snugly in front of a clean white toilet; a toddler's small hands grip the smooth rounded side handles with coral inner trim while little feet in socks step confidently up the two 15cm coral ribbed steps. "
            "8k commercial photography."
        ),
        "video_prompt": (
            "Cinematic commercial shot, bright modern bathroom, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: Close-up of this exact cream-white and coral-orange 2-step foldable step stool placed securely right in front of the bathroom toilet. "
            "Seconds 2.5 to 5.0: A child (framed from waist down) holds the rounded safety side handles and steps up effortlessly from the first 15cm coral step to the second step. "
            "Seconds 5.0 to 6.0: Steady low-angle hold highlighting the rock-solid stability."
        ),
    },
    {
        "index": 3,
        "refs": [str(RAW_DIR / "ref_1_angle_room.jpg")],
        "image_prompt": (
            "Cinematic commercial shot in a bright sunlit hallway leading into a tiled bathroom, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: A toddler in overalls effortlessly carries this exact lightweight cream-white and coral-orange 2-step foldable step stool with one small hand gripping the ergonomic side handle cutout, setting it down firmly onto the glossy tile floor. "
            "Sharp focus on the wavy coral anti-slip step ribs and TPE rubber base pads."
        ),
        "video_prompt": (
            "Cinematic commercial tracking shot, bright modern home, softbox lighting, 9:16 vertical. Neck-down framing only, head and face out of frame. "
            "Seconds 0 to 2.5: A young child (framed from chest down) carries this lightweight cream-white and coral-orange 2-step stool effortlessly across the floor using the built-in handle slot. "
            "Seconds 2.5 to 5.0: The child sets the stool down on the bathroom tile floor and steps onto the wavy coral anti-slip surface as the TPE rubber base grips the floor with zero sliding. "
            "Seconds 5.0 to 6.0: Macro push-in on the anti-slip textured ribs and TPE base."
        ),
    },
    {
        "index": 4,
        "refs": [str(RAW_DIR / "ref_3_foldable_bathroom.png")],
        "image_prompt": (
            "Cinematic commercial shot in a minimalist sunlit kids bedroom beside a wooden bed frame and wardrobe, 9:16 vertical, softbox lighting. "
            "Neck-down framing only, no head or face visible: A mother's hands (framed from chest down in a soft cream sweater) fold this exact cream-white and coral-orange 2-step stool flat to 15cm thickness and slide it neatly into the narrow space underneath the wooden bed frame. "
            "Clean, organized modern home aesthetic."
        ),
        "video_prompt": (
            "Cinematic commercial shot, sunlit kids bedroom, softbox lighting, 9:16 vertical. A person in cream knitwear, neck-down framing, head and face out of frame. "
            "Seconds 0 to 2.5: Hands glide over the smooth burr-free virgin PP surface, then press the side latch to fold the cream-white and coral 2-step stool flat in seconds. "
            "Seconds 2.5 to 5.0: Hands slide the slim 15cm folded step stool smoothly underneath the wooden bed frame and beside the wardrobe. "
            "Seconds 5.0 to 6.0: Clean wide shot of the neat, clutter-free bedroom floor."
        ),
    },
    {
        "index": 5,
        "refs": [str(RAW_DIR / "ref_2_dimensions_white.png"), str(RAW_DIR / "ref_1_angle_room.jpg")],
        "image_prompt": (
            "Warm lifestyle commercial finale shot in a sunlit modern nursery, 9:16 vertical, golden morning light. "
            "Three pastel colorways of this exact foldable 2-step kids step stool—white with grey trim, white with pastel blue trim, and cream-white with coral-orange steps—arranged in a hero trio on a soft rug, with a toddler's hand (neck-down framing) giving a thumbs-up beside the stools, leaving clean lower-third space for shopping cart CTA."
        ),
        "video_prompt": (
            "Lifestyle commercial finale shot, sunlit modern nursery, golden morning light, 9:16 vertical. Neck-down framing only. "
            "Seconds 0 to 2.5: Smooth camera push-in toward the three pastel colorways of the foldable 2-step kids step stool—white-grey, white-blue, and cream-coral—arranged in a hero fan formation. "
            "Seconds 2.5 to 5.0: Camera orbits gently showcasing the 40x41x38cm proportions, smooth rounded handles, and anti-slip steps. "
            "Seconds 5.0 to 6.0: Steady hero hold with clean lower-third space for shopping cart CTA."
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
            print(f"🎨 [V2 Scene {idx} I2I · Attempt {attempt}] Generating keyframe...", flush=True)
            res = subprocess.run(cmd)
            if res.returncode == 0 and img_out.exists() and img_out.stat().st_size > 10000:
                print(f"✅ V2 Scene {idx} I2I saved: {img_out.name}", flush=True)
                break
            time.sleep(3)
        if not (img_out.exists() and img_out.stat().st_size > 10000):
            raise RuntimeError(f"Failed V2 Scene {idx} I2I image")

    # Step 2: Generate all 5 I2V videos
    for sc in SCENES:
        idx = sc["index"]
        img_out = IMG_DIR / f"ref_scene_0{idx}.jpg"
        clip_out = CLIP_DIR / f"scene_0{idx}.mp4"
        if clip_out.exists() and clip_out.stat().st_size > 50000:
            print(f"⏭️ V2 Scene {idx} video already exists: {clip_out.name} ({clip_out.stat().st_size} B)", flush=True)
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
            print(f"🎬 [V2 Scene {idx} · Attempt {attempt}] Generating video via I2V from {img_out.name}...", flush=True)
            res = subprocess.run(cmd)
            if res.returncode == 0 and clip_out.exists() and clip_out.stat().st_size > 50000:
                print(f"✅ V2 Scene {idx} video saved directly: {clip_out.name}", flush=True)
                break

            after_ids = get_project_video_ids()
            new_ids = [vid for vid in after_ids if vid not in seen_before]
            if new_ids:
                new_vid = new_ids[0]
                print(f"🔄 V2 Scene {idx} created new Flow media_id={new_vid} (exit {res.returncode}), downloading...", flush=True)
                time.sleep(4)
                if download_by_media_id(new_vid, clip_out):
                    break
            print(f"⚠️ V2 Scene {idx} attempt {attempt} did not produce downloadable video, retrying...", flush=True)
            time.sleep(4)

        if not (clip_out.exists() and clip_out.stat().st_size > 50000):
            raise RuntimeError(f"Failed to generate or download V2 Scene {idx} video")

    print("🎉 All 5 Version 2 I2I images and 5 AI video clips are ready!", flush=True)


if __name__ == "__main__":
    main()
