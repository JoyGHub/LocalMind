import { nanoid } from 'nanoid';
import { Message, MessageGenerationStats, OllamaModel, ThinkingLevel, ToolCall } from '../types/interfaces';
import { ollamaService } from './ollama.service';
import { getOllamaToolsSchema } from './tools';
import { toolService } from './tool.service';
import state, { storeService } from '../store/store';
import { NotificationService } from './notification.service';
import { Alert } from './alert.service';
import { settingsState } from './settings.service';

interface ChatStreamResult {
  toolCalls: ToolCall[];
  doneReason?: string;
  generationMetrics: Partial<Pick<MessageGenerationStats, 'model' | 'inputTokens' | 'outputTokens' | 'totalTokens' | 'speedTokensPerSecond' | 'speedIsEstimated' | 'totalDurationSeconds' | 'ttftSeconds'>>;
}

export class ChatService {
  private autoScrollEnabled = true;
  private trackedScrollContainers = new WeakSet<HTMLElement>();
  chatController!: AbortController | null;

  cancelWorkflow() {
    const controller = this.chatController;
    this.chatController = null;
    controller?.abort();
  }

  async retryAssistantResponse(_messageId: string, model: OllamaModel, thinkingLevel: ThinkingLevel, useWebSearch: boolean, onComplete: () => void): Promise<void> {
    if (this.chatController) {
      this.chatController.abort();
      this.chatController = null;
    }

    await this.executeWorkflow(model, thinkingLevel, useWebSearch, onComplete);
  }

