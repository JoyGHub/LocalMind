import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { getIconForFile, formatBytes } from '../../utils/utils';

@Component({
  tag: 'localmind-attached-files',
  styleUrl: 'localmind-attached-files.css',
  shadow: true,
})
export class LocalMindAttachedFiles {
  @Prop() files!: File[];
  @Event() removeFileEvent!: EventEmitter<File>;

  handleRemove(file: File) {
    this.removeFileEvent.emit(file);
  }

  render() {
    if (!this.files || this.files.length === 0) return null;

    return (
      <div class="attached-files-container">
        {this.files.map(file => {
          const isImage = file.type.startsWith('image/');

          return (
            <div class="file-card" onClick={() => this.handleRemove(file)}>
              <div class="file-icon-container">
                {isImage ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} class="image-preview" />
                ) : (
                  <sl-icon name={getIconForFile(file)} class="icon-preview"></sl-icon>
                )}
              </div>

              <div class="file-details">
                <span class="file-name">{file.name}</span>
                <span class="file-size">{formatBytes(file.size)}</span>
              </div>

              <div class="remove-action">
                <sl-tooltip content={'Remove'} placement="right">
                  <sl-icon name="x-lg"></sl-icon>
                </sl-tooltip>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}