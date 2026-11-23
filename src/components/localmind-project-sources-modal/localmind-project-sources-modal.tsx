import { Component, h, Method, Prop, State } from '@stencil/core';
import { ACCEPTED_FILE_EXTENSIONS } from '../../constants/constants';
import { attachmentService } from '../../services/attachment.service';
import { Alert } from '../../services/alert.service';
import { storeService } from '../../store/store';
import state from '../../store/store';
import { ProjectSource } from '../../types/interfaces';
import { formatBytes } from '../../utils/utils';

@Component({
  tag: 'localmind-project-sources-modal',
  styleUrl: 'localmind-project-sources-modal.css',
  shadow: true,
})
export class LocalMindProjectSourcesModal {
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  @State() isSaving = false;

  private fileInput!: HTMLInputElement;
  private entryModalEl!: HTMLLocalmindProjectSourceEntryModalElement;
  private isMouseDownOnBackdrop = false;

  @Method()
  async show() {
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

  private async handleFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.isSaving = true;
    const failedFiles: string[] = [];
    try {
      for (const file of files) {
        try {
          const processed = await attachmentService.processAttachments([file]);
          const content = processed.textContext.trim();
          if (!content) {
            throw new Error('No readable text was found in the file.');
          }
          const extension = file.name.split('.').pop()?.toUpperCase();
          await storeService.addProjectSource(
            this.createSource('file', file.name, content, {
              fileName: file.name,
              fileType: file.type || (extension && extension !== file.name ? extension : 'Unknown file type'),
              fileSize: file.size,
            }),
          );
        } catch (error) {
          failedFiles.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (failedFiles.length) {
        Alert.error(`Some files could not be added:\n${failedFiles.join('\n')}`);
      } else {
        Alert.success(files.length === 1 ? 'Source added.' : 'Sources added.');
      }
    } finally {
      this.isSaving = false;
    }
  }

  private async removeSource(source: ProjectSource) {
    try {
      await storeService.removeProjectSource(source.id);
    } catch (error) {
      Alert.error(`Failed to remove "${source.title}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={event => this.handleMouseDown(event)} onMouseUp={event => this.handleMouseUp(event)}>
        <div class="modal-card">
          <header class="modal-header">
            <div>
              <h2>Sources</h2>
              <p>Add files, links, or notes for conversations in this project.</p>
            </div>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </header>

          <div class="modal-body">
            <section class="source-actions" aria-label="Add a source">
              <sl-button class="action-button" onClick={() => this.fileInput.click()} disabled={this.isSaving}>
                <sl-icon slot="prefix" name="upload"></sl-icon>
                Upload files
              </sl-button>
              <sl-button class="action-button" onClick={() => this.entryModalEl?.show('link')} disabled={this.isSaving}>
                <sl-icon slot="prefix" name="link-45deg"></sl-icon>
                Add links
              </sl-button>
              <sl-button class="action-button" onClick={() => this.entryModalEl?.show('text')} disabled={this.isSaving}>
                <sl-icon slot="prefix" name="clipboard"></sl-icon>
                Text
              </sl-button>
              <input
                class="file-input"
                type="file"
                multiple
                accept={ACCEPTED_FILE_EXTENSIONS.map(extension => `.${extension}`).join(',')}
                ref={element => (this.fileInput = element as HTMLInputElement)}
                onChange={event => this.handleFilesSelected(event)}
              />
            </section>

            <section class="added-sources" aria-label="Added sources">
              <div class="sources-heading">
                <h3>Added sources</h3>
                <span>{state.activeProjectSources.length}</span>
              </div>
              {state.activeProjectSources.length ? (
                <div class="sources-list">
                  {state.activeProjectSources.map(source => (
                    <article class="source-card" key={source.id}>
                      <div class="source-card-header">
                        <sl-icon name={source.type === 'file' ? 'file-earmark-text' : source.type === 'link' ? 'link-45deg' : 'clipboard'}></sl-icon>
                        <div class="source-details">
                          <div class="source-title" title={source.title}>
                            {source.title}
                          </div>
                          {source.type === 'file' && (
                            <div class="source-metadata">
                              <span>{source.fileType || source.fileName?.split('.').pop()?.toUpperCase() || 'Unknown file type'}</span>
                              {source.fileSize !== undefined && <span>{formatBytes(source.fileSize)}</span>}
                            </div>
                          )}
                          {source.type === 'link' && source.url && (
                            <a class="source-url" href={source.url} target="_blank" rel="noopener noreferrer" title={source.url}>
                              {source.url}
                            </a>
                          )}
                          {source.type === 'text' && (
                            <p class="source-preview" title={source.content}>
                              {source.content}
                            </p>
                          )}
                        </div>
                        <sl-icon-button name="trash" label={`Remove ${source.title}`} onClick={() => this.removeSource(source)}></sl-icon-button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div class="empty-state">
                  <sl-icon name="journal-text"></sl-icon>
                  <p>No sources added yet</p>
                </div>
              )}
            </section>
          </div>
        </div>
        <localmind-project-source-entry-modal ref={element => (this.entryModalEl = element as HTMLLocalmindProjectSourceEntryModalElement)}></localmind-project-source-entry-modal>
      </div>
    );
  }
}
