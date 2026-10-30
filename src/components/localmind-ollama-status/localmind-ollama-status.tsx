import { Component, h, Prop, Host } from '@stencil/core';

@Component({
  tag: 'localmind-ollama-status',
  styleUrl: 'localmind-ollama-status.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindOllamaStatus {
  @Prop() ollamaRunning!: boolean;

  render() {
    return (
      <Host>
        <div class="status-card" tabindex="0">
          <div class="status-left">
            <div class="pulse-container">
              <span class={`pulse-ring ${this.ollamaRunning ? 'connected' : 'disconnected'}`}></span>
              <span class={`pulse-dot ${this.ollamaRunning ? 'connected' : 'disconnected'}`}></span>
            </div>

            <div class="status-text">
              <div class="primary-text">
                <span class="label">Ollama:</span>
                <span class={`status ${this.ollamaRunning ? 'connected' : 'disconnected'}`}>{this.ollamaRunning ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div class="sub-text">127.0.0.1:11434</div>
            </div>
          </div>

          <sl-icon class="chevron" name="chevron-right"></sl-icon>
        </div>
      </Host>
    );
  }
}
