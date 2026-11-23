import { Component, Event, EventEmitter, h, Prop } from '@stencil/core';

@Component({
  tag: 'localmind-model-delete-dialog',
  styleUrl: 'localmind-model-delete-dialog.css',
  shadow: true,
})
export class LocalmindModelDeleteDialog {
  @Prop() modelName: string | null = null;
  @Prop() isDeleting: boolean = false;

  @Event({ bubbles: true, composed: true }) cancelEvent!: EventEmitter<void>;
  @Event({ bubbles: true, composed: true }) confirmEvent!: EventEmitter<void>;

  render() {
    if (!this.modelName) return null;

    return (
      <div class="confirmation-dialog-wrapper">
        <div class="confirmation-dialog-header">Confirm Deletion</div>
        <div class="confirmation-dialog">
          <p>
            Are you sure you want to delete the model <strong>{this.modelName}</strong>?
          </p>
          <div class="dialog-actions">
            <sl-button outline variant="neutral" disabled={this.isDeleting} onClick={() => this.cancelEvent.emit()}>
              Cancel
            </sl-button>
            <sl-button variant="danger" loading={this.isDeleting} onClick={() => this.confirmEvent.emit()}>
              Delete
            </sl-button>
          </div>
        </div>
      </div>
    );
  }
}