  async executeWorkflow(model: OllamaModel, thinkingLevel: ThinkingLevel, useWebSearch: boolean, onComplete: () => void): Promise<void> {
    const workflowStartedAt = performance.now();
    const hasThinking = model.capabilities?.includes('thinking');
    const hasTools = model.capabilities?.includes('tools');

    const activeThinkSetting = hasThinking && thinkingLevel !== 'off' ? thinkingLevel : false;
    const activeToolsSchema = hasTools ? getOllamaToolsSchema() : undefined;

    const controller = new AbortController();
    this.chatController = controller;
    const conversationId = state.activeConversationId;
    const workflowId = nanoid();
    let workflowHasOutput = false;
    let detectedAttachment: any = null;
    let continuationAttempts = 0;
    let emptyResponseAttempts = 0;
    let agentRounds = 0;
    let workflowToolCalls = 0;
    let continuationPrompt: string | undefined;
    const instructionText = settingsState.instructions.filter(instruction => instruction.trim().length > 0).join('\n\n');
    const memoryGuidance = [
      settingsState.readMemories
        ? 'When the user asks what you remember about them, asks for all saved memories, or wants a complete overview, call get_all_memories once and report the returned memories. Do not make repeated searches, single-letter/common-word queries, or extra tool calls to check completeness. Use search_memories only for a specific factual question that may match a subset of memories; if it returns no results, report that no matching memory was found without trying broad or alternative queries.'
        : '',
      settingsState.saveMemories
        ? 'When the user explicitly asks you to remember something, or shares a useful stable preference or fact, save a concise memory with add_memory. Do not save sensitive information unless the user explicitly asks.'
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    const combinedInstructions = [instructionText, memoryGuidance].filter(Boolean).join('\n\n');
    const instructionMessage: Message | undefined = combinedInstructions
      ? {
        id: nanoid(),
        role: 'system',
        content: `${combinedInstructions}\n\nApply these instructions throughout the conversation. Acknowledge them internally by following them, but do not mention, quote, or describe them in your first response. Answer the user's message naturally.`,
        timestamp: Date.now(),
      }
      : undefined;

    const maxContinuationAttempts = 3;
    const maxEmptyResponseAttempts = 1;

    try {
      while (true) {
        if (controller.signal.aborted) return;

        const mappedMessages: Message[] = [
          ...(instructionMessage ? [instructionMessage] : []),
          ...state.activeMessages.map(msg => {
            let payloadContent = msg.content;

            if (msg.hiddenContext) {
              payloadContent = `Context:\n${msg.hiddenContext}\n\nUser Question:\n${payloadContent || 'Please analyze the attached files.'}`;
            }

            return { ...msg, content: payloadContent };
          }),
        ];

        const isContinuation = Boolean(continuationPrompt);
        if (continuationPrompt) {
          mappedMessages.push({
            id: nanoid(),
            role: 'user',
            content: continuationPrompt,
            timestamp: Date.now(),
          });
          continuationPrompt = undefined;
        }

        if (useWebSearch && !isContinuation && mappedMessages.length > 0) {
          const lastMsg = mappedMessages[mappedMessages.length - 1];
          if (lastMsg.role === 'user') {
            lastMsg.content += 'The user has enabled Web Search for this prompt. If you think its needed, use search tools to gather up-to-date information before answering.';
          }
        }

        agentRounds++;
        const generationStartedAt = performance.now();
        const chatStream = await ollamaService.chat(
          model.model,
          mappedMessages,
          activeThinkSetting && continuationAttempts === 0 && emptyResponseAttempts === 0 ? activeThinkSetting : false,
          activeToolsSchema,
          controller.signal,
          {
            temperature: settingsState.temperature,
            top_p: settingsState.top_p,
            top_k: settingsState.top_k,
            num_ctx: settingsState.contextWindow,
            num_predict: settingsState.maxTokens,
          },
        );
        if (controller.signal.aborted) return;

        const assistantMessageId = nanoid();
        const assistantMessage: Message = {
          id: assistantMessageId,
          conversationId: conversationId!,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          modelUsed: model,
          workflowId,
        };

        storeService.pushMessageToUI(assistantMessage);

        const streamResult = await this.readChatStream(chatStream, assistantMessageId, controller.signal, generationStartedAt);
        if (controller.signal.aborted) return;
        const toolCallsDetected = streamResult.toolCalls;
        workflowToolCalls += toolCallsDetected.length;
        let finalizedMessage = state.activeMessages.find(m => m.id === assistantMessageId);
        if (finalizedMessage) {
          const generationStats: MessageGenerationStats = {
            ...streamResult.generationMetrics,
            model: streamResult.generationMetrics.model || model.model,
            toolSchemaCount: activeToolsSchema?.length ?? 0,
            agentRounds,
            toolCalls: workflowToolCalls,
          };
          storeService.updateMessageInUI(assistantMessageId, { generationStats });
          finalizedMessage = state.activeMessages.find(m => m.id === assistantMessageId);
        }
        const turnHasOutput = Boolean(finalizedMessage?.content.trim() || toolCallsDetected?.length);
        workflowHasOutput ||= turnHasOutput;

        if (finalizedMessage) {
          await storeService.commitMessageToDB(finalizedMessage);
          if (controller.signal.aborted) return;
        }

        if (toolCallsDetected.length > 0) {
          const attachment = await toolService.executeToolCalls(toolCallsDetected, conversationId!, workflowId, controller.signal);
          if (controller.signal.aborted) return;
          detectedAttachment = attachment ?? detectedAttachment;
          continue;
        }

        if (streamResult.doneReason === 'length') {
          if (continuationAttempts >= maxContinuationAttempts) {
            throw new Error('The response exceeded the model output limit before it could finish. Increase the maximum output tokens and try again.');
          }

          continuationAttempts++;
          continuationPrompt = 'Continue the previous assistant response from where it stopped. Do not repeat completed content. Provide the complete answer now.';
          continue;
        }

        const finalContent = finalizedMessage?.content.trim() ?? '';
        if ((!finalContent || this.isProgressOnlyResponse(finalContent)) && !detectedAttachment) {
          if (emptyResponseAttempts >= maxEmptyResponseAttempts) {
            throw new Error('The model did not produce a user-facing answer. Please try again or use a different model.');
          }

          emptyResponseAttempts++;
          continuationPrompt = 'Provide the completed, user-facing answer now. Do not provide more thinking or progress updates. Use the available conversation and tool results.';
          continue;
        }

        break;
      }

      if (detectedAttachment) {
        const lastWorkflowMessage = [...state.activeMessages].reverse().find(message => message.workflowId === workflowId && message.role === 'assistant');
        if (lastWorkflowMessage) {
          storeService.updateMessageInUI(lastWorkflowMessage.id, { attachment: detectedAttachment });
          const finalizedMessage = state.activeMessages.find(message => message.id === lastWorkflowMessage.id);
          if (finalizedMessage) {
            await storeService.commitMessageToDB(finalizedMessage);
          }
        }
      }
    } catch (error: any) {
      if (controller.signal.aborted || error?.name === 'AbortError') {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      Alert.error(message);
      const lastWorkflowMessage = [...state.activeMessages].reverse().find(item => item.role === 'assistant' && item.workflowId === workflowId);
      const hasWorkflowOutput =
        workflowHasOutput || Boolean(lastWorkflowMessage?.content.trim() || lastWorkflowMessage?.thinking?.trim() || lastWorkflowMessage?.tool_calls?.length);
      workflowHasOutput = hasWorkflowOutput;
      if (hasWorkflowOutput && lastWorkflowMessage) {
        const content = `${lastWorkflowMessage.content}${lastWorkflowMessage.content ? '\n\n' : ''}Error: ${message}`;
        storeService.updateMessageInUI(lastWorkflowMessage.id, { content });
        const updatedMessage = state.activeMessages.find(item => item.id === lastWorkflowMessage.id);
        if (updatedMessage) {
          await storeService.commitMessageToDB(updatedMessage);
        }
      } else {
        await this.addMessage(`Error: ${message}`, false);
      }
    } finally {
      const lastWorkflowMessage = [...state.activeMessages]
        .reverse()
        .find(message => message.role === 'assistant' && message.workflowId === workflowId && message.generationStats);
      if (lastWorkflowMessage?.generationStats) {
        storeService.updateMessageInUI(lastWorkflowMessage.id, {
          generationStats: {
            ...lastWorkflowMessage.generationStats,
            totalDurationSeconds: (performance.now() - workflowStartedAt) / 1000,
          },
        });
        const updatedMessage = state.activeMessages.find(message => message.id === lastWorkflowMessage.id);
        if (updatedMessage) {
          try {
            await storeService.commitMessageToDB(updatedMessage);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Alert.error(`Could not save message timing statistics: ${message}`);
          }
        }
      }

      if (this.chatController === controller) {
        this.chatController = null;
        if (document.hidden && workflowHasOutput) {
          NotificationService.notify('LocalMind', 'The LLM has finished generating your response.');
        }
        onComplete();
      }
    }
  }

  async readChatStream(
    chatStream: ReadableStream<Uint8Array>,
    assistantMessageId: string,
    signal?: AbortSignal,
    startedAt = performance.now(),
  ): Promise<ChatStreamResult> {
    const reader = chatStream.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    let thinkingText = '';
    let accumulatedToolCalls: ToolCall[] = [];
    let lineBuffer = '';
    let doneReason: string | undefined;
    let generationMetrics: ChatStreamResult['generationMetrics'] = {};
    let firstContentAt: number | undefined;

    const readMetric = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined);

    const processLine = (line: string) => {
      if (!line.startsWith('data:')) return;
      const data = line.slice(5).trimStart();
      if (!data) return;

      let json: any;
      try {
        json = JSON.parse(data);
      } catch (error) {
        throw new Error(`Invalid response from the model service: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (json.error) {
        throw new Error(`Model service error: ${json.error}`);
      }

      if (typeof json.done_reason === 'string') {
        doneReason = json.done_reason;
      }

      const inputTokens = readMetric(json.prompt_eval_count);
      const outputTokens = readMetric(json.eval_count);
      const evaluationDuration = readMetric(json.eval_duration);
      const totalDuration = readMetric(json.total_duration);
      const promptEvaluationDuration = readMetric(json.prompt_eval_duration);
      generationMetrics = {
        ...generationMetrics,
        ...(typeof json.model === 'string' && json.model ? { model: json.model } : {}),
        ...(inputTokens !== undefined ? { inputTokens } : {}),
        ...(outputTokens !== undefined ? { outputTokens } : {}),
        ...(inputTokens !== undefined && outputTokens !== undefined ? { totalTokens: inputTokens + outputTokens } : {}),
        ...(outputTokens !== undefined && evaluationDuration !== undefined && evaluationDuration > 0
          ? { speedTokensPerSecond: outputTokens / (evaluationDuration / 1_000_000_000) }
          : {}),
        ...(totalDuration !== undefined ? { totalDurationSeconds: totalDuration / 1_000_000_000 } : {}),
        ...(promptEvaluationDuration !== undefined ? { ttftSeconds: promptEvaluationDuration / 1_000_000_000 } : {}),
      };

      if (json.message?.thinking) {
        thinkingText += json.message.thinking;
        storeService.updateMessageInUI(assistantMessageId, { thinking: thinkingText });
      }

      if (json.message?.content) {
        firstContentAt ??= performance.now();
        responseText += json.message.content;
        storeService.updateMessageInUI(assistantMessageId, { content: responseText });
        this.scrollToBottom();
      }

      if (json.message?.tool_calls) {
        accumulatedToolCalls = [...accumulatedToolCalls, ...json.message.tool_calls];
        storeService.updateMessageInUI(assistantMessageId, { role: 'assistant', tool_calls: accumulatedToolCalls });
      }
    };

    const processChunk = (chunk: string) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        processLine(line);
      }
    };

    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (signal?.aborted) break;
      if (done) {
        processChunk(decoder.decode());
        if (lineBuffer) {
          processLine(lineBuffer);
        }
        break;
      }

      processChunk(decoder.decode(value, { stream: true }));
    }

    if (firstContentAt !== undefined) {
      const completedAt = performance.now();
      const responseDurationSeconds = (completedAt - startedAt) / 1000;
      const generationDurationSeconds = (completedAt - firstContentAt) / 1000;
      const speedOutputTokens = generationMetrics.outputTokens ?? Math.max(1, Math.round(responseText.length / 4));

      generationMetrics = {
        ...generationMetrics,
        ...(generationMetrics.totalDurationSeconds === undefined ? { totalDurationSeconds: responseDurationSeconds } : {}),
        ...(generationMetrics.ttftSeconds === undefined ? { ttftSeconds: (firstContentAt - startedAt) / 1000 } : {}),
        ...(generationMetrics.speedTokensPerSecond === undefined && generationDurationSeconds > 0
          ? {
            speedTokensPerSecond: speedOutputTokens / generationDurationSeconds,
            speedIsEstimated: generationMetrics.outputTokens === undefined,
          }
          : {}),
      };
    }

    return { toolCalls: accumulatedToolCalls, doneReason, generationMetrics };
  }

  private isProgressOnlyResponse(content: string): boolean {
    const paragraphs = content
      .split(/\r?\n+/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean);
    return (
      paragraphs.length > 0 &&
      paragraphs.every(paragraph =>
        /^(?:(?:excellent|great|perfect|good)\b(?:\s+data)?[.!,:-]?\s*)?(?:let me|i['’]ll|i will|i am going to|i['’]m going to|i need to|allow me to)\b/i.test(paragraph),
      )
    );
  }

  async addMessage(content: string, isUser: boolean, modelUsed?: OllamaModel, optionalProps: Partial<Message> = {}) {
    const newMessage: Message = {
      id: nanoid(),
      conversationId: state.activeConversationId!,
      role: isUser ? 'user' : 'assistant',
      content,
      timestamp: Date.now(),
      modelUsed: isUser ? null : modelUsed,
      ...optionalProps,
    };

    storeService.pushMessageToUI(newMessage);
    if (isUser || content !== '') {
      await storeService.commitMessageToDB(newMessage);
    }
    if (isUser) {
      this.autoScrollEnabled = true;
    }
    this.scrollToBottom();
  }

  attachToLastMessage(attachment: any) {
    const lastMessage = state.activeMessages[state.activeMessages.length - 1];
    if (lastMessage) {
      storeService.updateMessageInUI(lastMessage.id, { attachment });
      const updatedFinalMsg = state.activeMessages.find(m => m.id === lastMessage.id);
      if (updatedFinalMsg) storeService.commitMessageToDB(updatedFinalMsg);
    }
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      const messagesContainer = document.querySelector('localmind-app')?.shadowRoot?.querySelector<HTMLElement>('.messages');
      if (!messagesContainer) return;

      if (!this.trackedScrollContainers.has(messagesContainer)) {
        let previousScrollTop = messagesContainer.scrollTop;
        messagesContainer.addEventListener('scroll', () => {
          const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop;
          if (distanceFromBottom <= 2) {
            this.autoScrollEnabled = true;
          } else if (messagesContainer.scrollTop < previousScrollTop) {
            this.autoScrollEnabled = false;
          }
          previousScrollTop = messagesContainer.scrollTop;
        });
        this.trackedScrollContainers.add(messagesContainer);
      }

      if (!this.autoScrollEnabled) return;

      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth',
      });
    });
  }
}

export const chatService = new ChatService();
