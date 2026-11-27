import { Component, Event, EventEmitter, h, Prop, State } from '@stencil/core';
import { downloadImageAsFormat, ImageDownloadFormat } from '../../utils/image-download';

@Component({
  tag: 'localmind-fullscreen-image',
  styleUrl: 'localmind-fullscreen-image.css',
  shadow: true,
})
export class LocalMindFullscreenImage {
  @Prop() src!: string;
  @Prop() alt = 'Fullscreen image';
  @Prop() fileName?: string;

  @Event() closeFullscreen!: EventEmitter<void>;

  @State() scale = 1;

  menuEl!: HTMLElement;
  minScale = 0.25;
  maxScale = 5;
  scaleStep = 0.15;

  componentDidLoad() {
    if (this.menuEl) {
      this.menuEl.addEventListener('sl-select', this.boundHandleMenuSelect);
    }
  }

  disconnectedCallback() {
    if (this.menuEl) {
      this.menuEl.removeEventListener('sl-select', this.boundHandleMenuSelect);
    }
  }

  boundHandleMenuSelect = (event: Event) => {
    const customEvent = event as CustomEvent<{ item: { value?: string } }>;
    const format = customEvent.detail?.item?.value as ImageDownloadFormat | undefined;
    if (!format) return;
    downloadImageAsFormat(this.src, format, this.fileName);
  };

  handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? this.scaleStep : -this.scaleStep;
    const nextScale = Math.min(this.maxScale, Math.max(this.minScale, Number((this.scale + delta).toFixed(2))));
    this.scale = nextScale;
  };

  handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      this.closeFullscreen.emit();
    }
  };

  handleDownloadTriggerClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  render() {
    const zoomPercent = Math.round(this.scale * 100);

    return (
      <div class="fullscreen-backdrop" onClick={this.handleBackdropClick} onWheel={this.handleWheel}>
        <div class="fullscreen-stage" onClick={this.handleBackdropClick}>
          <img src={this.src} alt={this.alt} class="fullscreen-image" style={{ transform: `scale(${this.scale})` }} />
        </div>

        <div class="zoom-indicator">{zoomPercent}%</div>

        <div class="fullscreen-download-control" onClick={this.handleDownloadTriggerClick}>
          <sl-dropdown placement="top-end" hoist>
            <span slot="trigger" class="download-icon-trigger" role="button" tabindex={0} aria-label="Download image">
              <sl-icon name="download"></sl-icon>
            </span>
            <sl-menu ref={(el: any) => (this.menuEl = el as any)}>
              <sl-menu-item value="png">PNG</sl-menu-item>
              <sl-menu-item value="jpg">JPG</sl-menu-item>
              <sl-menu-item value="webp">WEBP</sl-menu-item>
              <sl-menu-item value="bmp">BMP</sl-menu-item>
              <sl-menu-item value="gif">GIF</sl-menu-item>
              <sl-menu-item value="ico">ICO</sl-menu-item>
            </sl-menu>
          </sl-dropdown>
        </div>
      </div>
    );
  }
}
