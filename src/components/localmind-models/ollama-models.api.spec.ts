import { afterEach, describe, expect, it } from '@jest/globals';
import { installOllamaModel } from './ollama-models.api';

describe('installOllamaModel', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses newline-delimited updates split across stream chunks', async () => {
    const chunks = [
      '{"status":"pulling model","completed":25,"total":100}\n{"sta',
      'tus":"success"}\n',
    ];
    const reader = {
      read: async () => {
        const chunk = chunks.shift();
        return chunk
          ? { done: false, value: new TextEncoder().encode(chunk) }
          : { done: true, value: undefined };
      },
      releaseLock: () => undefined,
    };
    globalThis.fetch = async () =>
      ({
        ok: true,
        body: { getReader: () => reader },
      }) as unknown as Response;
    const updates: Array<{ status: string; progress: number }> = [];

    await installOllamaModel('llama3.1', update => updates.push(update));

    expect(updates).toEqual([
      { status: 'pulling model', progress: 25 },
      { status: 'success', progress: 100 },
    ]);
  });

  it('rejects a stream that ends before Ollama reports success', async () => {
    const reader = {
      read: async () => ({ done: true, value: undefined }),
      releaseLock: () => undefined,
    };
    globalThis.fetch = async () =>
      ({
        ok: true,
        body: { getReader: () => reader },
      }) as unknown as Response;

    await expect(installOllamaModel('llama3.1', () => undefined)).rejects.toThrow(
      'The model download ended before Ollama reported success.',
    );
  });

  it('rejects valid JSON that is not a progress object', async () => {
    const chunks = ['null\n'];
    const reader = {
      read: async () => {
        const chunk = chunks.shift();
        return chunk
          ? { done: false, value: new TextEncoder().encode(chunk) }
          : { done: true, value: undefined };
      },
      releaseLock: () => undefined,
    };
    globalThis.fetch = async () =>
      ({
        ok: true,
        body: { getReader: () => reader },
      }) as unknown as Response;

    await expect(installOllamaModel('llama3.1', () => undefined)).rejects.toThrow(
      'Ollama returned an invalid installation progress response.',
    );
  });
});
