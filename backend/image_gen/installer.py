import json
import os
import platform
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from fnmatch import fnmatch
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[2]
INSTALL_DIR = PROJECT_ROOT / "modules" / "image-gen" / "sdcpp"
META_FILE = INSTALL_DIR / "install_meta.json"
RELEASES_URL = "https://api.github.com/repos/leejet/stable-diffusion.cpp/releases/latest"
REPO_URL = "https://github.com/leejet/stable-diffusion.cpp"


def detect_hardware() -> Dict:
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "windows":
        try:
            result = subprocess.run(
                ["nvidia-smi"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                timeout=3,
            )
            detected = "cuda" if result.returncode == 0 else "vulkan"
        except (FileNotFoundError, subprocess.TimeoutExpired):
            detected = "vulkan"
        return {
            "detectedBackend": detected,
            "availableBackends": ["auto", "cuda", "vulkan", "cpu"],
            "platform": "windows",
        }

    if system == "darwin":
        detected = "metal" if ("arm" in machine or "aarch64" in machine) else "cpu"
        return {
            "detectedBackend": detected,
            "availableBackends": ["auto", "metal", "cpu"],
            "platform": "macos",
        }

    return {
        "detectedBackend": "vulkan",
        "availableBackends": ["auto", "cuda", "vulkan", "cpu"],
        "platform": "linux",
    }


def read_meta() -> Optional[Dict]:
    if not META_FILE.is_file():
        return None
    try:
        with META_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return None


def find_binary() -> Optional[Path]:
    binary_name = "sd-server.exe" if platform.system().lower() == "windows" else "sd-server"
    for path in INSTALL_DIR.rglob(binary_name):
        if path.is_file():
            return path
    return None


def get_status() -> Dict:
    hardware = detect_hardware()
    binary = find_binary()
    meta = read_meta()
    installed = binary is not None
    active_meta = meta if installed else None

    return {
        "backendOnline": True,
        "installed": installed,
        "version": active_meta.get("version") if active_meta else None,
        "backend": active_meta.get("backend") if active_meta else None,
        "detectedBackend": hardware["detectedBackend"],
        "availableBackends": hardware["availableBackends"],
        "platform": hardware["platform"],
        "installPath": "modules/image-gen/sdcpp",
        "repoUrl": REPO_URL,
        "installState": {
            "status": "idle",
            "stage": "idle",
            "percent": 0,
            "message": "",
            "error": None,
        },
    }


def uninstall() -> None:
    if INSTALL_DIR.exists():
        shutil.rmtree(INSTALL_DIR)


def progress(status: str, stage: str, percent: int, message: str,
             downloaded: int = 0, total: int = 0) -> Dict:
    return {
        "status": status,
        "stage": stage,
        "percent": percent,
        "message": message,
        "downloadedBytes": downloaded,
        "totalBytes": total,
        "error": None if status != "error" else message,
    }


def fetch_release_assets() -> Dict:
    request = Request(RELEASES_URL, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "LocalMind",
    })
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def select_assets(release: Dict, requested_backend: str) -> tuple[str, Optional[str]]:
    hardware = detect_hardware()
    backend = requested_backend if requested_backend != "auto" else hardware["detectedBackend"]

    assets = release.get("assets", [])
    names = [asset["name"] for asset in assets if isinstance(asset.get("name"), str)]

    def find(pattern: str) -> Optional[str]:
        for name in names:
            if fnmatch(name.lower(), pattern.lower()):
                return name
        return None

    if hardware["platform"] == "windows":
        if backend == "cuda":
            main_asset = find("*bin-win-cuda12-x64.zip")
            runtime_asset = find("cudart-sd-bin-win-cu12-x64.zip")
            if not main_asset or not runtime_asset:
                raise RuntimeError("Could not find the Windows CUDA stable-diffusion.cpp release assets.")
            return main_asset, runtime_asset
        if backend == "cpu":
            asset = find("*bin-win-cpu-x64.zip")
        else:
            asset = find("*bin-win-vulkan-x64.zip")
    elif hardware["platform"] == "macos":
        if backend == "cpu":
            asset = None
            for name in names:
                lower = name.lower()
                if fnmatch(lower, "*bin-darwin-macos-*-arm64.zip"):
                    asset = name
                    break
        else:
            asset = None
            for name in names:
                lower = name.lower()
                if fnmatch(lower, "*bin-darwin-macos-*-arm64.zip"):
                    asset = name
                    break
    else:
        if backend == "cpu":
            candidates = [
                name for name in names
                if fnmatch(name.lower(), "*bin-linux-*.zip")
                and "-rocm-" not in name.lower()
                and "-vulkan" not in name.lower()
            ]
            asset = candidates[0] if candidates else None
        else:
            asset = find("*bin-linux-*-vulkan.zip")

    if not asset:
        raise RuntimeError(f"Could not find a stable-diffusion.cpp release asset for {backend}.")
    return asset, None


