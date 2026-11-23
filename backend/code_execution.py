import codecs
import math
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


DEFAULT_TIMEOUT_SECONDS = 10
MAX_TIMEOUT_SECONDS = 30


class CodeRunner(ABC):
  language: str
  filename: str

  @abstractmethod
  def command(self, source_path: Path) -> list[str]:
    raise NotImplementedError


class PythonRunner(CodeRunner):
  language = "python"
  filename = "main.py"

  def command(self, source_path: Path) -> list[str]:
    return [sys.executable, "-I", "-u", str(source_path)]


class JavaScriptRunner(CodeRunner):
  language = "javascript"
  filename = "main.js"

  def __init__(self) -> None:
    self.executable = shutil.which("node")

  def command(self, source_path: Path) -> list[str]:
    if not self.executable:
      raise RuntimeError("The Node.js runtime is not installed or is not available on PATH.")
    return [self.executable, str(source_path)]


RUNNERS: dict[str, CodeRunner] = {
  runner.language: runner
  for runner in (PythonRunner(), JavaScriptRunner())
}


def _limit_timeout(timeout_seconds: Any) -> float:
  if timeout_seconds is None:
    return DEFAULT_TIMEOUT_SECONDS
  if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, (int, float)):
    raise ValueError("timeout_seconds must be a number.")
  try:
    timeout = float(timeout_seconds)
  except OverflowError as error:
    raise ValueError("timeout_seconds must be a finite number.") from error
  if not math.isfinite(timeout) or timeout <= 0:
    raise ValueError("timeout_seconds must be finite and greater than zero.")
  return min(timeout, MAX_TIMEOUT_SECONDS)


def normalize_code_execution_request(language: Any, code: Any, timeout_seconds: Any = None) -> tuple[str, str, float]:
  if not isinstance(language, str) or language.lower() not in RUNNERS:
    supported = ", ".join(sorted(RUNNERS))
    raise ValueError(f"Unsupported language. Supported languages: {supported}.")
  if not isinstance(code, str) or not code.strip():
    raise ValueError("code must be a non-empty string.")

  return language.lower(), code, _limit_timeout(timeout_seconds)


def stream_code_execution(language: Any, code: Any, timeout_seconds: Any = None):
  language, code, timeout = normalize_code_execution_request(language, code, timeout_seconds)
  runner = RUNNERS[language]
  started_at = time.perf_counter()
  yield {"type": "started", "language": language, "timeout_seconds": timeout}

  with tempfile.TemporaryDirectory(prefix="localmind-code-") as directory:
    source_path = Path(directory) / runner.filename
    source_path.write_text(code, encoding="utf-8")
    process = None
    reader_threads: list[threading.Thread] = []
    stop_readers = threading.Event()
    result: dict[str, Any]
    try:
      process = subprocess.Popen(
        runner.command(source_path),
        cwd=directory,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
        shell=False,
      )
    except (OSError, RuntimeError) as exception:
      result = {
        "language": language,
        "stdout": "",
        "stderr": "",
        "exit_code": None,
        "success": False,
        "error": f"Could not start the {language} runner: {exception}",
        "duration_ms": round((time.perf_counter() - started_at) * 1000),
      }
    else:
      output_queue: queue.Queue[tuple[str, bytes | None]] = queue.Queue(maxsize=32)
      output = {"stdout": "", "stderr": ""}
      decoders = {
        "stdout": codecs.getincrementaldecoder("utf-8")("replace"),
        "stderr": codecs.getincrementaldecoder("utf-8")("replace"),
      }

      def enqueue(item: tuple[str, bytes | None]) -> None:
        while not stop_readers.is_set():
          try:
            output_queue.put(item, timeout=0.1)
            return
          except queue.Full:
            continue

      def read_pipe(name: str, pipe: Any) -> None:
        try:
          while not stop_readers.is_set():
            chunk = pipe.read(4096)
            if not chunk:
              break
            enqueue((name, chunk))
        finally:
          enqueue((name, None))

      for name, pipe in (("stdout", process.stdout), ("stderr", process.stderr)):
        thread = threading.Thread(target=read_pipe, args=(name, pipe), daemon=True)
        reader_threads.append(thread)
        thread.start()

      timed_out = False
      deadline = time.monotonic() + timeout
      finished_streams: set[str] = set()
      try:
        while len(finished_streams) < 2:
          if not timed_out and process.poll() is None and time.monotonic() >= deadline:
            timed_out = True
            try:
              process.kill()
            except OSError:
              pass

          try:
            name, chunk = output_queue.get(timeout=0.05)
          except queue.Empty:
            continue

          if chunk is None:
            finished_streams.add(name)
          text = decoders[name].decode(chunk or b"", final=chunk is None)
          if text:
            output[name] += text
            yield {"type": "output", "stream": name, "text": text}

        exit_code = process.wait()
        error = f"Execution timed out after {timeout:g} seconds." if timed_out else None
        result = {
          "language": language,
          "stdout": output["stdout"],
          "stderr": output["stderr"],
          "exit_code": None if timed_out else exit_code,
          "success": not timed_out and exit_code == 0,
          "error": error,
          "duration_ms": round((time.perf_counter() - started_at) * 1000),
        }
      finally:
        if process.poll() is None:
          try:
            process.kill()
          except OSError:
            pass
          process.wait()
        stop_readers.set()
        for pipe in (process.stdout, process.stderr):
          if pipe:
            pipe.close()
        for thread in reader_threads:
          thread.join(timeout=1)

  yield {"type": "complete", "result": result}


def execute_code(language: Any, code: Any, timeout_seconds: Any = None) -> dict[str, Any]:
  for event in stream_code_execution(language, code, timeout_seconds):
    if event["type"] == "complete":
      return event["result"]
  raise RuntimeError("Code execution ended without a result.")
