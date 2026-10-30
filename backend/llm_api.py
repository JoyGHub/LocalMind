from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import ollama
import json
import os
import subprocess

if __package__:
  from .geo_tools import DEFAULT_SEARCH_RADIUS_METERS, search_nearby_places, search_place_by_query, stream_tool_result
else:
  from geo_tools import DEFAULT_SEARCH_RADIUS_METERS, search_nearby_places, search_place_by_query, stream_tool_result

# TODO: Decide between Fask and FastAPI, or maybe another one.

app = Flask(__name__)
CORS(app)

@app.route("/api/chat", methods=["POST"])
def chat():
  data = request.get_json(silent=True) or {}
  
  model = data.get("model", "gemma4:26b")
  messages = data.get("messages")
  think = data.get("think", False)
  tools = data.get("tools")
  options = data.get("options")

  # Fallback structure logic to support your legacy prompt + history components cleanly
  if not messages:
    prompt = data.get("prompt")
    if not prompt:
      return jsonify({"error": "No messages or prompt provided"}), 400
    messages = format_messages(data.get("history", []), prompt)

  return Response(
    stream_ollama_response(model, messages, think, tools, options),
    mimetype="text/event-stream"
  )

@app.route("/api/tools/search_nearby_places", methods=["POST"])
def search_nearby_places_route():
  data = request.get_json(silent=True)
  if not isinstance(data, dict):
    return jsonify({"error": "A JSON request body is required"}), 400
  return Response(
    stream_tool_result(search_nearby_places(
      data.get("latitude"),
      data.get("longitude"),
      data.get("category"),
      data.get("radius", DEFAULT_SEARCH_RADIUS_METERS),
      data.get("limit", 10),
      data.get("offset", 0),
      data.get("sort_by", "distance"),
      data.get("include_details", False),
    )),
    mimetype="text/event-stream",
    headers={"Cache-Control": "no-cache"},
  )

@app.route("/api/tools/search_place_by_query", methods=["POST"])
def search_place_by_query_route():
  data = request.get_json(silent=True)
  if not isinstance(data, dict):
    return jsonify({"error": "A JSON request body is required"}), 400
  return Response(
    stream_tool_result(search_place_by_query(
      data.get("query"),
      data.get("latitude"),
      data.get("longitude"),
      data.get("limit", 5),
      data.get("offset", 0),
      data.get("sort_by"),
      data.get("include_details", False),
      radius=data.get("radius", DEFAULT_SEARCH_RADIUS_METERS),
    )),
    mimetype="text/event-stream",
    headers={"Cache-Control": "no-cache"},
  )

def format_messages(history, prompt):
  messages = [
    {"role": msg["role"], "content": msg["content"]}
    for msg in history if "role" in msg and "content" in msg
  ]
  messages.append({"role": "user", "content": prompt})
  return messages

def stream_ollama_response(model, messages, think, tools=None, options=None):
  try:
    stream = ollama.chat(model=model, messages=messages, think=think, tools=tools, options=options, stream=True)
    for chunk in stream:
      # Use object attribute access since the ollama python library returns classes
      message_obj = getattr(chunk, 'message', None)

      event = {}
      for field in ('model', 'total_duration', 'prompt_eval_count', 'prompt_eval_duration', 'eval_count', 'eval_duration'):
        value = getattr(chunk, field, None)
        if value is not None:
          event[field] = value

      if message_obj:
        # Convert the Pydantic/Class model directly to a clean dictionary
        # This properly formats complex structures like tool_calls into standard JSON
        if hasattr(message_obj, 'model_dump'):
          serialized_msg = message_obj.model_dump()
        else:
          serialized_msg = dict(message_obj)
          
        # Ensure empty tool calls aren't included as an empty list if not present
        if 'tool_calls' in serialized_msg and not serialized_msg['tool_calls']:
          del serialized_msg['tool_calls']

        event['message'] = serialized_msg

      done = getattr(chunk, 'done', None)
      done_reason = getattr(chunk, 'done_reason', None)
      if done is not None:
        event['done'] = done
      if done_reason is not None:
        event['done_reason'] = done_reason

      if event:
        yield f"data: {json.dumps(event)}\n\n"
  except Exception as e:
    yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.route("/api/models", methods=["GET"])
def list_models():
  try:
    res = ollama.list()
    models = []
    
    # Handle both dictionary (older SDKs) and object (newer SDKs) responses
    raw_models = res.get("models", []) if isinstance(res, dict) else res.models
    
    for m in raw_models:
      if isinstance(m, dict):
        models.append(m)
      else:
        # Convert the top-level Model object to a dictionary
        model_dict = dict(m)
        # Check for the nested 'details' object and convert it too
        if 'details' in model_dict and not isinstance(model_dict['details'], dict):
            model_dict['details'] = dict(model_dict['details'])
        models.append(model_dict)
        
    return jsonify({"models": models})
  except Exception as e:
    return jsonify({"error": str(e)}), 500

@app.route("/api/models/pull", methods=["POST"])
def pull_model():
  data = request.get_json(silent=True) or {}
  model = data.get("model")

  if not model:
    return jsonify({"error": "No model provided"}), 400

  return Response(
    stream_ollama_pull(model),
    mimetype="text/event-stream"
  )

def stream_ollama_pull(model):
  try:
    stream = ollama.pull(model, stream=True)
    for chunk in stream:
      # Yields status chunks (e.g., pulling manifest, downloading layers) for frontend progress tracking
      yield f"data: {json.dumps(dict(chunk))}\n\n"
  except Exception as e:
    yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.route("/api/models", methods=["DELETE"])
def delete_model():
  data = request.get_json(silent=True) or {}
  model = data.get("model")

  if not model:
    return jsonify({"error": "No model provided"}), 400

  try:
    ollama.delete(model)
    return jsonify({"success": True})
  except Exception as e:
    return jsonify({"error": str(e)}), 500

@app.route("/api/show", methods=["POST"])
def show_model():
    data = request.get_json(silent=True) or {}
    model = data.get("model")

    if not model:
        return jsonify({"error": "No model provided"}), 400

    try:
        res = ollama.show(model=model)
        return jsonify(res.model_dump())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/open-explorer', methods=['POST'])
def open_explorer():
    data = request.json
    file_path = data.get('path')

    if file_path and os.path.exists(file_path):
        try:
            # This opens the Windows File Explorer and selects the specific file
            subprocess.Popen(f'explorer /select,"{file_path}"')
            return jsonify({"status": "success"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "Invalid path or file does not exist"}), 400
  
if __name__ == "__main__":
  app.run(port=5000)