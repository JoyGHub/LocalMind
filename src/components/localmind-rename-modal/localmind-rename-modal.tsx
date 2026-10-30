import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'localmind-rename-modal',
  styleUrl: 'localmind-rename-modal.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindRenameModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  @State() conversationId!: string;
  @State() newName: string = '';

  @Event({ bubbles: true, composed: true }) renameConfirm!: EventEmitter<{ id: string; newName: string }>;

  isMouseDownOnBackdrop: boolean = false;

  @Method()
  async show(id: string, currentName: string) {
    this.conversationId = id;
    this.newName = currentName;
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.conversationId = '';
    this.newName = '';
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

  handleInput(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.newName = target.value;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveRename();
    }
  }

  saveRename() {
    const trimmedName = this.newName.trim();
    if (trimmedName !== '') {
      this.renameConfirm.emit({ id: this.conversationId, newName: trimmedName });
      this.hide();
    }
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={e => this.handleMouseDown(e)} onMouseUp={e => this.handleMouseUp(e)}>
        <div class="modal-card">
          <div class="modal-header">
            <h3>Rename Conversation</h3>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>

          <div class="modal-body">
            <sl-input value={this.newName} onKeyDown={(e: KeyboardEvent) => this.handleKeyDown(e)} onInput={(e: InputEvent) => this.handleInput(e)} autofocus></sl-input>
          </div>

          <div class="modal-footer">
            <sl-button variant="default" onClick={() => this.hide()}>
              Cancel
            </sl-button>
            <sl-button variant="primary" onClick={() => this.saveRename()} disabled={this.newName.trim() === ''}>
              Rename
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
