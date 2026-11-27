import {
  ImageGenBackendType,
  ImageGenEngineStatus,
  ImageGenInstallProgress,
  ImageGenModelDownloadProgress,
  ImageGenModelsResponse,
  ImageGenRequest,
  ImageGenResult,
} from '../types/interfaces';
import { settingsState } from './settings.service';

const IDLE_INSTALL_STATE: ImageGenInstallProgress = {
  status: 'idle',
  stage: 'idle',
  percent: 0,
  message: '',
  error: null,
};

class ImageGenService {
  readonly baseUrl = 'http://localhost:5000';
  private proxyUrl = `${this.baseUrl}/api/image-gen`;

  async generateImage(request: ImageGenRequest): Promise<ImageGenResult> {
    const response = await fetch(`${this.proxyUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        model_id: request.model_id || settingsState.defaultImageModel || undefined,
        unload_ollama: settingsState.unloadLlmBeforeImageGen,
        ...(settingsState.unloadLlmBeforeImageGen ? { ollama_model: request.ollama_model } : {}),
      }),
    });

    const body = await response.text();
    let payload: any = null;
    try {
      payload = body ? JSON.parse(body) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(payload?.error || body || `Image generation failed (${response.status}).`);
    }
    if (!payload?.imageUrl) {
      throw new Error('Image generation returned no image.');
    }

    return {
      ...payload,
      imageUrl: payload.imageUrl.startsWith('http')
        ? payload.imageUrl
        : `${this.baseUrl}${payload.imageUrl}`,
    } as ImageGenResult;
  }

  private fallbackStatus(): ImageGenEngineStatus {
    return {
      backendOnline: false,
      installed: false,
      version: null,
      backend: null,
      detectedBackend: 'auto',
      availableBackends: ['auto', 'cuda', 'vulkan', 'metal', 'cpu'],
      platform: '',
      installPath: 'modules/image-gen/sdcpp',
      repoUrl: 'https://github.com/leejet/stable-diffusion.cpp',
      installState: { ...IDLE_INSTALL_STATE },
    };
  }

  async getStatus(): Promise<ImageGenEngineStatus> {
    try {
      const response = await fetch(`${this.proxyUrl}/status`);
      if (!response.ok) return this.fallbackStatus();
      return await response.json();
    } catch (error) {
      console.warn('Image generation backend is unavailable:', error);
      return this.fallbackStatus();
    }
  }

  async installEngine(
    backend: ImageGenBackendType,
    onProgress?: (progress: ImageGenInstallProgress) => void,
  ): Promise<ImageGenEngineStatus> {
    const response = await fetch(`${this.proxyUrl}/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backend }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Image engine install failed (${response.status}).`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processEvent = (eventText: string) => {
        const dataLines = eventText
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .filter(Boolean);
        if (!dataLines.length) return;

        try {
          const payload = JSON.parse(dataLines.join('\n')) as Partial<ImageGenInstallProgress> & {
            installState?: ImageGenInstallProgress;
          };
          const progress = payload.installState || (payload as ImageGenInstallProgress);
          if (progress && typeof progress === 'object') onProgress?.(progress);
        } catch {
          // Ignore malformed SSE frames and keep the stream alive.
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          processEvent(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
        }
      }
      if (buffer.trim()) processEvent(buffer);
    } else {
      const text = await response.text();
      if (text) {
        try {
          const payload = JSON.parse(text) as Partial<ImageGenInstallProgress> & {
            installState?: ImageGenInstallProgress;
          };
          const progress = payload.installState || (payload as ImageGenInstallProgress);
          if (progress.status) onProgress?.(progress as ImageGenInstallProgress);
        } catch {
          // Standard JSON responses are optional to carry progress.
        }
      }
    }

    return this.getStatus();
  }

  async uninstallEngine(): Promise<void> {
    const response = await fetch(`${this.proxyUrl}/install`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Image engine uninstall failed (${response.status}).`);
    }
  }

  async getModels(): Promise<ImageGenModelsResponse> {
    try {
      const response = await fetch(`${this.proxyUrl}/models`);
      if (!response.ok) {
        return { models: [], modelsDir: 'models/image', installedCount: 0 };
      }
      return await response.json();
    } catch (error) {
      console.warn('Unable to fetch image generation models:', error);
      return { models: [], modelsDir: 'models/image', installedCount: 0 };
    }
  }

  async downloadModel(
    modelId: string,
    onProgress?: (progress: ImageGenModelDownloadProgress) => void,
  ): Promise<void> {
    const response = await fetch(
      `${this.proxyUrl}/models/${encodeURIComponent(modelId)}/download`,
      { method: 'POST' },
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Image model download failed (${response.status}).`);
    }

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processEvent = (eventText: string) => {
        const dataLines = eventText
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .filter(Boolean);
        if (!dataLines.length) return;
        try {
          const progress = JSON.parse(dataLines.join('\n')) as ImageGenModelDownloadProgress;
          onProgress?.(progress);
        } catch {
          // Ignore malformed SSE frames and keep the stream alive.
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          processEvent(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
        }
      }
      if (buffer.trim()) processEvent(buffer);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    const response = await fetch(
      `${this.proxyUrl}/models/${encodeURIComponent(modelId)}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Image model delete failed (${response.status}).`);
    }
  }
}

export const imageGenService = new ImageGenService();
