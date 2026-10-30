import { Component, h, Method, Prop, State, Element } from '@stencil/core';
import { settingsService } from '../../services/settings.service';
import { t } from '../../services/i18n.service';
import { settingsState } from '../../services/settings.service';
import { Alert } from '../../services/alert.service';

@Component({
  tag: 'localmind-settings',
  styleUrl: 'localmind-settings.css',
  shadow: true,
})
export class LocalMindSettings {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;
  @Prop() models!: any[];
  @Prop() ollamaRunning!: boolean;

  @Element() el!: HTMLElement;

  @State() activeTab!: string;

  componentWillLoad() {
    this.activeTab = 'general';
  }

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    settingsService.discardUnsavedChanges();
  }

  handleBackdropClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('backdrop')) {
      this.hide();
    }
  }

  async handleTabChange(tabId: string) {
    const activePanel = this.el.shadowRoot?.querySelector(`localmind-settings-${this.activeTab}`) as any;
    if (activePanel?.commitCurrentValues) {
      await activePanel.commitCurrentValues();
    }
    this.activeTab = tabId;
  }

  async handleSave() {
    const locale = settingsState.language || 'English';

    try {
      const settingsPanels = this.el.shadowRoot?.querySelectorAll(
        'localmind-settings-general, localmind-settings-model, localmind-settings-appearance',
      );
      for (const panel of Array.from(settingsPanels ?? []) as any[]) {
        if (panel.commitCurrentValues) {
          await panel.commitCurrentValues();
        }
      }
      settingsService.saveSettings();
      Alert.success(t('saveSuccess', locale));
      this.open = false;
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.error(t('saveError', locale));
    }
  }

  renderHeader() {
    const locale = settingsState.language || 'English';

    return (
      <div class="header">
        <div class="header-left">
          <div class="icon-box primary">
            <sl-icon name="gear"></sl-icon>
          </div>
          <div>
            <div class="main-title">{t('settingsTitle', locale)}</div>
            <div class="sub-title">{t('settingsSubtitle', locale)}</div>
          </div>
        </div>
        <sl-icon-button name="x" class="close-btn" onClick={() => this.hide()}></sl-icon-button>
      </div>
    );
  }

  renderSidebar() {
    const locale = settingsState.language || 'English';
    const tabs = [
      { id: 'general', title: 'General', subtitle: 'Language and instructions', icon: 'gear' },
      { id: 'model', title: 'Model', subtitle: 'Model defaults and generation', icon: 'boxes' },
      { id: 'appearance', title: 'Appearance', subtitle: 'Theme and accent color', icon: 'brightness-high' },
      {
        id: 'memories',
        title: t('tabMemories', locale),
        subtitle: t('tabMemoriesSubtitle', locale),
        icon: 'journal-bookmark',
      },
      { id: 'tts', title: 'Text to Speech', subtitle: 'Voice models settings', icon: 'volume-up' },
    ];

    return (
      <div class="sidebar">
        <div class="tabs-list">
          {tabs.map(tab => (
            <localmind-setting-tab
              tabId={tab.id}
              tabTitle={tab.title}
              subtitle={tab.subtitle}
              icon={tab.icon}
              active={this.activeTab === tab.id}
              onClick={() => this.handleTabChange(tab.id)}
            ></localmind-setting-tab>
          ))}
        </div>

        <div class="sidebar-bottom-slot">
          <slot name="sidebar-footer"></slot>
        </div>
      </div>
    );
  }

  renderMainArea() {
    return (
      <div class="main-area">
        <slot name={this.activeTab}>
          {this.activeTab === 'general' ? (
            <localmind-settings-general></localmind-settings-general>
          ) : this.activeTab === 'model' ? (
            <localmind-settings-model models={this.models} ollamaRunning={this.ollamaRunning}></localmind-settings-model>
          ) : this.activeTab === 'appearance' ? (
            <localmind-settings-appearance></localmind-settings-appearance>
          ) : this.activeTab === 'memories' ? (
            <localmind-settings-memories></localmind-settings-memories>
          ) : this.activeTab === 'tts' ? (
            <localmind-settings-tts></localmind-settings-tts>
          ) : (
            <div class="empty-state">
              <p>Settings for {this.activeTab} will be rendered here.</p>
            </div>
          )}
        </slot>
      </div>
    );
  }

  renderFooter() {
    const locale = settingsState.language || 'English';

    return (
      <div class="footer">
        <sl-button variant="primary" class="primary-btn" onClick={() => this.handleSave()}>
          <sl-icon slot="prefix" name="check2"></sl-icon> {t('saveButton', locale)}
        </sl-button>
      </div>
    );
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onClick={e => this.handleBackdropClick(e)}>
        <div class="settings-card">
          {this.renderHeader()}
          <div class="layout-body">
            {this.renderSidebar()}
            {this.renderMainArea()}
          </div>
          {this.renderFooter()}
        </div>
      </div>
    );
  }
}
