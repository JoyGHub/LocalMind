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
  name?: string;
  thinking?: string;
  attachment?: {
    name: string;
    size: string;
    url: string;
    type: string;
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
}
