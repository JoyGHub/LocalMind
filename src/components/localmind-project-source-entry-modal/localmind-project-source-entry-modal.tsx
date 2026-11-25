import { Component, h, Method, Prop, State } from '@stencil/core';
import { Alert } from '../../services/alert.service';
import { storeService } from '../../store/store';
import state from '../../store/store';
import { ProjectSource } from '../../types/interfaces';

type SourceEntryMode = 'link' | 'text';
type TextInputElement = HTMLElement & { value: string };

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

  isMouseDownOnBackdrop = false;
  linkInputEl?: TextInputElement;
  textInputEl?: TextInputElement;

  handleLinkInput = () => {
    this.linkUrl = this.linkInputEl?.value ?? '';
  };

  handleTextInput = () => {
    this.textContent = this.textInputEl?.value ?? '';
  };

  bindLinkInputElement(element: HTMLElement | undefined) {
    if (this.linkInputEl === element) return;

    this.linkInputEl?.removeEventListener('sl-input', this.handleLinkInput);
    this.linkInputEl = element as TextInputElement | undefined;
    this.linkInputEl?.addEventListener('sl-input', this.handleLinkInput);
  }

  bindTextInputElement(element: HTMLElement | undefined) {
    if (this.textInputEl === element) return;

    this.textInputEl?.removeEventListener('sl-input', this.handleTextInput);
    this.textInputEl = element as TextInputElement | undefined;
    this.textInputEl?.addEventListener('sl-input', this.handleTextInput);
  }

  connectedCallback() {
    this.linkInputEl?.addEventListener('sl-input', this.handleLinkInput);
    this.textInputEl?.addEventListener('sl-input', this.handleTextInput);
  }

  disconnectedCallback() {
    this.linkInputEl?.removeEventListener('sl-input', this.handleLinkInput);
    this.textInputEl?.removeEventListener('sl-input', this.handleTextInput);
  }

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

  handleMouseDown(event: MouseEvent) {
    this.isMouseDownOnBackdrop = (event.target as HTMLElement).classList.contains('backdrop');
  }

  handleMouseUp(event: MouseEvent) {
    if (this.isMouseDownOnBackdrop && (event.target as HTMLElement).classList.contains('backdrop')) {
      this.hide();
    }

    this.isMouseDownOnBackdrop = false;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }

    if (event.key === 'Enter') {
      if (this.mode === 'link') {
        event.preventDefault();
        this.addLink();
      } else if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        this.addText();
      }
    }
  }

  createSource(type: ProjectSource['type'], title: string, content: string, extras: Partial<ProjectSource> = {}): ProjectSource {
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

  async addLink() {
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

  async addText() {
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

  render() {
    if (!this.open) return null;

    const isLink = this.mode === 'link';

    return (
      <div class="backdrop" onMouseDown={event => this.handleMouseDown(event)} onMouseUp={event => this.handleMouseUp(event)}>
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={event => this.handleKeyDown(event)}>
          <header class="modal-header">
            <div>
              <h2 id="modal-title">{isLink ? 'Add link' : 'Add text'}</h2>

              <p>{isLink ? 'Save a webpage URL to this project’s sources.' : 'Paste text to add it to this project’s sources.'}</p>
            </div>

            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()} />
          </header>

          <div class="modal-body">
            {isLink ? (
              <sl-input
                label="URL"
                name="url"
                type="url"
                placeholder="https://example.com"
                value={this.linkUrl}
                ref={(element: HTMLElement | undefined) => this.bindLinkInputElement(element as HTMLElement | undefined)}
              />
            ) : (
              <sl-textarea
                label="Text"
                name="text"
                rows={8}
                resize="auto"
                value={this.textContent}
                ref={(element: HTMLElement | undefined) => this.bindTextInputElement(element as HTMLElement | undefined)}
              />
            )}
          </div>

          <footer class="modal-footer">
            <sl-button
              variant="primary"
              onClick={() => (isLink ? this.addLink() : this.addText())}
              disabled={this.isSaving || (isLink ? !this.linkUrl.trim() : !this.textContent.trim())}
              loading={this.isSaving}
            >
              {this.isSaving ? 'Saving…' : isLink ? 'Add link' : 'Save'}
            </sl-button>
          </footer>
        </section>
      </div>
    );
  }
}
