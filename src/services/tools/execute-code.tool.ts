import { ollamaService } from '../ollama.service';
import { ToolDefinition, ToolExecutionContext } from './tool.interface';

interface CodeExecutionResult {
  language: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  success: boolean;
  error: string | null;
  duration_ms: number;
  running?: boolean;
}

const executeCode = async (
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<CodeExecutionResult> => {
  const response = await fetch(`${ollamaService.proxyUrl}/tools/execute_code`, {
    method: 'POST',
    signal: context?.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || `Code execution failed: ${response.statusText}`);
  }
  if (!response.body) throw new Error('Code execution response did not include a stream.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const output: CodeExecutionResult = {
    language: String(args.language),
    stdout: '',
    stderr: '',
    exit_code: null,
    success: false,
    error: null,
    duration_ms: 0,
    running: true,
  };
  let result: CodeExecutionResult | undefined;
  let buffer = '';

  const processLine = (line: string) => {
    if (!line.startsWith('data:')) return;
    const event = JSON.parse(line.slice(5).trimStart());

    if (event.type === 'started') {
      context?.onProgress?.({ ...output });
    } else if (event.type === 'output' && (event.stream === 'stdout' || event.stream === 'stderr')) {
      output[event.stream] += String(event.text || '');
      context?.onProgress?.({ ...output });
    } else if (event.type === 'complete' && event.result && typeof event.result === 'object') {
      result = { ...event.result, running: false } as CodeExecutionResult;
      context?.onProgress?.(result);
    } else {
      throw new Error('Code execution returned an invalid stream event.');
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) processLine(line);
      if (done) {
        if (buffer) processLine(buffer);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) throw new Error('Code execution stream ended without a final result.');
  return result;
};

export const executeCodeTool: ToolDefinition = {
  name: 'execute_code',
  description:
    'Run a short Python or JavaScript code snippet and inspect its stdout, stderr, exit code, and errors. Use this to calculate, test, verify, or debug code. Each run starts in a fresh temporary working directory; use it for standalone snippets.',
  parameters: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        description: 'Programming language to run.',
        enum: ['python', 'javascript'],
      },
      code: { type: 'string', description: 'Complete source code to execute.' },
      timeout_seconds: {
        type: 'number',
        description: 'Optional execution timeout in seconds (defaults to 10; maximum 30).',
      },
    },
    required: ['language', 'code'],
  },
  execute: async (args, context) => executeCode(args, context),
};
