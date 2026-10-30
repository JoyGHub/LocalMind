import { Component, State, h, Listen } from '@stencil/core';

@Component({
  tag: 'localmind-attachment-overlay',
  styleUrl: 'localmind-attachment-overlay.css',
  shadow: true,
})
export class LocalMindAttachmentOverlay {
  @State() isVisible: boolean = false;

  dragCounter: number = 0;

  @Listen('dragenter', { target: 'document', passive: false })
  handleDocumentDragEnter(event: DragEvent) {
    event.preventDefault();
    this.dragCounter++;
    if (this.dragCounter > 0) {
      this.isVisible = true;
    }
  }

  @Listen('dragover', { target: 'document', passive: false })
  handleDocumentDragOver(event: DragEvent) {
    event.preventDefault();
  }

  @Listen('dragleave', { target: 'document', passive: false })
  handleDocumentDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isVisible = false;
    }
  }

  @Listen('drop', { target: 'document', passive: false })
  handleDocumentDrop(event: DragEvent) {
    event.preventDefault();
    this.dragCounter = 0;
    this.isVisible = false;
  }

  render() {
    return (
      <div class={{ overlay: true, visible: this.isVisible }}>
        <div class="content">
          <sl-icon name="paperclip"></sl-icon>
          <p>Attach file</p>
        </div>
      </div>
    );
  }
}
