import platform
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Optional
from urllib.request import Request, urlopen

if __package__:
    from .catalog import CATALOG_MODELS, MODELS_DIR, PROJECT_ROOT, iter_weight_files
else:
    from catalog import CATALOG_MODELS, MODELS_DIR, PROJECT_ROOT, iter_weight_files


INSTALL_DIR = PROJECT_ROOT / "modules" / "image-gen" / "sdcpp"


def _find_binary() -> Optional[Path]:
    for name in ("sd-cli.exe", "sd-cli", "sd-server.exe", "sd-server"):
        for path in INSTALL_DIR.rglob(name):
            if path.is_file():
                return path
    return None


def _unload_ollama(model_name: Optional[str]) -> None:
    if not model_name:
        return
    try:
        request = Request(
            "http://localhost:11434/api/generate",
            data=__import__("json").dumps({"model": model_name, "keep_alive": 0}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urlopen(request, timeout=5).read()
    except Exception:
        pass


def _installed_catalog_model(model_id: Optional[str]) -> Optional[Dict]:
    if model_id:
        model = next((item for item in CATALOG_MODELS if item["id"].lower() == model_id.lower()), None)
        if model:
            artifacts = model["files"]
            if all((MODELS_DIR / item["subdir"] / item["filename"]).is_file()
                   and (MODELS_DIR / item["subdir"] / item["filename"]).stat().st_size > 0
                   for item in artifacts):
                return model

    for model in CATALOG_MODELS:
        if all((MODELS_DIR / item["subdir"] / item["filename"]).is_file()
               and (MODELS_DIR / item["subdir"] / item["filename"]).stat().st_size > 0
               for item in model["files"]):
            return model
    return None


def generate_image(payload: Dict) -> Dict:
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("Prompt is required")

    model_id = str(payload.get("model_id") or "").strip()
    model = _installed_catalog_model(model_id)

    custom_path: Optional[Path] = None
    if model_id.startswith("custom:"):
        filename = model_id[len("custom:"):].replace("/", "_").replace("\\", "_")
        custom_path = next((path for path in iter_weight_files()
                            if path.name == filename or path.name == model_id[len("custom:"):]), None)
        if custom_path is not None:
            model = {
                "id": model_id,
                "name": custom_path.stem,
                "defaultSteps": 20,
                "defaultCfg": 7.0,
                "defaultResolution": "1024x1024",
                "files": [str(custom_path.relative_to(PROJECT_ROOT).as_posix())],
            }

    if model is None:
        if custom_path is None:
            custom_weight = next(iter_weight_files(), None)
            if custom_weight is not None:
                model = {
                    "id": f"custom:{custom_weight.name}",
                    "name": custom_weight.stem,
                    "defaultSteps": 20,
                    "defaultCfg": 7.0,
                    "defaultResolution": "1024x1024",
                    "files": [str(custom_weight.relative_to(PROJECT_ROOT).as_posix())],
                }
    if model is None:
        raise RuntimeError(
            "No image generation model is installed. Download a model in Settings \u2192 Image Generation."
        )

    binary = _find_binary()
    if binary is None:
        raise RuntimeError(
            "stable-diffusion.cpp is not installed. Install the image engine in Settings \u2192 Image Generation."
        )

    if payload.get("unload_ollama") is True:
        _unload_ollama(payload.get("ollama_model"))

    resolution = str(model.get("defaultResolution") or "1024x1024")
    default_width, default_height = (
        (int(resolution.split("x")[0]), int(resolution.split("x")[1]))
        if "x" in resolution else (1024, 1024)
    )
    width = int(payload.get("width") or default_width)
    height = int(payload.get("height") or default_height)
    steps = int(payload.get("steps") or model.get("defaultSteps") or 20)
    cfg_scale = float(payload.get("cfg_scale") if payload.get("cfg_scale") is not None else model.get("defaultCfg") or 7.0)
    seed = int(payload.get("seed") if payload.get("seed") is not None else -1)

    output_dir = PROJECT_ROOT / "data" / "generated_images"
    output_dir.mkdir(parents=True, exist_ok=True)
    image_id = str(uuid.uuid4())
    output_path = output_dir / f"{image_id}.png"

    args = [str(binary)]
    model_files = model.get("files") or []
    for item in model_files:
        if isinstance(item, str):
            weight_path = (PROJECT_ROOT / item).resolve()
            if weight_path.is_file():
                args.extend(["-m", str(weight_path)])
            continue

        subdir = str(item.get("subdir") or "")
        filename = str(item.get("filename") or "")
        weight_path = MODELS_DIR / subdir / filename
        if not weight_path.is_file() or weight_path.stat().st_size <= 0:
            continue
        weight_path = weight_path.resolve()
        lower_name = filename.lower()
        if subdir == "checkpoints":
            args.extend(["-m", str(weight_path)])
        elif subdir == "diffusion_models":
            args.extend(["--diffusion-model", str(weight_path)])
        elif subdir == "vae":
            args.extend(["--vae", str(weight_path)])
        elif subdir == "text_encoders":
            if "qwen" in lower_name:
                args.extend(["--llm", str(weight_path)])
            if "clip_l" in lower_name:
                args.extend(["--clip_l", str(weight_path)])
            if "t5xxl" in lower_name:
                args.extend(["--t5xxl", str(weight_path)])

    args.extend(["-p", prompt, "-o", str(output_path), "-W", str(width), "-H", str(height),
                 "--steps", str(steps), "--cfg-scale", str(cfg_scale), "-s", str(seed)])
    negative_prompt = str(payload.get("negative_prompt") or "").strip()
    if negative_prompt:
        args.extend(["-n", negative_prompt])

    try:
        result = subprocess.run(
            args,
            cwd=str(binary.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=None,
            check=False,
        )
    except subprocess.SubprocessError as error:
        raise RuntimeError(f"Image generation failed: {error}") from error

    if result.returncode != 0:
        detail = (result.stderr or result.stdout).decode("utf-8", errors="replace").strip()
        raise RuntimeError(detail or f"stable-diffusion.cpp exited with code {result.returncode}")
    if not output_path.is_file() or output_path.stat().st_size <= 0:
        raise RuntimeError("Image generation completed but no PNG output was created.")

    return {
        "imageId": image_id,
        "fileName": f"{image_id}.png",
        "imageUrl": f"/api/image-gen/images/{image_id}.png",
        "prompt": prompt,
        "modelId": str(model["id"]),
        "modelName": str(model["name"]),
        "width": width,
        "height": height,
        "steps": steps,
        "seed": seed,
    }
