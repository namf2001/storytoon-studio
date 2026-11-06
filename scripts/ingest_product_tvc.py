#!/usr/bin/env python3
"""
CLI & Automation Utility: Ingest AI Product TVC into rac-vl via REST API.
Không cần sửa mã nguồn frontend (Zero frontend code modifications).
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

API_BASE = os.getenv("API_BASE_URL", "http://localhost:9090/api/v1")
MEDIA_BASE = os.getenv("MEDIA_BASE_URL", "http://localhost:9090/media")


def create_project(title: str, script: str, aspect_ratio: str = "9:16") -> str:
    """Create a new project record in Go backend."""
    url = f"{API_BASE}/projects"
    payload = json.dumps({
        "title": title,
        "script": script,
        "aspectRatio": aspect_ratio,
        "videoType": "product",
    }).encode("utf-8")

    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        if res.get("code") != "00":
            raise RuntimeError(f"Failed to create project: {res}")
        return res["data"]["id"]


def save_scenes(project_id: str, scenes: list) -> list:
    """Save/replace all scenes of a project via REST API."""
    url = f"{API_BASE}/projects/{project_id}/scenes"
    payload = json.dumps({"scenes": scenes}).encode("utf-8")

    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="PUT"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        if res.get("code") != "00":
            raise RuntimeError(f"Failed to save scenes: {res}")
        return res["data"]


def build_scene_payload(
    scene_index: int,
    start_ms: int,
    end_ms: int,
    transcript_text: str,
    setting: str,
    media_url: str,
    callout_tag: str = "",
    callout_text: str = "",
    source_dur_sec: float = 6.04,
    camera_effect: str = "zoom_in",
    transition: str = "fade",
) -> dict:
    """Format a scene with proper crop, video flag, and auto-fit speed parameters."""
    clean_media = media_url.split("#")[0].split("?")[0]
    final_url = f"{clean_media}#crop=50,50,1,0&v=1&autofit=1&srcdur={source_dur_sec}"

    return {
        "sceneIndex": scene_index,
        "startMs": start_ms,
        "endMs": end_ms,
        "transcriptText": transcript_text,
        "setting": setting,
        "characters": [],
        "imageUrl": final_url,
        "cameraEffect": camera_effect,
        "transition": transition,
        "showCaption": True,
        "layoutType": "standard",
        "layers": [],
        "calloutTag": callout_tag,
        "calloutText": callout_text,
        "calloutPosition": "top_center",
        "calloutTheme": "dark",
    }


def main():
    parser = argparse.ArgumentParser(description="Ingest AI Product TVC into rac-vl")
    parser.add_argument("--title", required=True, help="Tiêu đề TVC")
    parser.add_argument("--script", required=True, help="Nội dung kịch bản raw")
    parser.add_argument("--scenes-json", required=True, help="File JSON chứa danh sách 5 phân cảnh")
    parser.add_argument("--project-id", help="Project ID nếu đã tạo trước, nếu không sẽ tự tạo mới")

    args = parser.parse_args()

    project_id = args.project_id
    if not project_id:
        print(f"⏳ Đang khởi tạo dự án: {args.title}...")
        project_id = create_project(args.title, args.script)
        print(f"✅ Dự án tạo thành công: ID = {project_id}")

    scenes_file = Path(args.scenes_json)
    if not scenes_file.exists():
        print(f"❌ Không tìm thấy file phân cảnh: {args.scenes_json}", file=sys.stderr)
        sys.exit(1)

    raw_scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
    formatted_scenes = []

    for idx, sc in enumerate(raw_scenes, 1):
        formatted = build_scene_payload(
            scene_index=idx,
            start_ms=sc["startMs"],
            end_ms=sc["endMs"],
            transcript_text=sc.get("transcriptText", ""),
            setting=sc.get("setting", f"[Cảnh {idx}]"),
            media_url=sc.get("mediaUrl") or sc.get("imageUrl", ""),
            callout_tag=sc.get("calloutTag", ""),
            callout_text=sc.get("calloutText", ""),
            source_dur_sec=sc.get("sourceDurationSec", 6.04),
            camera_effect=sc.get("cameraEffect", "zoom_in" if idx % 2 == 1 else "static"),
            transition=sc.get("transition", "fade" if idx % 2 == 1 else "slide"),
        )
        formatted_scenes.append(formatted)

    print(f"⏳ Đang lưu {len(formatted_scenes)} phân cảnh vào Go API...")
    saved = save_scenes(project_id, formatted_scenes)
    print(f"🎉 Hoàn tất! Đã lưu {len(saved)} phân cảnh vào hệ thống.")
    print(f"\n👉 Mở xem và chỉnh sửa trực tiếp trên Web NLE Studio:")
    print(f"   http://localhost:3000/product?id={project_id}\n")


if __name__ == "__main__":
    main()
