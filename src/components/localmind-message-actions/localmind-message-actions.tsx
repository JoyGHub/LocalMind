import { Component, h, Prop, Event, EventEmitter, State } from '@stencil/core';
import { Message } from '../../types/interfaces';
import { TtsService } from '../../services/tts.service';
import { formatAssistantTimestamp } from '../../utils/utils';

@Component({
  tag: 'localmind-message-actions',
  styleUrl: 'localmind-message-actions.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindMessageActions {
  @Prop() message: Message;
  @Prop() visible: boolean;
  @Prop() isLastMessage: boolean;

  @State() isShareModalOpen: boolean = false;

  @Event({ bubbles: true, composed: true }) listenRequestedEvent: EventEmitter<{ text: string }>;
  @Event({ bubbles: true, composed: true }) retryRequestedEvent: EventEmitter<string>;

  handleShareClick() {
    this.isShareModalOpen = true;
  }

  handleShareModalClosed() {
    this.isShareModalOpen = false;
  }

  handleListenClick() {
    this.listenRequestedEvent.emit({ text: this.message.content });
    TtsService.speak(this.message.content);
  }

  handleRetryClick() {
    this.retryRequestedEvent.emit(this.message.id);
  }

  render() {
    return (
      <div>
        <div
          class={{
            actions: true,
            visible: this.visible,
          }}
        >
          <sl-copy-button from={this.message.id} value={this.message.content} tooltipPlacement="bottom"></sl-copy-button>
          <sl-tooltip content="Share" placement="bottom">
            <sl-icon-button name="share-fill" label="Share" onClick={() => this.handleShareClick()}></sl-icon-button>
          </sl-tooltip>

          <sl-tooltip content="Listen" placement="bottom">
            <sl-icon-button name="volume-up-fill" label="Listen" onClick={() => this.handleListenClick()}></sl-icon-button>
          </sl-tooltip>
          <localmind-message-stats message={this.message}></localmind-message-stats>
          {this.isLastMessage && (
            <sl-tooltip content="Retry" placement="bottom">
              <sl-icon-button name="arrow-clockwise" label="Retry" onClick={() => this.handleRetryClick()}></sl-icon-button>
            </sl-tooltip>
          )}
          <div class="usedModel">
            {this.message.modelUsed?.model} | {formatAssistantTimestamp(this.message.timestamp)}
          </div>
        </div>
        <localmind-message-share-card open={this.isShareModalOpen} message={this.message} onClosed={() => this.handleShareModalClosed()}></localmind-message-share-card>
      </div>
    );
  }
}
