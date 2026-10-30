import hashlib
import os
import httpx
import wave
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from piper import PiperVoice
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_cache()
    yield

app = FastAPI(title="Local Piper TTS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_DIR = BASE_DIR / "default_voice_model"
USER_MODEL_DIR = BASE_DIR / "voice_models"
CACHE_DIR = BASE_DIR / "tts_cache"
TMP_DIR = BASE_DIR / "tmp"
MAX_CHARS = 5000

for d in [DEFAULT_MODEL_DIR, USER_MODEL_DIR, CACHE_DIR, TMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# TODO: this returns "404 Sorry, we can't find the page you are looking for."
HUGGINGFACE_REPO = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"
VOICES_JSON_URL = f"{HUGGINGFACE_REPO}/voices.json"

inflight = {}

def get_installed_voices():
    """Scans default and user model directories for valid .onnx files."""
    installed = {}
    
    # 1. Scan the committed default directory
    if DEFAULT_MODEL_DIR.exists():
        for file in DEFAULT_MODEL_DIR.glob("*.onnx"):
            installed[file.stem] = str(file)
            
    # 2. Scan the user-installed models directory
    if USER_MODEL_DIR.exists():
        for file in USER_MODEL_DIR.glob("*.onnx"):
            installed[file.stem] = str(file)
            
    return installed

def sanitize(text: str) -> str:
    return "".join(c if c >= " " else " " for c in text).strip()[:MAX_CHARS]

def text_hash(text: str, voice: str) -> str:
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    h.update(voice.encode("utf-8"))
    return h.hexdigest()

def run_piper(text: str, voice: str, out_path: str):
    installed_voices = get_installed_voices()
    if voice not in installed_voices:
        raise ValueError(f"Voice {voice} is not installed.")

    model_path = installed_voices[voice]
    tmp_path = str(TMP_DIR / (Path(out_path).name + ".tmp"))

    try:
        piper_voice = PiperVoice.load(model_path)

        with wave.open(tmp_path, "wb") as wav_file:
            piper_voice.synthesize_wav(text, wav_file)

        os.replace(tmp_path, out_path)
        return out_path
        
    except Exception as e:
        raise RuntimeError(f"Piper failed: {str(e)}")

async def synthesize(text: str, voice: str) -> str:
    clean = sanitize(text)
    if not clean:
        raise ValueError("Empty text after sanitization.")

    key = text_hash(clean, voice)
    cached_path = str(CACHE_DIR / f"{key}.wav")

    if os.path.exists(cached_path):
        return cached_path

    if key in inflight:
        return await inflight[key]

    import asyncio
    loop = asyncio.get_event_loop()
    future = loop.run_in_executor(None, run_piper, clean, voice, cached_path)
    inflight[key] = future
    
    try:
        out = await future
    finally:
        inflight.pop(key, None)
    return out

def cleanup_cache(max_age_seconds: int = 86400 * 1): # Default: delete files older than 1 day
    """Deletes old cached audio files to free up disk space."""
    now = time.time()
    if not CACHE_DIR.exists():
        return
        
    for file_path in CACHE_DIR.glob("*.wav"):
        try:
            if now - file_path.stat().st_mtime > max_age_seconds:
                file_path.unlink()
        except Exception as e:
            print(f"Failed to delete old cache file {file_path}: {e}")

# --- ENDPOINTS ---

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/tts")
async def tts_endpoint(text: str = Query(...), voice: str = Query(...)):
    try:
        wav_path = await synthesize(text, voice)
        return FileResponse(wav_path, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/voices")
async def list_voices():
    """Returns all available voices and marks which ones are installed."""
    installed = get_installed_voices()
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(VOICES_JSON_URL)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch voices list")
        
        all_voices = resp.json()
    
    result = []
    for voice_key, voice_data in all_voices.items():
        result.append({
            "key": voice_key,
            "name": voice_data.get("name"),
            "language": voice_data.get("language", {}).get("name_english"),
            "quality": voice_data.get("quality"),
            "is_installed": voice_key in installed
        })
    
    return result

@app.post("/voices/download")
async def download_voice(voice_key: str = Query(...)):
    """Downloads the .onnx and .json files for a specific voice."""
    installed = get_installed_voices()
    if voice_key in installed:
        return {"status": "already_installed"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(VOICES_JSON_URL)
        voices_data = resp.json()
        
        if voice_key not in voices_data:
            raise HTTPException(status_code=404, detail="Voice not found in registry")
            
        files_to_download = voices_data[voice_key]["files"]
        
        for file_path in files_to_download.keys():
            download_url = f"{HUGGINGFACE_REPO}/{file_path}"
            filename = Path(file_path).name
            target_path = USER_MODEL_DIR / filename
            
            async with client.stream('GET', download_url) as response:
                response.raise_for_status()
                with open(target_path, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        f.write(chunk)
                        
    return {"status": "success", "voice": voice_key}