import { Component, h, Prop } from '@stencil/core';

@Component({
  tag: 'localmind-setting-tab',
  styleUrl: 'localmind-setting-tab.css',
  shadow: true,
})
export class LocalMindSettingTab {
  @Prop() tabId!: string;
  @Prop() tabTitle!: string;
  @Prop() subtitle!: string;
  @Prop() icon!: string;
  @Prop() active: boolean = false;

  render() {
    return (
      <div class={`tab-container ${this.active ? 'active' : ''}`}>
        <sl-icon name={this.icon} class="tab-icon"></sl-icon>
        <div class="tab-content">
          <div class="tab-title-text">{this.tabTitle}</div>
          <div class="tab-subtitle">{this.subtitle}</div>
        </div>
      </div>
    );
  }
}
