import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'localmind-delete-modal',
  styleUrl: 'localmind-delete-modal.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindDeleteModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;
  @Prop() entityType: 'conversation' | 'project' = 'conversation';

  @State() conversationId!: string;
  @State() conversationName: string = '';
  @State() deleteChats: boolean = false;

  @Event({ bubbles: true, composed: true }) deleteConfirm!: EventEmitter<string>;
  @Event({ bubbles: true, composed: true }) projectDeleteConfirm!: EventEmitter<{ id: string; deleteChats: boolean }>;

  isMouseDownOnBackdrop: boolean = false;

  @Method()
  async show(id: string, name: string) {
    this.conversationId = id;
    this.conversationName = name;
    this.deleteChats = false;
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.conversationId = '';
    this.conversationName = '';
    this.deleteChats = false;
  }

  handleMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('backdrop')) {
      this.isMouseDownOnBackdrop = true;
    } else {
      this.isMouseDownOnBackdrop = false;
    }
  }

  handleMouseUp(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (this.isMouseDownOnBackdrop && target.classList.contains('backdrop')) {
      this.hide();
    }
    this.isMouseDownOnBackdrop = false;
  }

  confirmDelete() {
    if (this.entityType === 'project') {
      this.projectDeleteConfirm.emit({ id: this.conversationId, deleteChats: this.deleteChats });
    } else {
      this.deleteConfirm.emit(this.conversationId);
    }
    this.hide();
  }

  handleDeleteChatsChange(event: CustomEvent) {
    const target = event.target;
    if (target && 'checked' in target && typeof target.checked === 'boolean') {
      this.deleteChats = target.checked;
    }
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={e => this.handleMouseDown(e)} onMouseUp={e => this.handleMouseUp(e)}>
        <div class="modal-card">
          <div class="modal-header">
            <h3>Delete {this.entityType === 'project' ? 'Project' : 'Conversation'}</h3>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>

          <div class="modal-body">
            <p>
              Are you sure you want to delete the {this.entityType} <strong>"{this.conversationName}"</strong>? This action cannot be undone.
            </p>
            {this.entityType === 'project' && (
              <sl-checkbox
                checked={this.deleteChats}
                onSlChange={(event: CustomEvent) => this.handleDeleteChatsChange(event)}
              >
                Delete all chats in this project
              </sl-checkbox>
            )}
          </div>

          <div class="modal-footer">
            <sl-button variant="default" onClick={() => this.hide()}>
              Cancel
            </sl-button>
            <sl-button variant="danger" onClick={() => this.confirmDelete()}>
              Delete
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
