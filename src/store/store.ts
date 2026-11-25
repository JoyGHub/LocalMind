import { createStore } from '@stencil/store';
import { dbService } from '../services/database.service';
import { LocalMindState, Message, ProjectSource } from '../types/interfaces';
import { nanoid } from 'nanoid';
import type { MapWidgetData } from '../utils/utility';

const { state } = createStore<LocalMindState>({
  conversations: [],
  projects: [],
  activeProjectSources: [],
  projectConversations: [],
  activeProjectId: null,
  activeConversationId: null,
  activeMessages: [],
  isGenerating: false,
  isTemporaryChat: false,
});

export class StoreService {
  conversationSelectionId = 0;
  projectSelectionId = 0;

  async initApp() {
    await this.loadConversations();
    await this.loadProjects();
  }

  async loadConversations() {
    state.conversations = await dbService.getSavedConversations();
    if (state.activeProjectId) {
      await this.loadProjectConversations(state.activeProjectId);
    }
  }

  async loadProjects() {
    state.projects = await dbService.getProjects();
  }

  async selectProject(projectId: string) {
    const selectionId = ++this.projectSelectionId;
    this.conversationSelectionId++;
    state.activeProjectId = projectId;
    state.activeConversationId = null;
    state.activeMessages = [];
    state.isTemporaryChat = false;
    state.projectConversations = [];
    state.activeProjectSources = [];
    const [conversations, sources] = await Promise.all([
      dbService.getProjectConversations(projectId),
      dbService.getProjectSources(projectId),
    ]);
    if (selectionId === this.projectSelectionId && state.activeProjectId === projectId) {
      state.projectConversations = conversations;
      state.activeProjectSources = sources;
    }
  }

  async createProject(name: string) {
    const project = await dbService.createProject(name);
    await this.loadProjects();
    await this.selectProject(project.id);
    return project;
  }

  async assignConversationToProject(conversationId: string, projectId: string | null) {
    await dbService.assignConversationToProject(conversationId, projectId);
    await this.loadConversations();
    if (state.activeConversationId === conversationId) {
      const selectionId = ++this.projectSelectionId;
      state.activeProjectId = projectId;
      state.projectConversations = [];
      state.activeProjectSources = [];
      if (projectId) {
        const [conversations, sources] = await Promise.all([
          dbService.getProjectConversations(projectId),
          dbService.getProjectSources(projectId),
        ]);
        if (selectionId === this.projectSelectionId && state.activeProjectId === projectId) {
          state.projectConversations = conversations;
          state.activeProjectSources = sources;
        }
      }
    } else if (state.activeProjectId) {
      await this.loadProjectConversations(state.activeProjectId);
    }
  }

  async loadProjectConversations(projectId: string) {
    const selectionId = this.projectSelectionId;
    const conversations = await dbService.getProjectConversations(projectId);
    if (selectionId === this.projectSelectionId && state.activeProjectId === projectId) {
      state.projectConversations = conversations;
    }
  }

  startNewChat() {
    this.conversationSelectionId++;
    this.projectSelectionId++;
    state.activeProjectId = null;
    state.activeProjectSources = [];
    state.activeConversationId = null;
    state.activeMessages = [];
    state.projectConversations = [];
    state.isTemporaryChat = false;
  }

  startTempChat() {
    this.conversationSelectionId++;
    state.activeConversationId = null;
    state.activeMessages = [];
    state.isTemporaryChat = true;
  }

  async switchConversation(id: string, projectId: string | null) {
    const selectionId = ++this.conversationSelectionId;
    state.activeConversationId = id;
    state.isTemporaryChat = false;
    state.activeMessages = [];
    if (state.activeProjectId !== projectId) {
      const projectSelectionId = ++this.projectSelectionId;
      state.activeProjectId = projectId;
      state.projectConversations = [];
      state.activeProjectSources = [];
      if (projectId) {
        const [conversations, sources] = await Promise.all([
          dbService.getProjectConversations(projectId),
          dbService.getProjectSources(projectId),
        ]);
        if (projectSelectionId === this.projectSelectionId && state.activeProjectId === projectId) {
          state.projectConversations = conversations;
          state.activeProjectSources = sources;
        }
      }
    }
    const messages = await dbService.getMessagesForConversation(id);
    if (selectionId === this.conversationSelectionId && state.activeConversationId === id) {
      state.activeMessages = messages;
    }
  }

  async renameConversation(id: string, newName: string) {
    await dbService.updateConversationName(id, newName);
    await this.loadConversations();
  }

  async renameProject(id: string, newName: string) {
    await dbService.renameProject(id, newName);
    await this.loadProjects();
  }

  async deleteProject(id: string, deleteConversations: boolean = false) {
    const wasActiveProject = state.activeProjectId === id;
    const activeConversationId = wasActiveProject ? state.activeConversationId : null;

    await dbService.deleteProject(id, deleteConversations);

    if (state.activeProjectId === id) {
      this.projectSelectionId++;
      state.activeProjectId = null;
      state.projectConversations = [];
      state.activeProjectSources = [];
      if (deleteConversations && activeConversationId && state.activeConversationId === activeConversationId) {
        this.conversationSelectionId++;
        state.activeConversationId = null;
        state.activeMessages = [];
        state.isTemporaryChat = false;
      }
    }

    await this.loadProjects();
    await this.loadConversations();
  }

  async addProjectSource(source: ProjectSource) {
    await dbService.addProjectSource(source);
    if (state.activeProjectId === source.projectId) {
      state.activeProjectSources = [...state.activeProjectSources, source].sort((a, b) => a.createdAt - b.createdAt);
    }
  }

  async updateProjectSource(source: ProjectSource) {
    await dbService.updateProjectSource(source);
    if (state.activeProjectId === source.projectId) {
      state.activeProjectSources = state.activeProjectSources.map(existing => (existing.id === source.id ? source : existing));
    }
  }

  async removeProjectSource(sourceId: string) {
    await dbService.deleteProjectSource(sourceId);
    state.activeProjectSources = state.activeProjectSources.filter(source => source.id !== sourceId);
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

    await dbService.createConversation(id, name, false, state.activeProjectId);
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
