import { createStore } from '@stencil/store';
import { DEFAULT_SYSTEM_INSTRUCTIONS, SYSTEM_INSTRUCTION } from '../constants/prompts';
import { LocalMindSettings, ThinkingLevel } from '../types/interfaces';

const defaultSettings: LocalMindSettings = {
  language: 'English',
  defaultModel: '',
  theme: 'System',
  temperature: 0.8,
  top_p: 0.9,
  top_k: 40,
  contextWindow: 32000,
  maxTokens: 4096,
  instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
  accentColor: '#4f46e5',
  saveMemories: true,
  readMemories: true,
  thinkingLevel: 'off',
};

const { state: settingsState } = createStore<LocalMindSettings>(defaultSettings);

class SettingsService {
  storageKey!: string;

  constructor() {
    this.storageKey = 'localmind_user_settings';
    this.init();
  }

  init() {
    this.loadSettings();
  }

  loadSettings() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Stored settings must be an object');
        }

        const storedSettings = { ...(parsed as Record<string, unknown>) };
        const legacySystemPrompt = storedSettings.systemPrompt;
        delete storedSettings.systemPrompt;

        const instructions = Array.isArray(storedSettings.instructions)
          ? storedSettings.instructions.filter((instruction): instruction is string => typeof instruction === 'string')
          : typeof legacySystemPrompt === 'string'
            ? legacySystemPrompt === SYSTEM_INSTRUCTION.content
              ? DEFAULT_SYSTEM_INSTRUCTIONS
              : [legacySystemPrompt]
            : DEFAULT_SYSTEM_INSTRUCTIONS;
        const thinkingLevel: ThinkingLevel =
          storedSettings.thinkingLevel === 'low' || storedSettings.thinkingLevel === 'medium' || storedSettings.thinkingLevel === 'high'
            ? storedSettings.thinkingLevel
            : 'off';

        Object.assign(settingsState, {
          ...defaultSettings,
          ...storedSettings,
          instructions,
          saveMemories: typeof storedSettings.saveMemories === 'boolean' ? storedSettings.saveMemories : defaultSettings.saveMemories,
          readMemories: typeof storedSettings.readMemories === 'boolean' ? storedSettings.readMemories : defaultSettings.readMemories,
          thinkingLevel,
        });
      } catch (error) {
        console.error('Failed to parse settings from local storage:', error);
      }
    }
  }

  saveSettings() {
    const dataToSave = JSON.stringify(settingsState);
    localStorage.setItem(this.storageKey, dataToSave);
  }

  updateSetting<K extends keyof LocalMindSettings>(key: K, value: LocalMindSettings[K]) {
    settingsState[key] = value;
  }

  discardUnsavedChanges() {
    this.loadSettings();
  }
}

export const settingsService = new SettingsService();
export { settingsState };
