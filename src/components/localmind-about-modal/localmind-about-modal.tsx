import { Component, h, Method, Prop } from '@stencil/core';

@Component({
  tag: 'localmind-about-modal',
  styleUrl: 'localmind-about-modal.css',
  shadow: true,
})
export class LocalmindAboutModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  isMouseDownOnBackdrop: boolean = false;

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
  }

  handleMouseDown(event: MouseEvent) {
    this.isMouseDownOnBackdrop = (event.target as HTMLElement).classList.contains('backdrop');
  }

  handleMouseUp(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isMouseDownOnBackdrop && target.classList.contains('backdrop')) {
      this.hide();
    }
    this.isMouseDownOnBackdrop = false;
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={event => this.handleMouseDown(event)} onMouseUp={event => this.handleMouseUp(event)}>
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="about-title">
          <div class="modal-header">
            <div class="title-group">
              <div class="app-icon" aria-hidden="true">
                <sl-icon name="stars"></sl-icon>
              </div>
              <div>
                <h2 id="about-title">About LocalMind</h2>
                <p class="subtitle">Private AI, running locally.</p>
              </div>
            </div>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>

          <div class="modal-body">
            <p class="description">
              LocalMind is an open-source app for chatting with AI models on your own device, powered by Ollama.
            </p>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Created by</span>
                <span class="detail-value">Rizea Daniel-Stefan</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">License</span>
                <a class="detail-value link" href="https://github.com/JoyGHub/LocalMind/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
                  MIT License <sl-icon name="box-arrow-up-right" aria-hidden="true"></sl-icon>
                </a>
              </div>
              <div class="detail-row">
                <span class="detail-label">Source code</span>
                <a class="detail-value link" href="https://github.com/JoyGHub/LocalMind" target="_blank" rel="noopener noreferrer">
                  GitHub repository <sl-icon name="box-arrow-up-right" aria-hidden="true"></sl-icon>
                </a>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <span>Copyright © 2026 Rizea Daniel-Stefan</span>
            <sl-button variant="default" size="small" onClick={() => this.hide()}>
              Close
            </sl-button>
          </div>
        </section>
      </div>
    );
  }
}
