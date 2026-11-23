import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';
import state from '../../store/store';

@Component({
  tag: 'localmind-move-to-project-modal',
  styleUrl: 'localmind-move-to-project-modal.css',
  shadow: true,
})
export class LocalMindMoveToProjectModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  @State() conversationId: string = '';
  @State() selectedProjectId: string = '';

  @Event({ bubbles: true, composed: true }) moveToProjectConfirm!: EventEmitter<{ conversationId: string; projectId: string }>;

  isMouseDownOnBackdrop: boolean = false;

  @Method()
  async show(conversationId: string) {
    this.conversationId = conversationId;
    this.selectedProjectId = state.projects[0]?.id ?? '';
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.conversationId = '';
    this.selectedProjectId = '';
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

  confirmMove() {
    if (!this.selectedProjectId) return;
    this.moveToProjectConfirm.emit({ conversationId: this.conversationId, projectId: this.selectedProjectId });
    this.hide();
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={event => this.handleMouseDown(event)} onMouseUp={event => this.handleMouseUp(event)}>
        <div class="modal-card">
          <div class="modal-header">
            <h3>Add chat to project</h3>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>
          <div class="modal-body">
            {state.projects.length ? (
              <sl-select label="Project" value={this.selectedProjectId} onSlChange={(event: CustomEvent) => (this.selectedProjectId = (event.target as HTMLSelectElement).value)}>
                {state.projects.map(project => (
                  <sl-option value={project.id}>{project.name}</sl-option>
                ))}
              </sl-select>
            ) : (
              <p>Create a project before moving this chat.</p>
            )}
          </div>
          <div class="modal-footer">
            <sl-button variant="primary" onClick={() => this.confirmMove()} disabled={!this.selectedProjectId}>
              Move
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
