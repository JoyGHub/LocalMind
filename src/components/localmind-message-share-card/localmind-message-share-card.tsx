import { Component, h, Prop, Event, EventEmitter, Method } from '@stencil/core';
import { Message } from '../../types/interfaces';
import { Alert } from '../../services/alert.service';

@Component({
  tag: 'localmind-message-share-card',
  styleUrl: 'localmind-message-share-card.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindMessageShareCard {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;
  @Prop() message!: Message;

  @Event({ bubbles: true, composed: true }) closed!: EventEmitter<void>;

  private mousedownOnBackdrop = false;

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.closed.emit();
  }

  private handleBackdropMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    this.mousedownOnBackdrop = target.classList.contains('backdrop');
  }

  private handleBackdropClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('backdrop') && this.mousedownOnBackdrop) {
      this.hide();
    }
    this.mousedownOnBackdrop = false;
  }

  private getShareUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#message-${this.message?.id || 'shared'}`;
  }

  private getPreviewText() {
    return this.message?.content?.trim() || 'Shared from LocalMind';
  }

  private async copyLink() {
    try {
      await navigator.clipboard.writeText(this.getShareUrl());
      Alert.success('Share link copied to clipboard.');
    } catch {
      Alert.error('Unable to copy the share link.');
    }
  }

  private openShareTarget(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private shareToX() {
    const text = encodeURIComponent(`Check out this LocalMind response: ${this.getShareUrl()}`);
    this.openShareTarget(`https://twitter.com/intent/tweet?text=${text}`);
  }

  private shareToLinkedIn() {
    this.openShareTarget(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.getShareUrl())}`);
  }

  private shareToReddit() {
    const title = encodeURIComponent('Shared from LocalMind');
    this.openShareTarget(`https://www.reddit.com/submit?url=${encodeURIComponent(this.getShareUrl())}&title=${title}`);
  }

  private shareToFacebook() {
    this.openShareTarget(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.getShareUrl())}`);
  }

  private shareToDiscord() {
    const message = encodeURIComponent(`Check out this LocalMind response: ${this.getShareUrl()}`);
    this.openShareTarget(`https://discord.com/channels/@me?message=${message}`);
  }

  render() {
    if (!this.open || !this.message) return null;

    const shareUrl = this.getShareUrl();

    return (
      <div class="backdrop" onMouseDown={e => this.handleBackdropMouseDown(e)} onClick={e => this.handleBackdropClick(e)}>
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <div class="eyebrow">Share response</div>
              <h3>Share this message</h3>
            </div>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>

          <div class="modal-body">
            <div class="content-card">
              <div class="content-header">
                <div class="avatar">
                  <sl-icon name="chat-square-text"></sl-icon>
                </div>
                <div>
                  <div class="label">Assistant reply</div>
                  <div class="model">{this.message.modelUsed?.model || 'LocalMind'}</div>
                </div>
              </div>
              <p>{this.getPreviewText()}</p>
            </div>

            <div class="share-grid">
              <div class="qr-card">
                <div class="qr-label">Scan to open</div>
                <sl-qr-code value={shareUrl} label="Share link QR code" size="170"></sl-qr-code>
                <div class="share-url">{shareUrl}</div>
              </div>

              <div class="actions-card">
                <sl-button variant="primary" class="primary-btn" onClick={() => this.copyLink()}>
                  <sl-icon slot="prefix" name="clipboard"></sl-icon>
                  Copy link
                </sl-button>

                <div class="social-buttons">
                  <sl-button variant="default" onClick={() => this.shareToX()}>
                    <sl-icon slot="prefix" name="twitter"></sl-icon>X
                  </sl-button>
                  <sl-button variant="default" onClick={() => this.shareToLinkedIn()}>
                    <sl-icon slot="prefix" name="linkedin"></sl-icon>
                    LinkedIn
                  </sl-button>
                  <sl-button variant="default" onClick={() => this.shareToReddit()}>
                    <sl-icon slot="prefix" name="reddit"></sl-icon>
                    Reddit
                  </sl-button>
                  <sl-button variant="default" onClick={() => this.shareToFacebook()}>
                    <sl-icon slot="prefix" name="facebook"></sl-icon>
                    Facebook
                  </sl-button>
                  <sl-button variant="default" onClick={() => this.shareToDiscord()}>
                    <sl-icon slot="prefix" name="discord"></sl-icon>
                    Discord
                  </sl-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
