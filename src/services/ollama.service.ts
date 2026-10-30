import { Message, OllamaModel, OllamaModelInfoResponse } from '../types/interfaces';

export type OllamaThinkValue = boolean | 'low' | 'medium' | 'high';

export interface OllamaChatOptions {
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  num_predict: number;
}

class OllamaService {
  proxyUrl = 'http://localhost:5000/api';

  async chat(
    model: string,
    messages: Message[],
    think: OllamaThinkValue,
    tools?: any[],
    signal?: AbortSignal,
    options?: OllamaChatOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    if (!messages.length) {
      throw new Error('No messages provided');
    }

    const cleanedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
      ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
      ...(msg.name ? { name: msg.name } : {}),
      ...(msg.images && msg.images.length > 0 ? { images: msg.images } : {}),
    }));

    const response = await fetch(`${this.proxyUrl}/chat`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: cleanedMessages,
        ...(tools && tools.length > 0 ? { tools } : {}),
        think,
        ...(options ? { options } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy Chat Error: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty.');
    }

    return response.body;
  }

  async getInstalledModels(): Promise<{ models: OllamaModel[] }> {
    const response = await fetch(`${this.proxyUrl}/models`);

    if (!response.ok) throw new Error(`Fetch Models Error: ${response.statusText}`);

    return response.json();
  }

  async downloadModel(model: string): Promise<ReadableStream | null> {
    const response = await fetch(`${this.proxyUrl}/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });

    if (!response.ok) throw new Error(`Pull Model Error: ${response.statusText}`);

    return response.body;
  }

  async deleteModel(model: string): Promise<boolean> {
    const response = await fetch(`${this.proxyUrl}/models`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });

    return response.ok;
  }

  async getModelInfo(model: string, verbose?: boolean): Promise<OllamaModelInfoResponse | null> {
    const requestBody: { model: string; verbose?: boolean } = { model };

    if (verbose !== undefined) {
      requestBody.verbose = verbose;
    }

    try {
      const response = await fetch(`${this.proxyUrl}/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`Failed to fetch model info: ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Network error while fetching model info:', error);
      return null;
    }
  }
}

export const ollamaService = new OllamaService();
