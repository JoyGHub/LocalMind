interface PullProgress {
  status?: string;
  completed?: number;
  total?: number;
  error?: string;
}

export interface ModelInstallProgress {
  status: string;
  progress: number;
}

function getResponseError(body: string, status: number): string {
  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: unknown };
      if (typeof parsed.error === 'string') return parsed.error;
    } catch {
      return body;
    }
  }
  return `Request failed with status ${status}.`;
}

export async function installOllamaModel(modelName: string, onProgress: (progress: ModelInstallProgress) => void): Promise<void> {
  const response = await fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to install model: ${getResponseError(await response.text(), response.status)}`);
  }
  if (!response.body) throw new Error('Ollama did not provide an installation progress stream.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let isSuccessful = false;
  let latestProgress = 0;

  const processLine = (line: string) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    let parsedUpdate: unknown;
    try {
      parsedUpdate = JSON.parse(trimmedLine) as unknown;
    } catch {
      throw new Error('Ollama returned an invalid installation progress response.');
    }
    if (typeof parsedUpdate !== 'object' || parsedUpdate === null || Array.isArray(parsedUpdate)) {
      throw new Error('Ollama returned an invalid installation progress response.');
    }
    const update = parsedUpdate as PullProgress;
    if (typeof update.error === 'string' && update.error) throw new Error(update.error);

    const status = typeof update.status === 'string' ? update.status : '';
    if (!status) return;
    const total = update.total;
    const completed = update.completed;
    if (typeof total === 'number' && Number.isFinite(total) && total > 0 && typeof completed === 'number' && Number.isFinite(completed)) {
      latestProgress = Math.min(100, Math.max(0, (completed / total) * 100));
    }
    if (status.toLowerCase() === 'success') {
      latestProgress = 100;
      isSuccessful = true;
    }
    onProgress({ status, progress: latestProgress });
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(processLine);
    }

    buffer += decoder.decode();
    processLine(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!isSuccessful) throw new Error('The model download ended before Ollama reported success.');
}

export async function deleteOllamaModel(modelName: string): Promise<void> {
  const response = await fetch('http://localhost:11434/api/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete model: ${getResponseError(await response.text(), response.status)}`);
  }
}
