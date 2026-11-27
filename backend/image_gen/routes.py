import json
import queue
import threading

from pathlib import Path
from flask import Blueprint, Response, jsonify, request, send_from_directory

from .catalog import catalog_with_disk_status, ensure_model_dirs
from .model_manager import delete_model, download_model
if __package__:
    from .catalog import CATALOG_MODELS
else:
    from catalog import CATALOG_MODELS

if __package__:
    from . import installer
else:
    import installer


image_gen_blueprint = Blueprint("image_gen", __name__, url_prefix="/api/image-gen")


@image_gen_blueprint.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON request"}), 400
    if not str(data.get("prompt") or "").strip():
        return jsonify({"error": "Prompt is required"}), 400

    try:
        if __package__:
            from .generator import generate_image
        else:
            from generator import generate_image
        return jsonify(generate_image(data)), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": str(error) or "Image generation failed"}), 500


@image_gen_blueprint.route("/images/<path:filename>", methods=["GET"])
def generated_image(filename):
    project_root = Path(__file__).resolve().parents[2]
    output_dir = (project_root / "data" / "generated_images").resolve()
    allowed_suffixes = {".png", ".jpg", ".webp"}
    if not filename or "/" in filename or "\\" in filename:
        return jsonify({"error": "Invalid image filename"}), 400
    if Path(filename).suffix.lower() not in allowed_suffixes:
        return jsonify({"error": "Invalid image file type"}), 400

    target = (output_dir / filename).resolve()
    if target.parent != output_dir or not target.is_file():
        return jsonify({"error": "Image not found"}), 404
    return send_from_directory(str(output_dir), target.name, mimetype="image/png" if target.suffix.lower() == ".png" else None)


@image_gen_blueprint.route("/status", methods=["GET"])
def status():
    return jsonify(installer.get_status())


@image_gen_blueprint.route("/install", methods=["POST"])
def install():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    backend = data.get("backend", "auto")
    allowed = {"auto", "cuda", "vulkan", "metal", "cpu"}
    if backend not in allowed:
        return jsonify({"error": "Invalid image generation backend"}), 400

    hardware = installer.detect_hardware()
    if backend not in hardware["availableBackends"]:
        return jsonify({"error": f"Backend '{backend}' is not available on this platform"}), 400

    def events():
        try:
            for state in stream_install(backend):
                yield f"data: {json.dumps(state)}\n\n"
        except Exception as error:
            state = {
                "status": "error",
                "stage": "error",
                "percent": 100,
                "message": str(error),
                "downloadedBytes": 0,
                "totalBytes": 0,
                "error": str(error),
            }
            yield f"data: {json.dumps(state)}\n\n"

    return Response(
        events(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform"},
    )


def stream_install(backend):
    states = queue.Queue()
    sentinel = object()

    def callback(state):
        states.put(state)

    def run_install():
        try:
            installer.install(backend, callback)
        except Exception as error:
            states.put({
                "status": "error",
                "stage": "error",
                "percent": 100,
                "message": str(error),
                "downloadedBytes": 0,
                "totalBytes": 0,
                "error": str(error),
            })
        finally:
            states.put(sentinel)

    threading.Thread(target=run_install, daemon=True).start()
    while True:
        state = states.get()
        if state is sentinel:
            break
        yield state


@image_gen_blueprint.route("/install", methods=["DELETE"])
def uninstall():
    try:
        installer.uninstall()
        return jsonify({"success": True})
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@image_gen_blueprint.route("/models", methods=["GET"])
def models():
    ensure_model_dirs()
    model_entries = catalog_with_disk_status()
    return jsonify({
        "models": model_entries,
        "modelsDir": "models/image",
        "installedCount": sum(1 for model in model_entries if model["installed"]),
    })


@image_gen_blueprint.route("/models/<model_id>/download", methods=["POST"])
def download_model_route(model_id):
    if not any(model["id"] == model_id for model in CATALOG_MODELS):
        return jsonify({"error": "Unknown image model"}), 404

    def events():
        try:
            for progress in download_model(model_id):
                yield f"data: {json.dumps(progress)}\n\n"
        except Exception as error:
            state = {
                "modelId": model_id,
                "stage": "error",
                "fileIndex": 1,
                "totalFiles": 0,
                "fileName": "",
                "percent": 100,
                "downloadedBytes": 0,
                "totalBytes": 0,
                "message": str(error),
                "error": str(error),
            }
            yield f"data: {json.dumps(state)}\n\n"

    return Response(
        events(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform"},
    )


@image_gen_blueprint.route("/models/<model_id>", methods=["DELETE"])
def delete_model_route(model_id):
    try:
        deleted = delete_model(model_id)
        if not deleted:
            return jsonify({"error": "Image model not found"}), 404
        return jsonify({"deleted": True, "modelId": model_id})
    except Exception as error:
        return jsonify({"error": str(error)}), 500


def register_image_gen_routes(app):
    app.register_blueprint(image_gen_blueprint)
