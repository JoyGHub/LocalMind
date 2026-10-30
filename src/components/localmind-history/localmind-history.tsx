import { Component, h, Listen, Event, EventEmitter } from '@stencil/core';
import state, { storeService } from '../../store/store';
import { Alert } from '../../services/alert.service';
import { formatTime } from '../../utils/utils';

@Component({
  tag: 'localmind-history',
  styleUrl: 'localmind-history.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindHistory {
  @Event({ bubbles: true, composed: true }) conversationChangeEvent!: EventEmitter<void>;

  renameModalEl!: HTMLLocalmindRenameModalElement;
  deleteModalEl!: HTMLLocalmindDeleteModalElement;

  async loadConversation(id: string) {
    try {
      this.conversationChangeEvent.emit();
      await storeService.switchConversation(id);
    } catch (error) {
      Alert.error('Error loading conversation:' + error);
    }
  }

  @Listen('renameConfirm')
  async handleRenameConfirm(event: CustomEvent<{ id: string; newName: string }>) {
    const { id, newName } = event.detail;

    try {
      await storeService.renameConversation(id, newName);
    } catch (error) {
      Alert.error(`Failed to rename conversation ${id}:` + error);
    }
  }

  @Listen('deleteConfirm')
  async handleDeleteConfirm(event: CustomEvent<string>) {
    const id = event.detail;

    try {
      if (state.activeConversationId === id) {
        this.conversationChangeEvent.emit();
      }
      await storeService.deleteConversation(id);
    } catch (error) {
      Alert.error(`Failed to delete conversation ${id}:` + error);
    }
  }

  renameConversation(id: string) {
    if (!this.renameModalEl) {
      console.warn('Rename modal element is not initialized.');
      return;
    }

    const conversation = state.conversations.find(c => c.id === id);
    if (conversation) {
      this.renameModalEl.show(id, conversation.name);
    }
  }

  deleteConversation(id: string) {
    if (!this.deleteModalEl) {
      console.warn('Delete modal element is not initialized.');
      return;
    }

    const conversation = state.conversations.find(c => c.id === id);
    if (conversation) {
      this.deleteModalEl.show(id, conversation.name);
    }
  }

  renderMenu(conversation: any) {
    return (
      <sl-dropdown placement="bottom-end" class="options-dropdown" onClick={(e: any) => e.stopPropagation()}>
        <sl-icon-button slot="trigger" name="three-dots-vertical" label="Options"></sl-icon-button>
        <sl-menu>
          <sl-menu-item onClick={() => this.renameConversation(conversation.id)}>
            <sl-icon slot="prefix" name="pencil"></sl-icon>
            Rename
          </sl-menu-item>
          <sl-menu-item onClick={() => this.deleteConversation(conversation.id)}>
            <sl-icon slot="prefix" name="trash"></sl-icon>
            Delete
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    );
  }

  render() {
    return (
      <div class="history">
        <div class="section-title">Chats</div>

        <div class="conversation-list">
          {state.conversations.map(conversation => {
            const isActive = conversation.id === state.activeConversationId;

            return (
              <div class={`conversation ${isActive ? 'active' : ''}`} key={conversation.id} onClick={() => this.loadConversation(conversation.id)}>
                <div class="chat-main">
                  <sl-icon name="chat-dots" class="chat-icon"></sl-icon>
                  <div class="chat-info">
                    <span class="chat-title" title={conversation.name}>
                      {conversation.name}
                    </span>
                    <span class="chat-time">{formatTime(conversation.updatedAt)}</span>
                  </div>
                </div>
                {this.renderMenu(conversation)}
              </div>
            );
          })}
        </div>

        <localmind-rename-modal ref={el => (this.renameModalEl = el as HTMLLocalmindRenameModalElement)}></localmind-rename-modal>
        <localmind-delete-modal ref={el => (this.deleteModalEl = el as HTMLLocalmindDeleteModalElement)}></localmind-delete-modal>
      </div>
    );
  }
}
