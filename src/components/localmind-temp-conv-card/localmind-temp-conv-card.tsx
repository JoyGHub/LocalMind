import { Component, h, Prop } from '@stencil/core';

@Component({
  tag: 'localmind-temp-conv-card',
  styleUrl: 'localmind-temp-conv-card.css',
  shadow: true,
})
export class LocalMindTempConvCard {
  @Prop() isActive: boolean = false;

  render() {
    return (
      <div class={{ 'temp-card': true, 'active': this.isActive }}>
        <sl-icon name="lightning-fill"></sl-icon>
        <div class="temp-content">
          <strong>Temporary Chat Active</strong>
          <p>This conversation will not be saved to your history.</p>
        </div>
      </div>
    );
  }
}