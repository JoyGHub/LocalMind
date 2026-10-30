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
  @Event({ bubbles: true, composed: true }) tempChatEvent!: EventEmitter<void>;

  sendModelsCardEvent() {
    this.modelsCardEvent.emit();
  }

  startNewChat() {
    storeService.startNewChat();
    this.newChatEvent.emit();
  }

  startTempChat() {
    storeService.startTempChat();
    this.tempChatEvent.emit();
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
        <div class="top">
          <div class="new-chat-row">
            <sl-button class="new-chat-button" onClick={() => this.startNewChat()}>
              <sl-icon name="stars" slot="prefix"></sl-icon>
              New Chat
            </sl-button>

            <sl-tooltip content="New Temporary Chat" placement="bottom">
              <sl-button class="temp-chat-button" onClick={() => this.startTempChat()}>
                <sl-icon name="chat-dots"></sl-icon>
              </sl-button>
            </sl-tooltip>
          </div>

          <sl-button class="models-button" onClick={() => this.sendModelsCardEvent()}>
            <sl-icon name="box" slot="prefix"></sl-icon>
            Models Manager
          </sl-button>

          <localmind-history></localmind-history>
        </div>

        <div class="bottom">
          <sl-button variant="text" class="nav-button" onClick={() => this.openSettings()}>
            <sl-icon name="gear" slot="prefix"></sl-icon>
            Settings
          </sl-button>

          <sl-button variant="text" class="nav-button" onClick={() => this.openAbout()}>
            <sl-icon name="info-circle" slot="prefix"></sl-icon>
            About
          </sl-button>

          <localmind-ollama-status ollamaRunning={this.ollamaRunning}></localmind-ollama-status>
        </div>

        <localmind-settings ref={el => (this.settingsModalEl = el as HTMLLocalmindSettingsElement)} models={this.models} ollamaRunning={this.ollamaRunning}></localmind-settings>
        <localmind-about-modal ref={el => (this.aboutModalEl = el as HTMLLocalmindAboutModalElement)}></localmind-about-modal>
      </aside>
    );
  }
}
