import { Component, State, Element, Listen, h } from '@stencil/core';
import { bytesToGbMb } from '../../utils/utils';
import { ollamaService } from '../../services/ollama.service';
import { Alert } from '../../services/alert.service';
import { Message, OllamaModel, ThinkingLevel } from '../../types/interfaces';
import { attachmentService } from '../../services/attachment.service';
import state, { storeService } from '../../store/store';
import { NotificationService } from '../../services/notification.service';
import { chatService } from '../../services/chat.service';
import { settingsService, settingsState } from '../../services/settings.service';
import type { MapWidgetEventDetail } from '../../utils/utility';

@Component({
  tag: 'localmind-app',
  styleUrl: 'localmind-app.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindApp {
  @Element() el!: HTMLElement;

  @State() promptText: string = '';
  @State() models: OllamaModel[] = [];
  @State() selectedModel!: OllamaModel;
  @State() requestIsPending!: boolean;
  @State() isWritingAnswer!: boolean;
  @State() thinkingLevel: ThinkingLevel = 'off';
  @State() useWebSearch: boolean = false;
  @State() isAppReady: boolean = false;
  @State() showSplash: boolean = true;

  requestId = 0;
  ollamaRunning!: boolean;
  pollInterval: any;
  listenCardEl: any;
  modelsCardEl: any;

  @Listen('promptEvent')
  async handlePromptEvent(event: CustomEvent<{ text: string; files: File[] }>) {
    if (!this.selectedModel) {
      Alert.error('Please select a model first.');
      return;
    }

    const finalPrompt = event.detail.text;
    const files = event.detail.files;
    const requestId = ++this.requestId;
    let attachedImages: string[] = [];
    let attachedFilesData: { name: string; size: number; type: string }[] = [];
    let hiddenContext: string | undefined = undefined;

    this.requestIsPending = true;
    try {
      if (!state.activeConversationId && !state.isTemporaryChat) {
        // Fallback name for new chats if the user sent files without text
        await storeService.createNewConversation(finalPrompt || 'File Analysis');
      }
      if (requestId !== this.requestId) return;

      if (files && files.length > 0) {
        attachedFilesData = files.map(f => ({ name: f.name, size: f.size, type: f.type }));

        const processed = await attachmentService.processAttachments(files);
        if (requestId !== this.requestId) return;

        if (processed.textContext) {
          hiddenContext = processed.textContext;
        }
        attachedImages = processed.images;
      }

      await chatService.addMessage(finalPrompt, true, undefined, {
        images: attachedImages.length > 0 ? attachedImages : undefined,
        attachedFiles: attachedFilesData.length > 0 ? attachedFilesData : undefined,
        hiddenContext: hiddenContext
      });
      if (requestId !== this.requestId) return;

      this.isWritingAnswer = true;

      await chatService.executeWorkflow(this.selectedModel, this.thinkingLevel, this.useWebSearch, () => {
        if (requestId !== this.requestId) return;
        this.requestIsPending = false;
        this.isWritingAnswer = false;
      });
    } catch (error) {
      if (requestId === this.requestId) {
        Alert.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (requestId === this.requestId) {
        this.requestIsPending = false;
        this.isWritingAnswer = false;
      }
    }
  }

  @Listen('cancelGenerationEvent')
  handleCancelGenerationEvent() {
    this.cancelActiveRequest();
  }

  @Listen('mapWidgetEvent', { target: 'window' })
  async handleMapWidgetEvent(event: CustomEvent<MapWidgetEventDetail>) {
    try {
      await storeService.appendMapWidgetToMessage(event.detail.messageId, event.detail.mapData);
    } catch (error) {
      Alert.error(`Could not save map results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  cancelActiveRequest() {
    this.requestId++;
    chatService.cancelWorkflow();
    this.requestIsPending = false;
    this.isWritingAnswer = false;
  }

  handleMainWheel(event: WheelEvent) {
    const scrollableTarget = event.composedPath().find(
      target =>
        target instanceof HTMLElement &&
        target !== event.currentTarget &&
        getComputedStyle(target).overflowY !== 'visible' &&
        target.scrollHeight > target.clientHeight &&
        (event.deltaY < 0 ? target.scrollTop > 0 : target.scrollTop + target.clientHeight < target.scrollHeight),
    );
    if (scrollableTarget) return;

    const messages = this.el.shadowRoot?.querySelector<HTMLElement>('.messages');
    if (messages) {
      messages.scrollTop += event.deltaY;
    }
  }

  @Listen('modelSelectedEvent')
  handleModelSelectedEvent(event: CustomEvent<OllamaModel>) {
    this.selectedModel = event.detail;
  }

  @Listen('modelsUpdatedEvent')
  handleModelsUpdatedEvent() {
    this.getInstalledModels();
  }

  @Listen('listenRequestedEvent')
  handleListenRequested(event: CustomEvent<{ text: string }>) {
    this.listenCardEl.show(event.detail?.text ?? '');
  }

  @Listen('retryRequestedEvent')
  async handleRetryRequested(event: CustomEvent<string>) {
    await this.retryMessage(event.detail);
  }

  @Listen('modelsCardEvent')
  handleModelsCardEvent() {
    this.modelsCardEl.show();
  }

  @Listen('thinkLevelEvent')
  handleThinkLevelEvent(event: CustomEvent<ThinkingLevel>) {
    this.thinkingLevel = event.detail;
    settingsService.updateSetting('thinkingLevel', event.detail);
    settingsService.saveSettings();
  }

  @Listen('webSearchToggleEvent')
  handleWebSearchToggleEvent(event: CustomEvent<boolean>) {
    this.useWebSearch = event.detail;
  }

  @Listen('newChatEvent')
  handleNewChatEvent() {
    this.cancelActiveRequest();
    this.applyDefaultModel();
  }

  @Listen('tempChatEvent')
  handleTempChatEvent() {
    this.cancelActiveRequest();
    this.applyDefaultModel();
  }

  @Listen('conversationChangeEvent')
  handleConversationChangeEvent() {
    this.cancelActiveRequest();
  }

  componentWillLoad() {
    this.initializeLocalMind();
  }

  async retryMessage(messageId: string) {
    if (!this.selectedModel) {
      Alert.error('Please select a model first.');
      return;
    }

    if (!state.activeConversationId) {
      Alert.error('Start a conversation before retrying.');
      return;
    }

    const targetMessage = state.activeMessages.find(msg => msg.id === messageId);
    if (!targetMessage) {
      Alert.error('The selected response could not be found.');
      return;
    }

    if (targetMessage.role !== 'assistant') {
      Alert.error('Only assistant replies can be retried.');
      return;
    }

    const lastAssistantMessage = [...state.activeMessages].reverse().find(msg => msg.role === 'assistant');
    if (targetMessage.workflowId ? lastAssistantMessage?.workflowId !== targetMessage.workflowId : lastAssistantMessage?.id !== messageId) {
      Alert.error('You can only retry the most recent assistant reply.');
      return;
    }

    const requestId = ++this.requestId;
    if (this.requestIsPending || this.isWritingAnswer) {
      chatService.cancelWorkflow();
    }

    const messagesToRemove = targetMessage.workflowId
      ? state.activeMessages.filter(message => message.workflowId === targetMessage.workflowId)
      : [targetMessage];

    for (const message of messagesToRemove) {
      storeService.removeMessageFromUI(message.id);
      await storeService.removeMessageFromDB(message.id);
      if (requestId !== this.requestId) return;
    }

    if (requestId !== this.requestId) return;
    this.requestIsPending = true;
    this.isWritingAnswer = true;

    await chatService.retryAssistantResponse(messageId, this.selectedModel, this.thinkingLevel, this.useWebSearch, () => {
      if (requestId !== this.requestId) return;
      this.requestIsPending = false;
      this.isWritingAnswer = false;
    });
  }

  async initializeLocalMind() {
    this.thinkingLevel = settingsState.thinkingLevel;
    await storeService.initApp();
    await this.getInstalledModels();
    await NotificationService.requestPermission();

    this.applyDefaultModel();

    setTimeout(() => {
      this.isAppReady = true;

      setTimeout(() => {
        this.showSplash = false;
      }, 0);
    }, 0);
  }

  disconnectedCallback() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  applyDefaultModel() {
    if (settingsState.defaultModel && this.models) {
      const defaultM = this.models.find(m => m.model === settingsState.defaultModel);
      if (defaultM) {
        this.selectedModel = defaultM;
        return;
      }
    }

    if (this.models && this.models.length > 0) {
      this.selectedModel = this.models[0];
    }
  }

  async getInstalledModels() {
    try {
      const modelsResponse = await ollamaService.getInstalledModels();
      this.ollamaRunning = true;

      this.models = await Promise.all(
        modelsResponse.models.map(async (model: OllamaModel) => {
          const info = await ollamaService.getModelInfo(model.model);
          const size = bytesToGbMb(model.size);

          return {
            ...model,
            capabilities: info?.capabilities ?? [],
            formattedSize: size,
            label: `${model.model} | ${size}`,
          };
        }),
      );
    } catch (error: any) {
      this.ollamaRunning = false;
      this.models = [];
      Alert.error(error);
    }
  }

  getDisplayMessages(): Message[] {
    const displayMessages: Message[] = [];

    for (const message of state.activeMessages) {
      if (message.role === 'tool') {
        continue;
      }

      if (message.role === 'assistant' && message.workflowId) {
        const groupedMessage = displayMessages.find(item => item.workflowId === message.workflowId);
        if (groupedMessage) {
          if (message.content) {
            groupedMessage.content += groupedMessage.content ? `\n\n${message.content}` : message.content;
          }
          if (message.thinking) {
            groupedMessage.thinking = groupedMessage.thinking ? `${groupedMessage.thinking}\n\n${message.thinking}` : message.thinking;
          }
          if (message.tool_calls?.length) {
            groupedMessage.tool_calls = [...(groupedMessage.tool_calls ?? []), ...message.tool_calls];
          }
          if (message.generationStats) {
            groupedMessage.generationStats = message.generationStats;
          }
          if (message.attachment) {
            groupedMessage.attachment = message.attachment;
          }
          groupedMessage.timestamp = message.timestamp;
          continue;
        }
      }

      if (message.content.trim() !== '' || message.thinking || message.attachment || (message.tool_calls && message.tool_calls.length > 0) || (message.attachedFiles && message.attachedFiles.length > 0)) {
        displayMessages.push({ ...message });
      }
    }

    return displayMessages;
  }

  render() {
    const displayableMessages = this.getDisplayMessages();

    return (
      <div class="wrapper">
        {this.showSplash && <localmind-splash isReady={this.isAppReady}></localmind-splash>}
        <localmind-attachment-overlay></localmind-attachment-overlay>
        <localmind-sidebar models={this.models} ollamaRunning={this.ollamaRunning}></localmind-sidebar>
        <main class="content" onWheel={event => this.handleMainWheel(event)}>
          <localmind-temp-conv-card isActive={state.isTemporaryChat}></localmind-temp-conv-card>
          <div class="current-chat">
            <div class="messages">
              <div class="messages-content">
                {displayableMessages.map((message, index) => (
                  <localmind-message
                    key={message.id}
                    message={message}
                    isWritingAnswer={this.isWritingAnswer && index === displayableMessages.length - 1 && message.role === 'assistant'}
                    isLastMessage={index === displayableMessages.length - 1}
                  />
                ))}
                <localmind-request-spinner requestIsPending={this.requestIsPending}></localmind-request-spinner>
              </div>
              <div class="bottom-fade"></div>
            </div>
          </div>
          <localmind-composer
            models={this.models}
            selectedModel={this.selectedModel}
            chatHistory={state.activeMessages}
            requestIsPending={this.requestIsPending}
            isWritingAnswer={this.isWritingAnswer}
            ollamaRunning={this.ollamaRunning}
            thinkingLevel={this.thinkingLevel}
          ></localmind-composer>
        </main>
        <localmind-listen-card ref={el => (this.listenCardEl = el)}></localmind-listen-card>
        <localmind-models ref={el => (this.modelsCardEl = el)} models={this.models}></localmind-models>
      </div>
    );
  }
}
