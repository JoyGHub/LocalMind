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

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  }

  confirmDelete() {
    if (this.entityType === 'project') {
      this.projectDeleteConfirm.emit({
        id: this.conversationId,
        deleteChats: this.deleteChats,
      });
    } else {
      this.deleteConfirm.emit(this.conversationId);
    }

    this.hide();
  }

  handleDeleteChatsChange(event: CustomEvent) {
    const target = event.target as HTMLElement & { checked?: boolean };

    if (typeof target.checked === 'boolean') {
      this.deleteChats = target.checked;
    }
  }

  render() {
    if (!this.open) return null;

    const entityName = this.entityType === 'project' ? 'Project' : 'Conversation';

    return (
      <div class="backdrop modal-backdrop-enter" onMouseDown={e => this.handleMouseDown(e)} onMouseUp={e => this.handleMouseUp(e)}>
        <div class="modal-card modal-surface-enter" role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={e => this.handleKeyDown(e)}>
          <div class="modal-header">
            <h3 id="modal-title">Delete {entityName}</h3>

            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()} />
          </div>

          <div class="modal-body">
            <p class="modal-description">
              Are you sure you want to delete the {this.entityType} <strong>"{this.conversationName}"</strong>? This action cannot be undone.
            </p>

            {this.entityType === 'project' && (
              <sl-checkbox checked={this.deleteChats} onSlChange={(event: CustomEvent) => this.handleDeleteChatsChange(event)}>
                Delete all chats in this project
              </sl-checkbox>
            )}
          </div>

          <div class="modal-footer">
            <sl-button variant="danger" onClick={() => this.confirmDelete()}>
              Delete
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
