export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      { type: string; description: string; enum?: string[]; items?: { type: string } }
    >;
    required: string[];
  };
  execute: (args: any, context?: ToolExecutionContext) => Promise<any>;
}

export interface ToolExecutionContext {
  messageId?: string;
  signal?: AbortSignal;
}
