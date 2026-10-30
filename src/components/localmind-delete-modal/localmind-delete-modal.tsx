import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'localmind-delete-modal',
  styleUrl: 'localmind-delete-modal.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindDeleteModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  @State() conversationId!: string;
  @State() conversationName: string = '';

  @Event({ bubbles: true, composed: true }) deleteConfirm!: EventEmitter<string>;

  isMouseDownOnBackdrop: boolean = false;

  @Method()
  async show(id: string, name: string) {
    this.conversationId = id;
    this.conversationName = name;
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.conversationId = '';
    this.conversationName = '';
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
    this.deleteConfirm.emit(this.conversationId);
    this.hide();
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={e => this.handleMouseDown(e)} onMouseUp={e => this.handleMouseUp(e)}>
        <div class="modal-card">
          <div class="modal-header">
            <h3>Delete Conversation</h3>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>

          <div class="modal-body">
            <p>
              Are you sure you want to delete the conversation <strong>"{this.conversationName}"</strong>? This action cannot be undone.
            </p>
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
