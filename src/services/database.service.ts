import Dexie, { Table } from 'dexie';
import { AppSetting, Conversation, Memory, Message, Project, ProjectSource } from '../types/interfaces';
import type { MapWidgetData } from '../utils/utility';

export class LocalMindDB extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;
  settings!: Table<AppSetting, string>;
  memories!: Table<Memory, string>;
  projects!: Table<Project, string>;
  projectSources!: Table<ProjectSource, string>;

  constructor() {
    super('LocalMindDB');

    // We only index properties we plan to query or sort by.
    // 'id' is the primary key. 'conversationId' is indexed to quickly load a chat's history.
    this.version(1).stores({
      conversations: 'id, updatedAt, isTemporary',
      messages: 'id, conversationId, timestamp',
      settings: 'key',
    });

    this.version(2).stores({
      conversations: 'id, updatedAt, isTemporary',
      messages: 'id, conversationId, timestamp',
      settings: 'key',
      memories: 'id, createdAt',
    });

    this.version(3).stores({
      conversations: 'id, updatedAt, isTemporary, projectId',
      messages: 'id, conversationId, timestamp',
      settings: 'key',
      memories: 'id, createdAt',
      projects: 'id, updatedAt',
    });

    this.version(4).stores({
      conversations: 'id, updatedAt, isTemporary, projectId',
      messages: 'id, conversationId, timestamp',
      settings: 'key',
      memories: 'id, createdAt',
      projects: 'id, updatedAt',
      projectSources: 'id, projectId, createdAt',
    });
  }
}

export const db = new LocalMindDB();

export class DatabaseService {
  async getSavedConversations(): Promise<Conversation[]> {
    return await db.conversations
      .orderBy('updatedAt')
      .reverse()
      .filter(c => c.isTemporary === false && !c.projectId)
      .toArray();
  }

  async getProjectConversations(projectId: string): Promise<Conversation[]> {
    const conversations = await db.conversations.where('projectId').equals(projectId).toArray();
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createConversation(id: string, name: string, isTemporary: boolean = false, projectId?: string | null): Promise<void> {
    const now = Date.now();
    await db.conversations.add({
      id,
      name,
      createdAt: now,
      updatedAt: now,
      isTemporary,
      projectId,
    });
  }

  async getProjects(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray();
  }

  async createProject(name: string): Promise<Project> {
    const now = Date.now();
    const project: Project = { id: crypto.randomUUID(), name: name.trim(), createdAt: now, updatedAt: now };
    await db.projects.add(project);
    return project;
  }

  async deleteProject(id: string, deleteConversations: boolean = false): Promise<void> {
    await db.transaction('rw', db.projects, db.conversations, db.messages, db.projectSources, async () => {
      const conversations = await db.conversations.where('projectId').equals(id).toArray();
      await db.projects.delete(id);
      if (deleteConversations) {
        const conversationIds = conversations.map(conversation => conversation.id);
        if (conversationIds.length > 0) {
          await db.messages.where('conversationId').anyOf(conversationIds).delete();
          await db.conversations.bulkDelete(conversationIds);
        }
      } else {
        await db.conversations.where('projectId').equals(id).modify({ projectId: null });
      }
      await db.projectSources.where('projectId').equals(id).delete();
    });
  }

  async getProjectSources(projectId: string): Promise<ProjectSource[]> {
    return db.projectSources.where('projectId').equals(projectId).sortBy('createdAt');
  }

  async addProjectSource(source: ProjectSource): Promise<void> {
    await db.projectSources.add(source);
  }

  async updateProjectSource(source: ProjectSource): Promise<void> {
    await db.projectSources.put(source);
  }

  async deleteProjectSource(sourceId: string): Promise<void> {
    await db.projectSources.delete(sourceId);
  }

  async renameProject(id: string, newName: string): Promise<void> {
    await db.projects.update(id, { name: newName.trim(), updatedAt: Date.now() });
  }

  async assignConversationToProject(conversationId: string, projectId: string | null): Promise<void> {
    await db.conversations.update(conversationId, { projectId, updatedAt: Date.now() });
  }

  async updateConversationName(id: string, newName: string): Promise<void> {
    await db.conversations.update(id, {
      name: newName,
      updatedAt: Date.now(),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await db.transaction('rw', db.conversations, db.messages, async () => {
      await db.conversations.delete(id);
      await db.messages.where('conversationId').equals(id).delete();
    });
  }

  async getMessagesForConversation(conversationId: string): Promise<Message[]> {
    return await db.messages.where('conversationId').equals(conversationId).sortBy('timestamp');
  }

  async appendMapWidgetToMessage(messageId: string, mapData: MapWidgetData): Promise<Message | undefined> {
    return db.transaction('rw', db.messages, async () => {
      const message = await db.messages.get(messageId);
      if (!message) return undefined;

      const updatedMessage = {
        ...message,
        mapWidgets: [...(message.mapWidgets ?? []), mapData],
      };
      await db.messages.put(updatedMessage);
      return updatedMessage;
    });
  }

  async addMessage(message: Message): Promise<void> {
    await db.transaction('rw', db.conversations, db.messages, async () => {
      await db.messages.put(message);

      if (message.conversationId) {
        await db.conversations.update(message.conversationId, {
          updatedAt: message.timestamp,
        });
      }
    });
  }

  async deleteMessage(id: string): Promise<void> {
    await db.messages.delete(id);
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
  }

  async saveSetting(key: string, value: any): Promise<void> {
    await db.settings.put({ key, value });
  }

  async getMemories(): Promise<Memory[]> {
    return db.memories.orderBy('createdAt').reverse().toArray();
  }

  async searchMemories(query: string): Promise<Memory[]> {
    const searchTerms = [...new Set(query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean))];
    if (searchTerms.length === 0) return [];

    const memories = await db.memories.orderBy('createdAt').reverse().toArray();
    const documentFrequencies = new Map(searchTerms.map(term => [term, 0]));

    for (const memory of memories) {
      const content = memory.content.toLocaleLowerCase();
      for (const term of searchTerms) {
        if (content.includes(term)) {
          documentFrequencies.set(term, documentFrequencies.get(term)! + 1);
        }
      }
    }

    return memories
      .map(memory => {
        const content = memory.content.toLocaleLowerCase();
        const matchingTerms = searchTerms.filter(term => content.includes(term));
        const relevance = matchingTerms.reduce(
          (score, term) =>
            score + Math.log((memories.length + 1) / (documentFrequencies.get(term)! + 1)) + 1,
          0,
        );
        return { memory, relevance };
      })
      .filter(result => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance || b.memory.createdAt - a.memory.createdAt)
      .map(result => result.memory);
  }

  async addMemory(content: string): Promise<Memory> {
    const memory: Memory = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: Date.now(),
    };
    await db.memories.add(memory);
    return memory;
  }

  async deleteMemory(id: string): Promise<void> {
    await db.memories.delete(id);
  }

  async clearMemories(): Promise<void> {
    await db.memories.clear();
  }
}

export const dbService = new DatabaseService();
