import { nanoid } from 'nanoid';
import { Message, ToolCall } from '../types/interfaces';
import { toolRegistry } from './tools';
import state, { storeService } from '../store/store';
import { llmAttachmentService } from './llm-attachment.service';

export class ToolService {
  async executeToolCalls(toolCalls: ToolCall[], conversationId: string, workflowId?: string, signal?: AbortSignal): Promise<any> {
    let detectedAttachment: any = null;

    for (const call of toolCalls) {
      if (signal?.aborted) return detectedAttachment;
      const targetTool = toolRegistry.get(call.function.name);

      if (targetTool) {
        const callingMessage = state.activeMessages.find(
          message => message.role === 'assistant' && message.workflowId === workflowId,
        );
        const toolResult = await targetTool.execute(call.function.arguments, {
          messageId: callingMessage?.id,
          signal,
        });
        if (signal?.aborted) return detectedAttachment;

        if (toolResult.attachment) {
          detectedAttachment = await llmAttachmentService.processGeneratedAttachment(toolResult.attachment);
          if (signal?.aborted) return detectedAttachment;
        }

        const toolMessage: Message = {
          id: nanoid(),
          conversationId: conversationId,
          role: 'tool',
          name: call.function.name,
          content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          timestamp: Date.now(),
          workflowId,
        };

        storeService.pushMessageToUI(toolMessage);
        await storeService.commitMessageToDB(toolMessage);
      }
    }

    return detectedAttachment;
  }
}

export const toolService = new ToolService();
