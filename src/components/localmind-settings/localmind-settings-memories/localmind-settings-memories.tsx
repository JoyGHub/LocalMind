import { Component, h, State } from '@stencil/core';
import { dbService } from '../../../services/database.service';
import { settingsService, settingsState } from '../../../services/settings.service';
import { t } from '../../../services/i18n.service';
import { Memory } from '../../../types/interfaces';

@Component({
  tag: 'localmind-settings-memories',
  styleUrl: 'localmind-settings-memories.css',
  shadow: true,
})
export class LocalMindSettingsMemories {
  @State() memories: Memory[] = [];
  @State() saveMemories = false;
  @State() readMemories = false;
  @State() loading = true;
  @State() error = '';

  saveMemoriesSwitchEl!: HTMLElement & { checked: boolean };
  readMemoriesSwitchEl!: HTMLElement & { checked: boolean };
  boundSaveMemoriesChange = () => this.handleMemorySettingChange('saveMemories', this.saveMemoriesSwitchEl.checked);
  boundReadMemoriesChange = () => this.handleMemorySettingChange('readMemories', this.readMemoriesSwitchEl.checked);

  componentWillLoad() {
    this.saveMemories = settingsState.saveMemories;
    this.readMemories = settingsState.readMemories;
    return this.loadMemories();
  }

  componentDidLoad() {
    if (this.saveMemoriesSwitchEl) {
      this.saveMemoriesSwitchEl.addEventListener('sl-change', this.boundSaveMemoriesChange);
    }
    if (this.readMemoriesSwitchEl) {
      this.readMemoriesSwitchEl.addEventListener('sl-change', this.boundReadMemoriesChange);
    }
  }

  disconnectedCallback() {
    this.saveMemoriesSwitchEl?.removeEventListener('sl-change', this.boundSaveMemoriesChange);
    this.readMemoriesSwitchEl?.removeEventListener('sl-change', this.boundReadMemoriesChange);
  }

  async loadMemories() {
    this.loading = true;
    this.error = '';
    try {
      this.memories = await dbService.getMemories();
    } catch (error) {
      console.error('Failed to load saved memories:', error);
      this.error = t('memoryLoadError', settingsState.language || 'English');
    } finally {
      this.loading = false;
    }
  }

  handleMemorySettingChange(key: 'saveMemories' | 'readMemories', checked: boolean) {
    this[key] = checked;
    settingsService.updateSetting(key, checked);
  }

  async deleteMemory(memory: Memory) {
    this.error = '';
    try {
      await dbService.deleteMemory(memory.id);
      this.memories = this.memories.filter(item => item.id !== memory.id);
    } catch (error) {
      console.error(`Failed to delete memory ${memory.id}:`, error);
      this.error = t('memoryDeleteError', settingsState.language || 'English');
    }
  }

  async clearMemories() {
    this.error = '';
    try {
      await dbService.clearMemories();
      this.memories = [];
    } catch (error) {
      console.error('Failed to clear saved memories:', error);
      this.error = t('memoryClearError', settingsState.language || 'English');
    }
  }

  render() {
    const locale = settingsState.language || 'English';
    return (
      <div class="settings-section">
        <div class="settings-header">{t('tabMemories', locale)}</div>

        <div class="setting-card">
          <div class="setting-info">
            <div class="setting-title">{t('memorySaveTitle', locale)}</div>
            <div class="setting-description">{t('memorySaveDescription', locale)}</div>
          </div>
          <sl-switch
            checked={this.saveMemories}
            ref={(el: HTMLElement & { checked: boolean; }) => (this.saveMemoriesSwitchEl = el as HTMLElement & { checked: boolean })}
            aria-label={t('memorySaveTitle', locale)}
          ></sl-switch>
        </div>

        <div class="setting-card">
          <div class="setting-info">
            <div class="setting-title">{t('memoryReadTitle', locale)}</div>
            <div class="setting-description">{t('memoryReadDescription', locale)}</div>
          </div>
          <sl-switch
            checked={this.readMemories}
            ref={(el: HTMLElement & { checked: boolean; }) => (this.readMemoriesSwitchEl = el as HTMLElement & { checked: boolean })}
            aria-label={t('memoryReadTitle', locale)}
          ></sl-switch>
        </div>

        <div class="setting-card memory-list-card">
          <div class="memory-header">
            <div class="setting-info">
              <div class="setting-title">{t('memorySavedTitle', locale)}</div>
              <div class="setting-description">{t('memorySavedDescription', locale)}</div>
            </div>
            <sl-button
              variant="danger"
              size="small"
              disabled={this.loading || this.memories.length === 0}
              onClick={() => this.clearMemories()}
            >{t('memoryClearAllLabel', locale)}</sl-button>
          </div>
          {this.error && <div class="memory-error" role="alert">{this.error}</div>}
          {this.loading ? (
            <div class="memory-empty">{t('memoryLoading', locale)}</div>
          ) : this.memories.length === 0 ? (
            <div class="memory-empty">{t('memoryEmpty', locale)}</div>
          ) : (
            <div class="memories-list">
              {this.memories.map(memory => (
                <div class="memory-row" key={memory.id}>
                  <div class="memory-content">
                    <div class="memory-text">{memory.content}</div>
                    <div class="memory-date">{new Date(memory.createdAt).toLocaleString()}</div>
                  </div>
                  <sl-icon-button
                    name="trash"
                    label={t('memoryDeleteLabel', locale)}
                    class="memory-delete"
                    onClick={() => this.deleteMemory(memory)}
                  ></sl-icon-button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}
