import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';
import { Alert } from '../../services/alert.service';
import { storeService } from '../../store/store';

type TextInputElement = HTMLElement & { value: string };

@Component({
  tag: 'localmind-create-project-modal',
  styleUrl: 'localmind-create-project-modal.css',
  shadow: true,
})
export class LocalMindCreateProjectModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  @State() projectName: string = '';
  @State() isSaving: boolean = false;

  @Event({ bubbles: true, composed: true }) projectChangeEvent!: EventEmitter<void>;

  isMouseDownOnBackdrop: boolean = false;
  projectNameInputEl?: TextInputElement;

  handleProjectNameInput = () => {
    this.projectName = this.projectNameInputEl?.value ?? '';
  };

  bindProjectNameInputElement(element: HTMLElement | undefined) {
    if (this.projectNameInputEl === element) return;

    this.projectNameInputEl?.removeEventListener('sl-input', this.handleProjectNameInput);
    this.projectNameInputEl = element as TextInputElement | undefined;
    this.projectNameInputEl?.addEventListener('sl-input', this.handleProjectNameInput);
  }

  connectedCallback() {
    this.projectNameInputEl?.addEventListener('sl-input', this.handleProjectNameInput);
  }

  disconnectedCallback() {
    this.projectNameInputEl?.removeEventListener('sl-input', this.handleProjectNameInput);
  }

  @Method()
  async show() {
    this.projectName = '';
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.projectName = '';
  }

  handleMouseDown(event: MouseEvent) {
    this.isMouseDownOnBackdrop = (event.target as HTMLElement).classList.contains('backdrop');
  }

  handleMouseUp(event: MouseEvent) {
    if (this.isMouseDownOnBackdrop && (event.target as HTMLElement).classList.contains('backdrop')) {
      this.hide();
    }

    this.isMouseDownOnBackdrop = false;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.createProject();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  }

  async createProject() {
    const name = this.projectName.trim();

    if (!name || this.isSaving) return;

    this.isSaving = true;

    try {
      this.projectChangeEvent.emit();
      await storeService.createProject(name);
      await this.hide();
    } catch (error) {
      Alert.error(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSaving = false;
    }
  }

  render() {
    if (!this.open) return null;
    return (
      <div class="backdrop" onMouseDown={event => this.handleMouseDown(event)} onMouseUp={event => this.handleMouseUp(event)}>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={event => this.handleKeyDown(event)}>
          <div class="modal-header">
            <h3 id="modal-title">New project</h3>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()} />
          </div>
          <div class="modal-body">
            <p class="modal-description">Create a project to organize your conversations.</p>
            <sl-input
              placeholder="Project name"
              value={this.projectName}
              ref={(element: HTMLElement | undefined) => this.bindProjectNameInputElement(element as HTMLElement | undefined)}
              autofocus
            />
          </div>
          <div class="modal-footer">
            <sl-button variant="primary" onClick={() => this.createProject()} disabled={!this.projectName.trim() || this.isSaving} loading={this.isSaving}>
              Create
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
