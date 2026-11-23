import { Component, Event, EventEmitter, h, Listen, Prop } from '@stencil/core';
import { Alert } from '../../services/alert.service';
import { formatTime } from '../../utils/utils';
import { storeService } from '../../store/store';
import state from '../../store/store';
import { Conversation, OllamaModel, ThinkingLevel } from '../../types/interfaces';

@Component({
  tag: 'localmind-project-view',
  styleUrl: 'localmind-project-view.css',
  shadow: true,
})
export class LocalMindProjectView {
  @Prop() models!: OllamaModel[];
  @Prop() selectedModel!: OllamaModel;
  @Prop() requestIsPending!: boolean;
  @Prop() isWritingAnswer!: boolean;
  @Prop() ollamaRunning!: boolean;
  @Prop() thinkingLevel: ThinkingLevel = 'off';

  renameModalEl!: HTMLLocalmindRenameModalElement;
  deleteModalEl!: HTMLLocalmindDeleteModalElement;
  sourcesModalEl!: HTMLLocalmindProjectSourcesModalElement;

  @Event({ bubbles: true, composed: true }) conversationChangeEvent!: EventEmitter<void>;

  async loadConversation(id: string) {
    try {
      this.conversationChangeEvent.emit();
      await storeService.switchConversation(id, state.activeProjectId);
    } catch (error) {
      Alert.error(`Error loading conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Listen('renameConfirm')
  async handleRenameConfirm(event: CustomEvent<{ id: string; newName: string }>) {
    try {
      await storeService.renameConversation(event.detail.id, event.detail.newName);
    } catch (error) {
      Alert.error(`Failed to rename conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Listen('deleteConfirm')
  async handleDeleteConfirm(event: CustomEvent<string>) {
    try {
      if (state.activeConversationId === event.detail) {
        this.conversationChangeEvent.emit();
      }
      await storeService.deleteConversation(event.detail);
    } catch (error) {
      Alert.error(`Failed to delete conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  openRename(conversation: Conversation) {
    this.renameModalEl?.show(conversation.id, conversation.name);
  }

  openDelete(conversation: Conversation) {
    this.deleteModalEl?.show(conversation.id, conversation.name);
  }

  renderMenu(conversation: Conversation) {
    return (
      <sl-dropdown placement="bottom-end" class="options-dropdown" onClick={(event: Event) => event.stopPropagation()}>
        <sl-icon-button slot="trigger" name="three-dots-vertical" label="Options"></sl-icon-button>
        <sl-menu>
          <sl-menu-item onClick={() => this.openRename(conversation)}>
            <sl-icon slot="prefix" name="pencil"></sl-icon>
            Rename
          </sl-menu-item>
          <sl-menu-item onClick={() => this.openDelete(conversation)}>
            <sl-icon slot="prefix" name="trash"></sl-icon>
            Delete
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    );
  }

  render() {
    const project = state.projects.find(item => item.id === state.activeProjectId);

    return (
      <section class="project-view">
        <header class="project-header">
          <div class="project-heading">
            <div class="project-badge">
              <sl-icon name="journal-bookmark-fill"></sl-icon>
            </div>
            <h1>{project?.name ?? 'Project'}</h1>
          </div>
          <sl-button class="add-sources" pill onClick={() => this.sourcesModalEl?.show()}>
            <sl-icon name="plus-lg" slot="prefix"></sl-icon>
            Add sources
            {state.activeProjectSources.length > 0 && <span class="source-count">{state.activeProjectSources.length}</span>}
          </sl-button>
        </header>

        <localmind-composer
          inline={true}
          models={this.models}
          selectedModel={this.selectedModel}
          chatHistory={state.activeMessages}
          requestIsPending={this.requestIsPending}
          isWritingAnswer={this.isWritingAnswer}
          ollamaRunning={this.ollamaRunning}
          thinkingLevel={this.thinkingLevel}
        ></localmind-composer>

        <section class="project-chats">
          <h2>Previous chats</h2>
          {state.projectConversations.length ? (
            <div class="project-chat-list">
              {state.projectConversations.map(conversation => (
                <div
                  class={{ 'project-chat': true, active: conversation.id === state.activeConversationId }}
                  key={conversation.id}
                  onClick={() => this.loadConversation(conversation.id)}
                >
                  <div class="chat-summary">
                    <sl-icon name="chat-dots"></sl-icon>
                    <span class="chat-title" title={conversation.name}>
                      {conversation.name}
                    </span>
                    <span class="chat-time">{formatTime(conversation.updatedAt)}</span>
                  </div>
                  {this.renderMenu(conversation)}
                </div>
              ))}
            </div>
          ) : (
            <div class="empty-state">
              <sl-icon name="chat-dots"></sl-icon>
              <p>Chats in this project will appear here</p>
            </div>
          )}
        </section>

        <localmind-rename-modal ref={element => (this.renameModalEl = element as HTMLLocalmindRenameModalElement)}></localmind-rename-modal>
        <localmind-delete-modal ref={element => (this.deleteModalEl = element as HTMLLocalmindDeleteModalElement)}></localmind-delete-modal>
        <localmind-project-sources-modal
          ref={element => (this.sourcesModalEl = element as HTMLLocalmindProjectSourcesModalElement)}
        ></localmind-project-sources-modal>
      </section>
    );
  }
}
