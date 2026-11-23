import json
import os
import tempfile
import time
import unittest
from unittest.mock import patch

from backend.code_execution import (
  MAX_TIMEOUT_SECONDS,
  execute_code,
  normalize_code_execution_request,
  stream_code_execution,
)


class CodeExecutionTests(unittest.TestCase):
  def test_python_captures_output_and_runtime_errors(self):
    result = execute_code("python", 'print("hello")\nraise ValueError("broken")')

    self.assertEqual(result["stdout"].strip(), "hello")
    self.assertIn("ValueError: broken", result["stderr"])
    self.assertNotEqual(result["exit_code"], 0)
    self.assertFalse(result["success"])

  def test_python_syntax_error_is_returned_as_execution_output(self):
    result = execute_code("python", "if True print('broken')")

    self.assertIn("SyntaxError", result["stderr"])
    self.assertNotEqual(result["exit_code"], 0)

  def test_javascript_returns_stdout(self):
    result = execute_code("javascript", 'console.log("hello from node");')

    self.assertEqual(result["stdout"].strip(), "hello from node")
    self.assertEqual(result["exit_code"], 0)
    self.assertTrue(result["success"])

  def test_timeout_returns_structured_result(self):
    result = execute_code("python", "import time\ntime.sleep(5)", 0.1)

    self.assertFalse(result["success"])
    self.assertIsNone(result["exit_code"])
    self.assertIn("timed out", result["error"])
    self.assertGreaterEqual(result["duration_ms"], 0)

  def test_timeout_is_capped(self):
    self.assertEqual(
      normalize_code_execution_request("python", "print('hello')", 100)[2],
      MAX_TIMEOUT_SECONDS,
    )
    self.assertEqual(MAX_TIMEOUT_SECONDS, 30)

  def test_invalid_timeout_is_rejected(self):
    with self.assertRaisesRegex(ValueError, "greater than zero"):
      execute_code("python", "print('hello')", 0)
    with self.assertRaisesRegex(ValueError, "finite"):
      execute_code("python", "print('hello')", float("nan"))

  def test_temporary_directory_is_cleaned_up(self):
    with tempfile.TemporaryDirectory() as parent:
      with patch("backend.code_execution.tempfile.tempdir", parent):
        result = execute_code("python", "print('done')")

      self.assertTrue(result["success"])
      self.assertEqual(os.listdir(parent), [])

  def test_output_is_streamed_before_execution_finishes(self):
    started_at = time.monotonic()
    events = stream_code_execution(
      "python",
      "import time\nprint('early output', flush=True)\ntime.sleep(2)",
      4,
    )

    self.assertEqual(next(events)["type"], "started")
    output_event = next(events)
    self.assertEqual(output_event["type"], "output")
    self.assertEqual(output_event["stream"], "stdout")
    self.assertTrue(output_event["text"].startswith("early output"))
    self.assertLess(time.monotonic() - started_at, 1.5)
    events.close()

  def test_javascript_output_is_streamed_before_execution_finishes(self):
    started_at = time.monotonic()
    events = stream_code_execution(
      "javascript",
      'console.log("early output"); setTimeout(() => {}, 1500);',
      4,
    )

    self.assertEqual(next(events)["type"], "started")
    output_event = next(events)
    self.assertEqual(output_event["type"], "output")
    self.assertEqual(output_event["stream"], "stdout")
    self.assertTrue(output_event["text"].startswith("early output"))
    self.assertLess(time.monotonic() - started_at, 1.2)
    events.close()


class CodeExecutionEndpointTests(unittest.TestCase):
  def setUp(self):
    from backend.llm_api import app

    self.client = app.test_client()

  def test_endpoint_returns_structured_execution_result(self):
    response = self.client.post(
      "/api/tools/execute_code",
      json={"language": "python", "code": 'print("from endpoint")'},
    )

    self.assertEqual(response.status_code, 200)
    events = self.read_events(response)
    result = events[-1]["result"]
    self.assertEqual(result["stdout"].strip(), "from endpoint")
    self.assertTrue(result["success"])
    self.assertIn("duration_ms", result)
    self.assertTrue(any(event["type"] == "output" for event in events))

  def test_endpoint_streams_output_before_final_result(self):
    response = self.client.post(
      "/api/tools/execute_code",
      json={"language": "python", "code": "import time\nprint('before wait', flush=True)\ntime.sleep(0.2)"},
    )

    events = self.read_events(response)
    output_index = next(index for index, event in enumerate(events) if event["type"] == "output")
    complete_index = next(index for index, event in enumerate(events) if event["type"] == "complete")
    self.assertLess(output_index, complete_index)

  def test_endpoint_rejects_unsupported_language(self):
    response = self.client.post(
      "/api/tools/execute_code",
      json={"language": "ruby", "code": "puts 'hi'"},
    )

    self.assertEqual(response.status_code, 400)
    self.assertIn("Unsupported language", response.get_json()["error"])

  def test_endpoint_rejects_non_local_origins(self):
    response = self.client.post(
      "/api/tools/execute_code",
      json={"language": "python", "code": "print('not allowed')"},
      headers={"Origin": "https://example.com"},
    )

    self.assertEqual(response.status_code, 403)

  def test_endpoint_returns_timeout_without_failing_the_request(self):
    response = self.client.post(
      "/api/tools/execute_code",
      json={"language": "python", "code": "import time\ntime.sleep(5)", "timeout_seconds": 0.1},
    )

    self.assertEqual(response.status_code, 200)
    events = self.read_events(response)
    result = events[-1]["result"]
    self.assertFalse(result["success"])
    self.assertIn("timed out", result["error"])

  def read_events(self, response):
    return [
      json.loads(line[5:].strip())
      for line in response.get_data(as_text=True).splitlines()
      if line.startswith("data:")
    ]


if __name__ == "__main__":
  unittest.main()
