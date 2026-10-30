import { createStore } from '@stencil/store';
import { dbService } from '../services/database.service';
import { LocalMindState, Message } from '../types/interfaces';
import { nanoid } from 'nanoid';
import type { MapWidgetData } from '../utils/utility';

const { state } = createStore<LocalMindState>({
  conversations: [],
  activeConversationId: null,
  activeMessages: [],
  isGenerating: false,
  isTemporaryChat: false,
});

export class StoreService {
  private conversationSelectionId = 0;

  async initApp() {
    await this.loadConversations();
  }

  async loadConversations() {
    state.conversations = await dbService.getSavedConversations();
  }

  startNewChat() {
    this.conversationSelectionId++;
    state.activeConversationId = null;
    state.activeMessages = [];
    state.isTemporaryChat = false;
  }

  startTempChat() {
    this.conversationSelectionId++;
    state.activeConversationId = null;
    state.activeMessages = [];
    state.isTemporaryChat = true;
  }

  async switchConversation(id: string) {
    const selectionId = ++this.conversationSelectionId;
    state.activeConversationId = id;
    state.isTemporaryChat = false;
    state.activeMessages = [];
    const messages = await dbService.getMessagesForConversation(id);
    if (selectionId === this.conversationSelectionId && state.activeConversationId === id) {
      state.activeMessages = messages;
    }
  }

  async renameConversation(id: string, newName: string) {
    await dbService.updateConversationName(id, newName);
    await this.loadConversations();
  }

  async deleteConversation(id: string) {
    await dbService.deleteConversation(id);
    await this.loadConversations();

    if (state.activeConversationId === id) {
      state.activeConversationId = null;
      state.activeMessages = [];
    }
  }

  // --- NEW WORKFLOW METHODS ---

  async createNewConversation(firstPrompt: string): Promise<string> {
    const selectionId = ++this.conversationSelectionId;
    const id = nanoid();
    const name = firstPrompt.length > 30 ? `${firstPrompt.substring(0, 30)}...` : firstPrompt;

    await dbService.createConversation(id, name, false);
    await this.loadConversations();

    if (selectionId === this.conversationSelectionId) {
      state.activeConversationId = id;
      state.activeMessages = [];
    }

    return id;
  }

  pushMessageToUI(message: Message) {
    state.activeMessages = [...state.activeMessages, message];
  }

  updateMessageInUI(id: string, updates: Partial<Message>) {
    state.activeMessages = state.activeMessages.map(msg => (msg.id === id ? { ...msg, ...updates } : msg));
  }

  async appendMapWidgetToMessage(messageId: string, mapData: MapWidgetData): Promise<void> {
    const persistedMessage = await dbService.appendMapWidgetToMessage(messageId, mapData);
    if (persistedMessage) {
      this.updateMessageInUI(messageId, { mapWidgets: persistedMessage.mapWidgets });
      return;
    }

    const activeMessage = state.activeMessages.find(message => message.id === messageId);
    if (!activeMessage) {
      throw new Error('Could not find the assistant message for the map results.');
    }

    this.updateMessageInUI(messageId, { mapWidgets: [...(activeMessage.mapWidgets ?? []), mapData] });
  }

  removeMessageFromUI(id: string) {
    state.activeMessages = state.activeMessages.filter(msg => msg.id !== id);
  }

  async removeMessageFromDB(id: string) {
    await dbService.deleteMessage(id);
    await this.loadConversations();
  }

  async commitMessageToDB(message: Message) {
    if (state.isTemporaryChat) {
      return;
    }

    await dbService.addMessage(message);
    await this.loadConversations();
  }
}

export const storeService = new StoreService();
export default state;
