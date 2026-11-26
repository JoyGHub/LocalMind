import { Component, h, Prop, State, Method, Event, EventEmitter } from '@stencil/core';

type TextInputElement = HTMLElement & { value: string };

@Component({
  tag: 'localmind-rename-modal',
  styleUrl: 'localmind-rename-modal.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindRenameModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;
  @Prop() entityType: 'conversation' | 'project' = 'conversation';

  @State() conversationId!: string;
  @State() newName: string = '';

  @Event({ bubbles: true, composed: true }) renameConfirm!: EventEmitter<{ id: string; newName: string }>;
  @Event({ bubbles: true, composed: true }) projectRenameConfirm!: EventEmitter<{ id: string; newName: string }>;

  isMouseDownOnBackdrop: boolean = false;
  nameInputEl?: TextInputElement;

  handleNameInput = () => {
    this.newName = this.nameInputEl?.value ?? '';
  };

  bindNameInputElement(element: HTMLElement | undefined) {
    if (this.nameInputEl === element) return;

    this.nameInputEl?.removeEventListener('sl-input', this.handleNameInput);
    this.nameInputEl = element as TextInputElement | undefined;
    this.nameInputEl?.addEventListener('sl-input', this.handleNameInput);
  }

  connectedCallback() {
    this.nameInputEl?.addEventListener('sl-input', this.handleNameInput);
  }

  disconnectedCallback() {
    this.nameInputEl?.removeEventListener('sl-input', this.handleNameInput);
  }

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

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveRename();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  }

  saveRename() {
    const trimmedName = this.newName.trim();

    if (trimmedName !== '') {
      if (this.entityType === 'project') {
        this.projectRenameConfirm.emit({
          id: this.conversationId,
          newName: trimmedName,
        });
      } else {
        this.renameConfirm.emit({
          id: this.conversationId,
          newName: trimmedName,
        });
      }

      this.hide();
    }
  }

  render() {
    if (!this.open) return null;

    const entityName = this.entityType === 'project' ? 'Project' : 'Conversation';

    return (
      <div class="backdrop modal-backdrop-enter" onMouseDown={e => this.handleMouseDown(e)} onMouseUp={e => this.handleMouseUp(e)}>
        <div class="modal-card modal-surface-enter" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <h3 id="modal-title">Rename {entityName}</h3>

            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()} />
          </div>

          <div class="modal-body">
            <p class="modal-description">Choose a new name for this {this.entityType}.</p>

            <sl-input
              value={this.newName}
              ref={(element: HTMLElement | undefined) => this.bindNameInputElement(element as HTMLElement | undefined)}
              onKeyDown={(e: KeyboardEvent) => this.handleKeyDown(e)}
              autofocus
            />
          </div>

          <div class="modal-footer">
            <sl-button variant="primary" onClick={() => this.saveRename()} disabled={this.newName.trim() === ''}>
              Rename
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
