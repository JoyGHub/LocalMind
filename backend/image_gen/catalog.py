from pathlib import Path
from typing import Dict, Iterable, List


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models" / "image"
MODEL_EXTENSIONS = {".safetensors", ".gguf", ".ckpt"}


CATALOG_MODELS: List[Dict] = [
    {
        "id": "sd-turbo",
        "name": "SD Turbo",
        "family": "Stable Diffusion",
        "description": "Fast single-step and few-step image generation.",
        "minVramGb": 4,
        "sizeLabel": "2-4 GB",
        "estimatedSizeBytes": 3_500_000_000,
        "tags": ["Turbo", "Fast"],
        "defaultSteps": 4,
        "defaultCfg": 1.0,
        "defaultResolution": "512x512",
        "files": [
            {
                "subdir": "checkpoints",
                "filename": "sd_turbo.safetensors",
                "url": "https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors",
            },
        ],
    },
    {
        "id": "sdxl-turbo",
        "name": "SDXL Turbo",
        "family": "SDXL",
        "description": "Fast SDXL generation optimized for a small step count.",
        "minVramGb": 6,
        "sizeLabel": "6-7 GB",
        "estimatedSizeBytes": 7_000_000_000,
        "tags": ["Turbo", "SDXL"],
        "defaultSteps": 4,
        "defaultCfg": 1.0,
        "defaultResolution": "1024x1024",
        "files": [
            {
                "subdir": "checkpoints",
                "filename": "sd_xl_turbo_1.0_fp16.safetensors",
                "url": "https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors",
            },
        ],
    },
    {
        "id": "flux2-klein-4b",
        "name": "FLUX.2 Klein 4B",
        "family": "FLUX.2",
        "description": "Compact FLUX.2 Klein model for efficient text-to-image generation.",
        "minVramGb": 8,
        "sizeLabel": "4-8 GB",
        "estimatedSizeBytes": 8_000_000_000,
        "tags": ["FLUX", "Klein", "Text-to-Image"],
        "defaultSteps": 20,
        "defaultCfg": 3.5,
        "defaultResolution": "1024x1024",
        "files": [
            {
                "subdir": "diffusion_models",
                "filename": "flux-2-klein-4b-Q4_K_M.gguf",
                "url": "https://huggingface.co/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q4_K_M.gguf",
            },
            {
                "subdir": "vae",
                "filename": "flux2-ae.safetensors",
                "url": "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/vae/flux2-ae.safetensors",
            },
            {
                "subdir": "text_encoders",
                "filename": "qwen_3_4b.safetensors",
                "url": "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors",
            },
        ],
    },
    {
        "id": "z-image-turbo",
        "name": "Z-Image Turbo",
        "family": "Z-Image",
        "description": "Turbo image generation with strong prompt adherence.",
        "minVramGb": 8,
        "sizeLabel": "6-10 GB",
        "estimatedSizeBytes": 10_000_000_000,
        "tags": ["Turbo", "Photorealistic"],
        "defaultSteps": 9,
        "defaultCfg": 1.0,
        "defaultResolution": "1024x1024",
        "files": [
            {
                "subdir": "diffusion_models",
                "filename": "z_image_turbo-Q4_K_M.gguf",
                "url": "https://huggingface.co/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q4_K_M.gguf",
            },
            {
                "subdir": "vae",
                "filename": "ae.safetensors",
                "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors",
            },
            {
                "subdir": "text_encoders",
                "filename": "qwen_3_4b.safetensors",
                "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors",
            },
        ],
    },
    {
        "id": "flux1-schnell",
        "name": "FLUX.1 Schnell",
        "family": "FLUX",
        "description": "FLUX.1 fast-distilled model for quick high-quality generations.",
        "minVramGb": 12,
        "sizeLabel": "12 GB",
        "estimatedSizeBytes": 12_000_000_000,
        "tags": ["FLUX", "Schnell", "Fast"],
        "defaultSteps": 4,
        "defaultCfg": 1.0,
        "defaultResolution": "1024x1024",
        "files": [
            {
                "subdir": "diffusion_models",
                "filename": "flux1-schnell-Q4_K_S.gguf",
                "url": "https://huggingface.co/city96/FLUX.1-schnell-gguf/resolve/main/flux1-schnell-Q4_K_S.gguf",
            },
            {
                "subdir": "vae",
                "filename": "ae.safetensors",
                "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors",
            },
            {
                "subdir": "text_encoders",
                "filename": "clip_l.safetensors",
                "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors",
            },
            {
                "subdir": "text_encoders",
                "filename": "t5xxl_fp8_e4m3fn.safetensors",
                "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors",
            },
        ],
    },
    {
        "id": "qwen-image-2.1",
        "name": "Qwen-Image 2.1",
        "family": "Qwen",
        "description": "High-quality multimodal image generation model.",
        "minVramGb": 16,
        "sizeLabel": "20 GB",
        "estimatedSizeBytes": 20_000_000_000,
        "tags": ["Qwen", "High Quality"],
        "defaultSteps": 20,
        "defaultCfg": 4.0,
        "defaultResolution": "1024x1024",
        "files": [
            {
                "subdir": "diffusion_models",
                "filename": "qwen-image-Q4_K_M.gguf",
                "url": "https://huggingface.co/city96/Qwen-Image-gguf/resolve/main/qwen-image-Q4_K_M.gguf",
            },
            {
                "subdir": "vae",
                "filename": "qwen_image_vae.safetensors",
                "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors",
            },
            {
                "subdir": "text_encoders",
                "filename": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors",
            },
        ],
    },
]


def ensure_model_dirs() -> Path:
    for directory in ("checkpoints", "diffusion_models", "text_encoders", "vae"):
        (MODELS_DIR / directory).mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    return MODELS_DIR


def iter_weight_files() -> Iterable[Path]:
    ensure_model_dirs()
    for path in MODELS_DIR.rglob("*"):
        if path.is_file() and path.suffix.lower() in MODEL_EXTENSIONS:
            yield path


def format_size(size_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size_bytes < 1024 or unit == "TB":
            return f"{size_bytes:.1f} {unit}".replace(".0 ", " ")
        size_bytes /= 1024


def catalog_with_disk_status() -> List[Dict]:
    ensure_model_dirs()
    weight_files = list(iter_weight_files())
    model_entries: List[Dict] = []

    for catalog_model in CATALOG_MODELS:
        model_id = catalog_model["id"].lower()
        installed = all(
            (MODELS_DIR / artifact["subdir"] / artifact["filename"]).is_file()
            and (MODELS_DIR / artifact["subdir"] / artifact["filename"]).stat().st_size > 0
            for artifact in catalog_model["files"]
        )
        model_entries.append({
            **catalog_model,
            "installed": installed,
            "isCustom": False,
        })

    for path in weight_files:
        stem = path.stem
        if any(
            path == MODELS_DIR / artifact["subdir"] / artifact["filename"]
            for model in CATALOG_MODELS
            for artifact in model["files"]
        ):
            continue
        size_bytes = path.stat().st_size
        model_entries.append({
            "id": f"custom:{path.name}",
            "name": stem,
            "family": "Custom",
            "description": f"Custom local weight ({path.suffix.lower().lstrip('.')}).",
            "minVramGb": 0,
            "sizeLabel": format_size(size_bytes),
            "estimatedSizeBytes": size_bytes,
            "tags": ["Custom", "Local"],
            "defaultSteps": 20,
            "defaultCfg": 7.0,
            "defaultResolution": "1024x1024",
            "files": [str(path.relative_to(PROJECT_ROOT).as_posix())],
            "installed": True,
            "isCustom": True,
        })

    return model_entries
