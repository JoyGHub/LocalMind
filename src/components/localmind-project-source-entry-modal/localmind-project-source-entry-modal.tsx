import { Component, h, Method, Prop, State } from '@stencil/core';
import { Alert } from '../../services/alert.service';
import { storeService } from '../../store/store';
import state from '../../store/store';
import { ProjectSource } from '../../types/interfaces';

type SourceEntryMode = 'link' | 'text';

@Component({
  tag: 'localmind-project-source-entry-modal',
  styleUrl: 'localmind-project-source-entry-modal.css',
  shadow: true,
})
export class LocalMindProjectSourceEntryModal {
  @Prop({ mutable: true, reflect: true }) open = false;
  @Prop({ mutable: true }) mode: SourceEntryMode = 'link';

  @State() linkUrl = '';
  @State() textContent = '';
  @State() isSaving = false;

  private isMouseDownOnBackdrop = false;

  @Method()
  async show(mode: SourceEntryMode) {
    this.mode = mode;
    this.linkUrl = '';
    this.textContent = '';
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
  }

  private handleMouseDown(event: MouseEvent) {
    this.isMouseDownOnBackdrop = (event.target as HTMLElement).classList.contains('backdrop');
  }

  private handleMouseUp(event: MouseEvent) {
    if (this.isMouseDownOnBackdrop && (event.target as HTMLElement).classList.contains('backdrop')) {
      this.hide();
    }
    this.isMouseDownOnBackdrop = false;
  }

  private createSource(type: ProjectSource['type'], title: string, content: string, extras: Partial<ProjectSource> = {}): ProjectSource {
    if (!state.activeProjectId) {
      throw new Error('Select a project before adding sources.');
    }

    return {
      id: crypto.randomUUID(),
      projectId: state.activeProjectId,
      type,
      title,
      content,
      createdAt: Date.now(),
      ...extras,
    };
  }

  private async addLink() {
    const value = this.linkUrl.trim();
    if (!value || this.isSaving) {
      if (!value) Alert.error('Enter a URL.');
      return;
    }

    this.isSaving = true;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS links can be added.');
      }

      await storeService.addProjectSource(this.createSource('link', url.hostname, '', { url: value }));
      await this.hide();
      Alert.success('Link added.');
    } catch (error) {
      Alert.error(`Failed to add link: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSaving = false;
    }
  }

  private async addText() {
    const content = this.textContent.trim();
    if (this.isSaving) return;
    if (!content) {
      Alert.error('Enter text to save.');
      return;
    }

    this.isSaving = true;
    try {
      await storeService.addProjectSource(this.createSource('text', 'Text', content));
      await this.hide();
      Alert.success('Text added.');
    } catch (error) {
      Alert.error(`Failed to add text: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSaving = false;
    }
  }

  private updateLinkUrl(event: Event) {
    this.linkUrl = (event.currentTarget as HTMLInputElement).value;
  }

  private updateTextContent(event: Event) {
    this.textContent = (event.currentTarget as HTMLTextAreaElement).value;
  }

  render() {
    if (!this.open) return null;

    const isLink = this.mode === 'link';

    return (
      <div class="backdrop" onMouseDown={event => this.handleMouseDown(event)} onMouseUp={event => this.handleMouseUp(event)}>
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header class="modal-header">
            <div>
              <h2 id="modal-title">{isLink ? 'Add links' : 'Add text'}</h2>
              <p>{isLink ? 'Save a webpage URL to this project’s sources.' : 'Paste text to add it to this project’s sources.'}</p>
            </div>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </header>

          <div class="modal-body">
            {isLink ? (
              <sl-input
                label="URL"
                name="url"
                type="url"
                placeholder="https://example.com"
                value={this.linkUrl}
                onInput={event => this.updateLinkUrl(event)}
                onSlInput={event => this.updateLinkUrl(event)}
              ></sl-input>
            ) : (
              <sl-textarea
                label="Text"
                name="text"
                rows={8}
                resize="auto"
                value={this.textContent}
                onInput={event => this.updateTextContent(event)}
                onSlInput={event => this.updateTextContent(event)}
              ></sl-textarea>
            )}
          </div>

          <footer class="modal-footer">
            <sl-button onClick={() => this.hide()} disabled={this.isSaving}>Cancel</sl-button>
            <sl-button
              variant="primary"
              onClick={() => (isLink ? this.addLink() : this.addText())}
              disabled={this.isSaving}
            >
              {this.isSaving ? 'Saving…' : isLink ? 'Add link' : 'Save'}
            </sl-button>
          </footer>
        </section>
      </div>
    );
  }
}
