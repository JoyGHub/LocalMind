import os
from typing import Dict, Iterable
from urllib.request import Request, urlopen

if __package__:
    from .catalog import CATALOG_MODELS, MODELS_DIR
else:
    from catalog import CATALOG_MODELS, MODELS_DIR


def find_catalog_model(model_id: str) -> Dict | None:
    return next((model for model in CATALOG_MODELS if model["id"] == model_id), None)


def download_progress(model_id: str, stage: str, file_index: int, total_files: int,
                      file_name: str, percent: int, downloaded_bytes: int,
                      total_bytes: int, message: str, error: str | None = None) -> Dict:
    event = {
        "modelId": model_id,
        "stage": stage,
        "fileIndex": file_index,
        "totalFiles": total_files,
        "fileName": file_name,
        "percent": max(0, min(100, percent)),
        "downloadedBytes": downloaded_bytes,
        "totalBytes": total_bytes,
        "message": message,
    }
    if error:
        event["error"] = error
    return event


def download_model(model_id: str) -> Iterable[Dict]:
    model = find_catalog_model(model_id)
    if not model:
        raise ValueError(f"Unknown image model: {model_id}")

    artifacts = model["files"]
    total_files = len(artifacts)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for file_index, artifact in enumerate(artifacts, start=1):
        subdir = artifact["subdir"]
        filename = artifact["filename"]
        url = artifact["url"]
        target_dir = MODELS_DIR / subdir
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
        part = target.with_name(target.name + ".part")

        if target.is_file() and target.stat().st_size > 0:
            yield download_progress(
                model_id, "downloading", file_index, total_files, filename, 100,
                target.stat().st_size, target.stat().st_size,
                f"{filename} already downloaded",
            )
            continue

        downloaded = 0
        total_bytes = 0
        try:
            part.unlink(missing_ok=True)
            request = Request(url, headers={"User-Agent": "LocalMind"})
            with urlopen(request, timeout=60) as response, part.open("wb") as handle:
                content_length = response.headers.get("Content-Length")
                if content_length:
                    try:
                        total_bytes = int(content_length)
                    except ValueError:
                        total_bytes = 0

                yield download_progress(
                    model_id, "downloading", file_index, total_files, filename, 0,
                    0, total_bytes, f"Downloading {filename}",
                )

                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    handle.write(chunk)
                    downloaded += len(chunk)
                    percent = int((downloaded / total_bytes) * 100) if total_bytes else 0
                    yield download_progress(
                        model_id, "downloading", file_index, total_files, filename,
                        percent, downloaded, total_bytes, f"Downloading {filename}",
                    )

            if downloaded <= 0:
                raise RuntimeError(f"Downloaded file is empty: {filename}")
            os.replace(part, target)
        except Exception as error:
            try:
                part.unlink(missing_ok=True)
            except OSError:
                pass
            message = str(error) or f"Failed to download {filename}"
            yield download_progress(
                model_id, "error", file_index, total_files, filename, 100,
                downloaded, total_bytes, message, message,
            )
            return

    yield download_progress(
        model_id, "completed", total_files, total_files, "",
        100, 0, 0, f"{model['name']} download completed",
    )


def _catalog_model_installed(model: Dict) -> bool:
    return all(
        (MODELS_DIR / artifact["subdir"] / artifact["filename"]).is_file()
        and (MODELS_DIR / artifact["subdir"] / artifact["filename"]).stat().st_size > 0
        for artifact in model["files"]
    )


def delete_model(model_id: str) -> bool:
    model = find_catalog_model(model_id)
    if model:
        preserved = set()
        for other in CATALOG_MODELS:
            if other["id"] == model_id or not _catalog_model_installed(other):
                continue
            for artifact in other["files"]:
                preserved.add((artifact["subdir"], artifact["filename"]))

        for artifact in model["files"]:
            key = (artifact["subdir"], artifact["filename"])
            if key in preserved:
                continue
            target = MODELS_DIR / artifact["subdir"] / artifact["filename"]
            if target.is_file():
                target.unlink()
        return True

    if model_id.startswith("custom:"):
        filename = model_id[len("custom:"):].replace("/", "_").replace("\\", "_")
        target = (MODELS_DIR / filename).resolve()
        models_root = MODELS_DIR.resolve()
        if target.parent == models_root and target.is_file():
            target.unlink()
            return True
        for candidate in MODELS_DIR.rglob(filename):
            resolved = candidate.resolve()
            if resolved.is_file() and models_root in resolved.parents:
                resolved.unlink()
                return True
        return False

    return False
