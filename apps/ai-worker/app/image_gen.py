"""Scene image generation using Cloudflare Workers AI FLUX.1-schnell with Hugging Face Space fallback."""
import base64
import io
import json
import logging
import random
import time
import urllib.request

from PIL import Image

from . import config

log = logging.getLogger(__name__)

FLUX_SPACE_BASE = "https://black-forest-labs-flux-1-schnell.hf.space"
STYLE_PREFIX = (
    "2D flat vector cartoon illustration in the style of adult animated storytelling YouTube channel, "
    "bold black outlines, expressive characters, flat vibrant colors, clean digital comic art: "
)


def _generate_via_cloudflare(full_prompt: str, seed: int) -> bytes:
    """Calls Cloudflare Workers AI @cf/black-forest-labs/flux-1-schnell (~2s/image)."""
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{config.CF_ACCOUNT_ID}"
        "/ai/run/@cf/black-forest-labs/flux-1-schnell"
    )
    payload = json.dumps({
        "prompt": full_prompt,
        "steps": 4,
        "seed": seed % 2_147_483_647,
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {config.CF_API_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "StorytoonStudio/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        b64_img = body.get("result", {}).get("image")
        if not b64_img:
            raise RuntimeError(f"Cloudflare Workers AI returned no image: {body}")
        return base64.b64decode(b64_img)


def _generate_via_hf_space(full_prompt: str, width: int, height: int, seed: int, randomize: bool) -> bytes:
    """Calls black-forest-labs/FLUX.1-schnell on Hugging Face Space ZeroGPU."""
    payload = json.dumps({
        "data": [full_prompt, seed, randomize, width, height, 4]
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "StorytoonStudio/1.0",
    }
    if config.HF_TOKEN:
        headers["Authorization"] = f"Bearer {config.HF_TOKEN}"

    req = urllib.request.Request(
        f"{FLUX_SPACE_BASE}/gradio_api/call/infer",
        data=payload,
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        event_id = json.loads(r.read().decode("utf-8"))["event_id"]

    stream_req = urllib.request.Request(
        f"{FLUX_SPACE_BASE}/gradio_api/call/infer/{event_id}",
        headers=headers,
    )
    img_url = None
    error_msg = None
    with urllib.request.urlopen(stream_req, timeout=90) as r:
        current_event = ""
        for raw_line in r:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if line.startswith("event: "):
                current_event = line[7:].strip()
            elif line.startswith("data: "):
                data_str = line[6:].strip()
                if current_event == "error":
                    error_msg = data_str
                    break
                if data_str and data_str != "null":
                    try:
                        parsed = json.loads(data_str)
                        if (
                            isinstance(parsed, list)
                            and len(parsed) > 0
                            and isinstance(parsed[0], dict)
                            and "url" in parsed[0]
                        ):
                            img_url = parsed[0]["url"]
                            break
                    except json.JSONDecodeError:
                        continue

    if not img_url:
        raise RuntimeError(f"HF FLUX.1-schnell failed: {error_msg or 'no image URL returned'}")

    dl_req = urllib.request.Request(img_url, headers={"User-Agent": "StorytoonStudio/1.0"})
    with urllib.request.urlopen(dl_req, timeout=30) as img_resp:
        return img_resp.read()


def generate_scene_image(
    project_id: str,
    scene_index: int,
    prompt: str,
    aspect_ratio: str = "16:9",
    seed: int | None = None,
) -> str:
    """Generates a 2D cartoon illustration for a scene (Cloudflare primary, HF Space fallback)."""
    width, height = (720, 1280) if aspect_ratio == "9:16" else (1280, 720)
    full_prompt = prompt.strip()
    if full_prompt.startswith(("http://", "https://")):
        from .football import download_remote_image
        return download_remote_image(project_id, scene_index, full_prompt)

    lower = full_prompt.lower()
    is_custom_style = any(
        kw in lower
        for kw in ("2d", "cartoon", "photorealistic", "press photo", "stadium", "soccer", "football", "dslr")
    )
    if not is_custom_style:
        full_prompt = STYLE_PREFIX + full_prompt

    actual_seed = seed if seed is not None else random.randint(1, 2_000_000_000)
    raw_bytes: bytes | None = None
    provider = "cloudflare"

    if config.CF_ACCOUNT_ID and config.CF_API_TOKEN:
        try:
            raw_bytes = _generate_via_cloudflare(full_prompt, actual_seed)
        except Exception as e:  # noqa: BLE001
            log.warning("Cloudflare FLUX failed (%s), falling back to Hugging Face Space", e)

    if raw_bytes is None:
        provider = "huggingface"
        raw_bytes = _generate_via_hf_space(full_prompt, width, height, actual_seed, seed is None)

    out_dir = config.STORAGE_DIR / project_id / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"scene_{scene_index:03d}_{int(time.time())}.png"
    out_path = out_dir / filename

    im = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    im.save(out_path, format="PNG", optimize=True)
    rel_path = out_path.relative_to(config.STORAGE_DIR).as_posix()
    log.info("Generated FLUX.1-schnell image (%s) for scene %d -> %s", provider, scene_index, rel_path)
    return rel_path
