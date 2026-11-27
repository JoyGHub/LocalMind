import type { MapWidgetData } from '../utils/utility';

export interface Message {
  id: string;
  conversationId?: string;
  role: Role;
  content: string;
  timestamp: number;
  modelUsed?: OllamaModel | null;
  generationStats?: MessageGenerationStats;
  tool_calls?: ToolCall[];
  parts?: MessagePart[];
  name?: string;
  thinking?: string;
  attachment?: {
    name: string;
    size?: string;
    url: string;
    type: string;
    prompt?: string;
    modelName?: string;
    width?: number;
    height?: number;
    seed?: number;
  };
  images?: string[];
  attachedFiles?: {
    name: string;
    size: number;
    type: string;
  }[];
  mapWidgets?: MapWidgetData[];
  hiddenContext?: string;
  workflowId?: string;
}

export interface MessageGenerationStats {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  speedTokensPerSecond?: number;
  speedIsEstimated?: boolean;
  totalDurationSeconds?: number;
  ttftSeconds?: number;
  toolSchemaCount: number;
  agentRounds: number;
  toolCalls: number;
}

type Role = 'user' | 'assistant' | 'tool' | 'system';

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high';

export interface ToolCall {
  id?: string;
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export type MessagePart =
  | { type: 'thinking'; content: string }
  | { type: 'text'; content: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'map'; mapData: MapWidgetData };

export interface AlertOptions {
  message: string;
  variant?: AlertVariant;
  icon?: string;
  duration?: number;
  closable?: boolean;
}

type AlertVariant = 'primary' | 'success' | 'neutral' | 'warning' | 'danger';

export interface OllamaModel {
  details: any;
  digest: string;
  formattedSize: string;
  label: string;
  model: string;
  modified_at: string;
  size: number;
  capabilities: string[];
}

export interface OllamaModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModelInfoResponse {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  details?: OllamaModelDetails;
  modelinfo?: Record<string, any>;
  capabilities?: string[];
}

export interface Conversation {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isTemporary: boolean;
  projectId?: string | null;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSource {
  id: string;
  projectId: string;
  type: 'file' | 'link' | 'text';
  title: string;
  content: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: number;
}

export interface AppSetting {
  key: string;
  value: any;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: number;
}

export interface LocalMindState {
  conversations: Conversation[];
  projects: Project[];
  activeProjectSources: ProjectSource[];
  projectConversations: Conversation[];
  activeProjectId: string | null;
  activeConversationId: string | null;
  activeMessages: Message[];
  isGenerating: boolean;
  isTemporaryChat: boolean;
}

export interface LocalMindSettings {
  language: string;
  defaultModel: string;
  theme: string;
  temperature: number;
  top_p: number;
  top_k: number;
  contextWindow: number;
  maxTokens: number;
  instructions: string[];
  accentColor: string;
  saveMemories: boolean;
  readMemories: boolean;
  thinkingLevel: ThinkingLevel;
  imageGenEnabled: boolean;
  defaultImageModel: string;
  unloadLlmBeforeImageGen: boolean;
  imageGenBackend: ImageGenBackendType;
}

export type ImageGenBackendType = 'auto' | 'cuda' | 'vulkan' | 'metal' | 'cpu';

export interface ImageGenInstallProgress {
  status: 'idle' | 'installing' | 'error';
  stage: 'fetching_release' | 'downloading' | 'extracting' | 'completed' | 'error' | 'idle';
  percent: number;
  message: string;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string | null;
}

export interface ImageGenModelDownloadProgress {
  modelId: string;
  stage: 'downloading' | 'completed' | 'error';
  fileIndex: number;
  totalFiles: number;
  fileName: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
  error?: string;
}

export interface ImageGenEngineStatus {
  backendOnline: boolean;
  installed: boolean;
  version: string | null;
  backend: string | null;
  detectedBackend: ImageGenBackendType;
  availableBackends: ImageGenBackendType[];
  platform: string;
  installPath: string;
  repoUrl: string;
  installState: ImageGenInstallProgress;
}

export interface ImageGenModel {
  id: string;
  name: string;
  family: string;
  description: string;
  minVramGb: number;
  sizeLabel: string;
  estimatedSizeBytes: number;
  tags: string[];
  defaultSteps: number;
  defaultCfg: number;
  defaultResolution: string;
  installed: boolean;
  isCustom: boolean;
}

export interface ImageGenModelsResponse {
  models: ImageGenModel[];
  modelsDir: string;
  installedCount: number;
}

export interface ImageGenRequest {
  prompt: string;
  negative_prompt?: string;
  model_id?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
  unload_ollama?: boolean;
  ollama_model?: string;
}

export interface ImageGenResult {
  imageId: string;
  fileName: string;
  imageUrl: string;
  prompt: string;
  modelId: string;
  modelName: string;
  width: number;
  height: number;
  steps: number;
  seed: number;
}
