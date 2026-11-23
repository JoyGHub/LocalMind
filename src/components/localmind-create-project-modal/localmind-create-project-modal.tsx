import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';
import { Alert } from '../../services/alert.service';
import { storeService } from '../../store/store';

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

  handleInput(event: InputEvent) {
    this.projectName = (event.target as HTMLInputElement).value;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.createProject();
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
        <div class="modal-card">
          <div class="modal-header">
            <h3>New project</h3>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>
          <div class="modal-body">
            <sl-input
              label="Project name"
              value={this.projectName}
              onKeyDown={(event: KeyboardEvent) => this.handleKeyDown(event)}
              onInput={(event: InputEvent) => this.handleInput(event)}
              autofocus
            ></sl-input>
          </div>
          <div class="modal-footer">
            <sl-button variant="primary" onClick={() => this.createProject()} disabled={!this.projectName.trim() || this.isSaving}>
              Create
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
