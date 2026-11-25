import { Component, h, Listen, Prop, Event, EventEmitter } from '@stencil/core';
import state, { storeService } from '../../store/store';
import { Alert } from '../../services/alert.service';

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
  createProjectModalEl!: HTMLLocalmindCreateProjectModalElement;
  renameModalEl!: HTMLLocalmindRenameModalElement;
  deleteModalEl!: HTMLLocalmindDeleteModalElement;

  @Event({ bubbles: true, composed: true }) modelsCardEvent!: EventEmitter<void>;
  @Event({ bubbles: true, composed: true }) newChatEvent!: EventEmitter<void>;
  @Event({ bubbles: true, composed: true }) sidebarToggleEvent!: EventEmitter<void>;
  @Event({ bubbles: true, composed: true }) projectChangeEvent!: EventEmitter<void>;

  sendModelsCardEvent() {
    this.modelsCardEvent.emit();
  }

  startNewChat() {
    storeService.startNewChat();
    this.newChatEvent.emit();
  }

  async selectProject(projectId: string) {
    this.projectChangeEvent.emit();
    try {
      await storeService.selectProject(projectId);
    } catch (error) {
      Alert.error(`Failed to open project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Listen('projectRenameConfirm')
  async handleRenameConfirm(event: CustomEvent<{ id: string; newName: string }>) {
    try {
      await storeService.renameProject(event.detail.id, event.detail.newName);
    } catch (error) {
      Alert.error(`Failed to rename project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Listen('projectDeleteConfirm')
  async handleProjectDeleteConfirm(event: CustomEvent<{ id: string; deleteChats: boolean }>) {
    try {
      this.projectChangeEvent.emit();
      await storeService.deleteProject(event.detail.id, event.detail.deleteChats);
    } catch (error) {
      Alert.error(`Failed to delete project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  renameProject(id: string) {
    const project = state.projects.find(item => item.id === id);
    if (project) {
      this.renameModalEl?.show(id, project.name);
    }
  }

  deleteProject(id: string) {
    const project = state.projects.find(item => item.id === id);
    if (project) {
      this.deleteModalEl?.show(id, project.name);
    }
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
      <div class="sidebar-layout">
        <aside class={{ sidebar: true, collapsed: this.collapsed }}>
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

            <div class="projects-section">
              <div class="projects-heading">
                <span class="section-title">Projects</span>
                <sl-button class="new-project-button" variant="text" onClick={() => this.createProjectModalEl?.show()}>
                  <sl-icon name="plus" slot="prefix"></sl-icon>
                  <span class="button-label">New project</span>
                </sl-button>
              </div>
              <div class="project-list">
                {state.projects.map(project => (
                  <div class={{ 'project-row': true, active: state.activeProjectId === project.id }} key={project.id}>
                    <button
                      type="button"
                      class="project-item"
                      onClick={() => this.selectProject(project.id)}
                      title={project.name}
                    >
                      <sl-icon name="journal-bookmark"></sl-icon>
                      <span class="project-name">{project.name}</span>
                    </button>
                    <sl-dropdown placement="bottom-end" class="options-dropdown" onClick={(event: Event) => event.stopPropagation()}>
                      <sl-icon-button slot="trigger" name="three-dots-vertical" label="Project options"></sl-icon-button>
                      <sl-menu>
                        <sl-menu-item onClick={() => this.renameProject(project.id)}>
                          <sl-icon slot="prefix" name="pencil"></sl-icon>
                          Rename
                        </sl-menu-item>
                        <sl-menu-item onClick={() => this.deleteProject(project.id)}>
                          <sl-icon slot="prefix" name="trash"></sl-icon>
                          Delete
                        </sl-menu-item>
                      </sl-menu>
                    </sl-dropdown>
                  </div>
                ))}
              </div>
            </div>

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
          <localmind-create-project-modal ref={el => (this.createProjectModalEl = el as HTMLLocalmindCreateProjectModalElement)}></localmind-create-project-modal>
          <localmind-rename-modal entityType="project" ref={el => (this.renameModalEl = el as HTMLLocalmindRenameModalElement)}></localmind-rename-modal>
          <localmind-delete-modal entityType="project" ref={el => (this.deleteModalEl = el as HTMLLocalmindDeleteModalElement)}></localmind-delete-modal>
        </aside>
        <div class="sidebar-toggle">
          <sl-icon-button
            name={this.collapsed ? 'chevron-bar-right' : 'chevron-bar-left'}
            label={this.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => this.sidebarToggleEvent.emit()}
          ></sl-icon-button>
        </div>
      </div>
    );
  }
}
