import { Component, h, Prop } from '@stencil/core';

@Component({
  tag: 'localmind-splash',
  styleUrl: 'localmind-splash.css',
  shadow: true,
})
export class LocalMindSplash {
  @Prop() isReady: boolean = false;

  render() {
    return (
      <div class={`splash-overlay ${this.isReady ? 'fade-out' : ''}`}>
        <div class="loader-container">
          <div class="core-pulse"></div>
          <div class="core-glow"></div>
        </div>
        <h1 class="loading-text">Initiating LocalMind...</h1>
      </div>
    );
  }
}
