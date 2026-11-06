#!/usr/bin/env python3
"""
Automated I2I + I2V generation script for TPU Cutting Board 25s Action-Comedy VFX TVC
Inspired by the viral Number 1 Facebook Reel (over-the-top comedy action, golden lightning VFX, mid-air stunts, 3D yellow/blue comic titles)
Strictly uses Flow Project ID: 83ac9d5b-fb21-4657-8fa4-7c43c341ccae
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

FLOW_PROJECT_ID = "83ac9d5b-fb21-4657-8fa4-7c43c341ccae"
RAW_DIR = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl/apps/web/public/product-tpu-cutting-board/raw_images")
BASE_DIR = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl/apps/web/public/product-tpu-action")
IMG_DIR = BASE_DIR / "images"
CLIP_DIR = BASE_DIR / "clips"

SCENES = [
    {
        "index": 1,
        "refs": [str(RAW_DIR / "ref_3_ribbed_knife.jpg")],
        "image_prompt": (
            "Over-the-top viral action-comedy TVC shot in a bright sunlit kitchen: On a marble countertop, an old moldy wooden cutting board cracks in half with dramatic golden electric sparks and smoke bursting out while diced carrots and cucumbers fly into the air! "
            "Right beside the chaos, a chef's hands (framed from chest down in a red polo and apron) heroically slam down this exact sleek terracotta-red semi-circular ribbed TPU cutting board with its D-shaped hanging loop. "
            "Bold 3D yellow comic text with blue outline reading 'HƯ THỚT!' floating beside the broken wooden board, ultra-dynamic 9:16 vertical commercial."
        ),
        "video_prompt": (
            "High-energy action-comedy TVC shot, 9:16 vertical. Seconds 0 to 2.5: The old wooden cutting board cracks with dramatic golden sparks and flying vegetables as hands sweep the broken board off the counter. "
            "Seconds 2.5 to 5.0: Hands heroically slam down the pristine terracotta-red semi-circular ribbed TPU cutting board onto the marble counter with a golden shockwave. "
            "Seconds 5.0 to 6.0: Fast dramatic camera zoom-in onto the indestructible TPU cutting board."
        ),
    },
    {
        "index": 2,
        "refs": [str(RAW_DIR / "ref_3_ribbed_knife.jpg"), str(RAW_DIR / "ref_2_smooth_side.png")],
        "image_prompt": (
            "Epic blockbuster VFX product power-up shot against a dark golden cosmic background with floating ice cubes and golden light particles: "
            "This exact terracotta-red semi-circular ribbed TPU cutting board with its D-shaped hanging loop levitates in the center, wrapped in swirling golden lightning energy ribbons. "
            "Four glowing golden energy orbs float around the board displaying high-tech icons, hyper-detailed 8k commercial VFX, 9:16 vertical."
        ),
        "video_prompt": (
            "Epic blockbuster VFX product commercial shot, 9:16 vertical. Seconds 0 to 2.5: The terracotta-red semi-circular ribbed TPU cutting board levitates and rotates 360 degrees in mid-air as golden lightning arcs crackle around its anti-slip ribs and smooth juice-rim back side. "
            "Seconds 2.5 to 5.0: Four glowing golden energy orbs pulse brightly around the board, showcasing its indestructible flexible TPU power. "
            "Seconds 5.0 to 6.0: Brilliant golden energy flash locking on the hero product."
        ),
    },
    {
        "index": 3,
        "refs": [str(RAW_DIR / "ref_3_ribbed_knife.jpg")],
        "image_prompt": (
            "High-octane kung-fu kitchen action close-up shot: A chef's hands (framed from chest down) slicing fresh green cucumbers and red tomatoes at superhuman speed with a white-handled knife on this exact terracotta-red semi-circular ribbed TPU cutting board. "
            "Blazing golden lightning speed trails streak from the knife blade while vegetable slices fly and land in neat rows, the ribbed TPU board gripping the marble counter rock-solid with zero scratches, 9:16 vertical commercial."
        ),
        "video_prompt": (
            "High-speed action commercial close-up, 9:16 vertical. Seconds 0 to 2.5: Hands chop cucumbers and tomatoes at superhuman lightning speed on the terracotta-red ribbed TPU cutting board with glowing golden speed trails following the knife blade. "
            "Seconds 2.5 to 5.0: Vegetable slices line up neatly while juice is trapped inside the raised perimeter border and the board stays completely still without slipping. "
            "Seconds 5.0 to 6.0: Dramatic close-up showing zero knife marks on the pristine ribbed TPU surface."
        ),
    },
    {
        "index": 4,
        "refs": [str(RAW_DIR / "ref_3_ribbed_knife.jpg")],
        "image_prompt": (
            "Over-the-top viral action-comedy stunt shot in a sunlit modern kitchen: Low-angle heroic view as an energetic chef (framed from chest down in a yellow and blue vest apron) leaps high into mid-air with golden lightning speed trails! "
            "Both hands bend this exact flexible terracotta-red semi-circular TPU cutting board into a curved U-shaped funnel, pouring a glowing stream of diced carrots, tomatoes, and greens straight down into a steaming stainless steel pot on the stove without spilling a single piece! "
            "Bold 3D yellow comic text with blue outline 'KHÔNG RƠI 1 MIẾNG', 9:16 vertical commercial."
        ),
        "video_prompt": (
            "Dynamic action-comedy TVC shot, 9:16 vertical. Seconds 0 to 2.5: Two hands bend the flexible terracotta-red semi-circular TPU cutting board into a curved U-shaped chute with glowing golden energy sparks. "
            "Seconds 2.5 to 5.0: A colorful stream of chopped vegetables shoots smoothly down the bent TPU funnel straight into the simmering stainless steel pot below with 100 percent accuracy and zero spills. "
            "Seconds 5.0 to 6.0: The TPU board snaps back flat effortlessly in the chef's hands."
        ),
    },
    {
        "index": 5,
        "refs": [str(RAW_DIR / "ref_1_four_colors.png")],
        "image_prompt": (
            "Explosive high-energy viral TVC finale shot: In a bright sunlit kitchen, four energetic chefs (framed from chest down in colorful aprons) stride rapidly toward the camera with dynamic motion blur and golden electric sparks at the bottom! "
            "Each chef holds out one of the four vibrant colors of this exact semi-circular ribbed TPU cutting board with D-shaped hanging loops—terracotta red, cream white, lime green, and bright orange—thrusting them proudly toward the lens! "
            "Bold 3D yellow comic text with blue outline 'KHÔNG GÌ KHÔNG THỂ', 9:16 vertical commercial."
        ),
        "video_prompt": (
            "High-energy commercial finale shot, 9:16 vertical. Seconds 0 to 2.5: Four chefs in aprons stride energetically toward the camera with golden lightning sparks and dynamic motion blur, holding up the four colorful semi-circular ribbed TPU cutting boards—terracotta red, cream white, lime green, and bright orange. "
            "Seconds 2.5 to 5.0: They thrust the four vibrant TPU cutting boards forward into a hero fan formation right in front of the lens. "
            "Seconds 5.0 to 6.0: Energetic hero hold with golden sparkles and clean lower-third space for shopping cart CTA."
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
            print(f"🎨 [Scene {idx} I2I · Attempt {attempt}] Generating action keyframe...", flush=True)
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

    print("🎉 All 5 Action-VFX images and 5 AI video clips are ready!", flush=True)


if __name__ == "__main__":
    main()
