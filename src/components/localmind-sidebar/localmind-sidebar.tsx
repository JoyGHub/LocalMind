import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';
import { storeService } from '../../store/store';

@Component({
  tag: 'localmind-sidebar',
  styleUrl: 'localmind-sidebar.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindSidebar {
  @Prop() collapsed: boolean = false;
  @Prop() models!: any[];
  @Prop() ollamaRunning!: boolean;

  settingsModalEl!: HTMLLocalmindSettingsElement;
  aboutModalEl!: HTMLLocalmindAboutModalElement;

  @Event({ bubbles: true, composed: true }) modelsCardEvent!: EventEmitter<void>;
  @Event({ bubbles: true, composed: true }) newChatEvent!: EventEmitter<void>;
  @Event({ bubbles: true, composed: true }) sidebarToggleEvent!: EventEmitter<void>;

  sendModelsCardEvent() {
    this.modelsCardEvent.emit();
  }

  startNewChat() {
    storeService.startNewChat();
    this.newChatEvent.emit();
  }

  openSettings() {
    if (this.settingsModalEl) {
      this.settingsModalEl.show();
    }
  }

  openAbout() {
    if (this.aboutModalEl) {
      this.aboutModalEl.show();
    }
  }

  render() {
    return (
      <aside class={{ sidebar: true, collapsed: this.collapsed }}>
        <div class="sidebar-header">
          <sl-tooltip content={this.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <sl-icon-button
              name={this.collapsed ? 'chevron-bar-right' : 'chevron-bar-left'}
              label={this.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => this.sidebarToggleEvent.emit()}
            ></sl-icon-button>
          </sl-tooltip>
        </div>

        <div class="top">
          <div class="new-chat-row">
            <sl-button class="new-chat-button" onClick={() => this.startNewChat()} aria-label="New chat">
              <sl-icon name="stars" slot="prefix"></sl-icon>
              <span class="button-label">New Chat</span>
            </sl-button>
          </div>

          <sl-button class="models-button" onClick={() => this.sendModelsCardEvent()} aria-label="Models Manager">
            <sl-icon name="box" slot="prefix"></sl-icon>
            <span class="button-label">Models Manager</span>
          </sl-button>

          <localmind-history></localmind-history>
        </div>

        <div class="bottom">
          <sl-button variant="text" class="nav-button" onClick={() => this.openSettings()} aria-label="Settings">
            <sl-icon name="gear" slot="prefix"></sl-icon>
            <span class="button-label">Settings</span>
          </sl-button>

          <sl-button variant="text" class="nav-button" onClick={() => this.openAbout()} aria-label="About">
            <sl-icon name="info-circle" slot="prefix"></sl-icon>
            <span class="button-label">About</span>
          </sl-button>

          <localmind-ollama-status ollamaRunning={this.ollamaRunning}></localmind-ollama-status>
        </div>

        <localmind-settings ref={el => (this.settingsModalEl = el as HTMLLocalmindSettingsElement)} models={this.models} ollamaRunning={this.ollamaRunning}></localmind-settings>
        <localmind-about-modal ref={el => (this.aboutModalEl = el as HTMLLocalmindAboutModalElement)}></localmind-about-modal>
      </aside>
    );
  }
}
