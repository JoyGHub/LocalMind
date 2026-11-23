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
        let toolMessage: Message | undefined;
        const publishProgress = (progress: unknown) => {
          const content = JSON.stringify(progress ?? null);
          if (toolMessage) {
            storeService.updateMessageInUI(toolMessage.id, { content });
            return;
          }

          toolMessage = {
            id: nanoid(),
            conversationId,
            role: 'tool',
            name: call.function.name,
            content,
            timestamp: Date.now(),
            workflowId,
          };
          storeService.pushMessageToUI(toolMessage);
        };
        const toolResult = await targetTool.execute(call.function.arguments, {
          messageId: callingMessage?.id,
          signal,
          onProgress: publishProgress,
        });
        if (signal?.aborted) return detectedAttachment;

        if (toolResult.attachment) {
          detectedAttachment = await llmAttachmentService.processGeneratedAttachment(toolResult.attachment);
          if (signal?.aborted) return detectedAttachment;
        }

        const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
        if (toolMessage) {
          storeService.updateMessageInUI(toolMessage.id, { content, timestamp: Date.now() });
          const completedToolMessage = state.activeMessages.find(message => message.id === toolMessage?.id);
          if (completedToolMessage) await storeService.commitMessageToDB(completedToolMessage);
        } else {
          const completedToolMessage: Message = {
            id: nanoid(),
            conversationId,
            role: 'tool',
            name: call.function.name,
            content,
            timestamp: Date.now(),
            workflowId,
          };
          storeService.pushMessageToUI(completedToolMessage);
          await storeService.commitMessageToDB(completedToolMessage);
        }
      }
    }

    return detectedAttachment;
  }
}

export const toolService = new ToolService();