def safe_extract(zip_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        destination_resolved = destination.resolve()
        for member in archive.infolist():
            target = (destination / member.filename).resolve()
            if destination_resolved != target and destination_resolved not in target.parents:
                raise RuntimeError("Release archive contains an unsafe file path.")
        archive.extractall(destination)


def download_asset(asset_name: str, release: Dict, callback: Callable[[Dict], None],
                   base_percent: int, span: int) -> Path:
    asset = next(
        (item for item in release.get("assets", []) if item.get("name") == asset_name),
        None,
    )
    if not asset:
        raise RuntimeError(f"Release asset not found: {asset_name}")

    total_bytes = int(asset.get("size") or 0)
    download_url = asset.get("browser_download_url")
    if not download_url:
        raise RuntimeError(f"Release asset has no download URL: {asset_name}")

    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    archive_path = Path(tempfile.gettempdir()) / asset_name
    downloaded = 0
    request = Request(download_url, headers={"User-Agent": "LocalMind"})

    with urlopen(request, timeout=60) as response, archive_path.open("wb") as handle:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
            downloaded += len(chunk)
            percent = base_percent + (
                int((downloaded / total_bytes) * span) if total_bytes else 0
            )
            callback(progress(
                "installing",
                "downloading",
                min(base_percent + span, percent),
                f"Downloading {asset_name}",
                downloaded,
                total_bytes,
            ))
    return archive_path


def install(requested_backend: str, callback: Callable[[Dict], None]) -> Dict:
    hardware = detect_hardware()
    callback(progress("installing", "fetching_release", 5, "Fetching latest stable-diffusion.cpp release"))

    release = fetch_release_assets()
    main_asset, runtime_asset = select_assets(release, requested_backend)
    if requested_backend == "auto":
        resolved_backend = hardware["detectedBackend"]
    else:
        resolved_backend = requested_backend

    uninstall()
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)

    callback(progress("installing", "downloading", 10, f"Downloading {main_asset}", 0, 0))
    main_zip = download_asset(main_asset, release, callback, 10, 55)

    runtime_zip = None
    if runtime_asset:
        callback(progress("installing", "downloading", 65, f"Downloading {runtime_asset}", 0, 0))
        runtime_zip = download_asset(runtime_asset, release, callback, 65, 15)

    callback(progress("installing", "extracting", 82, "Extracting stable-diffusion.cpp"))
    safe_extract(main_zip, INSTALL_DIR)
    if runtime_zip:
        safe_extract(runtime_zip, INSTALL_DIR)

    for archive in (main_zip, runtime_zip):
        if archive:
            try:
                archive.unlink()
            except OSError:
                pass

    binary = find_binary()
    if not binary:
        raise RuntimeError("Installation completed but sd-server binary was not found.")

    if platform.system().lower() in {"darwin", "linux"}:
        os.chmod(binary, binary.stat().st_mode | 0o111)

    version = str(release.get("tag_name") or release.get("name") or "unknown")
    meta = {
        "version": version,
        "backend": resolved_backend,
        "assetName": main_asset,
        "installedAt": datetime.now(timezone.utc).isoformat(),
        "binaryPath": str(binary.relative_to(PROJECT_ROOT).as_posix()),
    }
    with META_FILE.open("w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)

    callback(progress("idle", "completed", 100, "Installation completed"))
    return get_status()
