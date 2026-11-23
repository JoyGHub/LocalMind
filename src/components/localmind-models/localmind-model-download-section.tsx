import { Component, Event, EventEmitter, h, Prop } from '@stencil/core';

@Component({
  tag: 'localmind-model-download-section',
  styleUrl: 'localmind-model-download-section.css',
  shadow: true,
})
export class LocalmindModelDownloadSection {
  @Prop() modelName: string = '';
  @Prop() isInstalling: boolean = false;
  @Prop() progress: number = 0;
  @Prop() statusMessage: string = '';

  @Event({ bubbles: true, composed: true }) modelInputEvent!: EventEmitter<string>;
  @Event({ bubbles: true, composed: true }) installRequestedEvent!: EventEmitter<void>;

  private handleInputChange(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.modelInputEvent.emit(target.value || '');
  }

  render() {
    return (
      <div class="download-section">
        <div class="download-header">
          <div class="icon-box primary-light">
            <sl-icon name="download"></sl-icon>
          </div>
          <div>
            <div class="main-title">Download a Model</div>
            <div class="sub-title">Search and install models from the Ollama library.</div>
          </div>
        </div>

        <div class="download-controls">
          <sl-input
            disabled={this.isInstalling}
            class="model-input"
            placeholder="Search for a model (e.g. gemma4:12b, qwen3.5:9b, llama3.1:8b)"
            clearable
            value={this.modelName}
            onInput={(event: InputEvent) => this.handleInputChange(event)}
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>

          {this.modelName.trim() ? (
            <sl-button variant="primary" class="primary-btn" disabled={this.isInstalling} loading={this.isInstalling} onClick={() => this.installRequestedEvent.emit()}>
              Install Model
            </sl-button>
          ) : (
            <sl-button class="primary-btn" href="https://ollama.com/search" target="_blank" rel="noopener noreferrer">
              Browse Ollama Library <sl-icon name="box-arrow-up-right" slot="suffix"></sl-icon>
            </sl-button>
          )}
        </div>

        <div class="progress-container">
          {this.isInstalling ? (
            <div class="active-download">
              <sl-progress-bar value={this.progress} indeterminate={this.progress === 0}></sl-progress-bar>
              <span class="progress-status">{this.statusMessage}</span>
            </div>
          ) : (
            <div class="inactive-download">
              <sl-icon name="download"></sl-icon> No active downloads
            </div>
          )}
        </div>
      </div>
    );
  }
}
