import { Component, EventEmitter, State, h, Event, Prop, Listen } from '@stencil/core';
import { Message, OllamaModel, ThinkingLevel } from '../../types/interfaces';
import { Alert } from '../../services/alert.service';
import { speechRecognitionService } from '../../services/speech-recognition.service';
import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_FILES_LIMIT } from '../../constants/constants';

@Component({
  tag: 'localmind-composer',
  styleUrl: 'localmind-composer.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindComposer {
  @Prop() models!: OllamaModel[];
  @Prop() selectedModel!: OllamaModel;
  @Prop() chatHistory!: Message[];
  @Prop() requestIsPending!: boolean;
  @Prop() isWritingAnswer!: boolean;
  @Prop() ollamaRunning: boolean;
  @Prop() thinkingLevel: ThinkingLevel = 'off';

  @State() promptText: string = '';
  @State() useWebSearch!: boolean;
  @State() attachedFiles!: File[];
  @State() isListening: boolean = false;

  @Event() promptEvent!: EventEmitter<{ text: string; files: File[] }>;
  @Event() cancelGenerationEvent!: EventEmitter<void>;
  @Event() modelSelectedEvent!: EventEmitter<OllamaModel>;
  @Event() thinkLevelEvent!: EventEmitter<ThinkingLevel>;
  @Event() webSearchToggleEvent!: EventEmitter<boolean>;

  fileInputEl!: HTMLInputElement;
  textAreaEl!: HTMLTextAreaElement;
  modelsSelectEl!: HTMLSelectElement;
  thinkingMenuEl?: HTMLElement;
  basePromptText!: string;
  boundHandleSelectionChange = (event: any) => this.handleSelectionChange(event);
  boundHandleThinkingLevelChange = (event: Event) => this.handleThinkingLevelChange(event);

  componentDidLoad() {
    if (this.modelsSelectEl) {
      this.modelsSelectEl.addEventListener('sl-change', this.boundHandleSelectionChange);
    }
  }

  disconnectedCallback() {
    if (this.modelsSelectEl) {
      this.modelsSelectEl.removeEventListener('sl-change', this.boundHandleSelectionChange);
    }
    if (this.thinkingMenuEl) {
      this.thinkingMenuEl.removeEventListener('sl-select', this.boundHandleThinkingLevelChange);
    }
    this.stopListening();
  }

  setThinkingMenuElement(menu: HTMLElement | undefined) {
    if (this.thinkingMenuEl === menu) return;

    this.thinkingMenuEl?.removeEventListener('sl-select', this.boundHandleThinkingLevelChange);
    this.thinkingMenuEl = menu;
    this.thinkingMenuEl?.addEventListener('sl-select', this.boundHandleThinkingLevelChange);
  }

  handleSelectionChange(event: any) {
    let selectedValue: string = event.target.value;
    let model = this.models.find(m => m.model === selectedValue);

    if (model) this.modelSelectedEvent.emit(model);
  }

  sendPromptViaEnter(event: any) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPrompt();
    }
  }

  sendPromptViaButton() {
    this.submitPrompt();
  }

  cancelGeneration() {
    this.cancelGenerationEvent.emit();
  }

  submitPrompt() {
    if (this.requestIsPending || this.isWritingAnswer) return;

    this.stopListening();

    const hasText = this.promptText.trim().length > 0;
    const hasFiles = this.attachedFiles && this.attachedFiles.length > 0;

    if (hasText || hasFiles) {
      this.promptEvent.emit({
        text: this.promptText.trim(),
        files: this.attachedFiles || [],
      });

      this.promptText = '';

      if (this.textAreaEl) {
        this.textAreaEl.value = '';
      }

      this.attachedFiles = [];
      this.resetFileInput();
      this.resetTextareaHeight();
    }
  }

  handleInputChange(e: any) {
    this.promptText = e.target.value;
    this.resizeTextarea();
  }

  toggleWebSearch() {
    this.useWebSearch = !this.useWebSearch;
    this.webSearchToggleEvent.emit(this.useWebSearch);
  }

  handleThinkingLevelChange(event: Event) {
    const selectedLevel = (event as CustomEvent<{ item?: { value?: string } }>).detail?.item?.value;
    if (selectedLevel !== 'off' && selectedLevel !== 'low' && selectedLevel !== 'medium' && selectedLevel !== 'high') return;

    this.thinkLevelEvent.emit(selectedLevel);
  }

  resetTextareaHeight() {
    if (!this.textAreaEl) return;
    this.textAreaEl.style.height = 'auto';
  }

  resizeTextarea() {
    if (!this.textAreaEl) return;
    this.textAreaEl.style.height = 'auto';
    this.textAreaEl.style.height = `${this.textAreaEl.scrollHeight}px`;
  }

  //#region Speech Recognition Functions

  stopListening() {
    speechRecognitionService.stopListening();
    this.isListening = false;
  }

  handleSpeechResult(transcript: string, _isFinal: boolean) {
    if (!this.isListening) return;

    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) return;

    this.promptText = this.basePromptText ? `${this.basePromptText} ${cleanTranscript}` : cleanTranscript;
  }

  toggleMicrophone() {
    if (!speechRecognitionService.isSupported()) {
      Alert.error('Speech recognition is not supported by this browser.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    this.basePromptText = this.promptText ? this.promptText.trim() : '';
    this.isListening = true;

    speechRecognitionService.startListening(
      (transcript: string, isFinal: boolean) => this.handleSpeechResult(transcript, isFinal),
      () => {
        this.isListening = false;
      },
    );
  }

  //#endregion

  //#region Attachment Functions

  @Listen('dragover', { target: 'document', passive: false })
  handleDocumentDragOver(event: DragEvent) {
    event.preventDefault();
  }

  @Listen('drop', { target: 'document', passive: false })
  handleDocumentDrop(event: DragEvent) {
    event.preventDefault();

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.processDroppedFiles(files);
    }
  }

  processDroppedFiles(files: File[]) {
    const currentCount = this.attachedFiles?.length || 0;

    if (currentCount + files.length > MAX_FILES_LIMIT) {
      Alert.error(`You can only attach up to ${MAX_FILES_LIMIT} files at once.`);
      return;
    }

    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size === 0) {
        Alert.error(`"${file.name}" is empty and cannot be attached.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        Alert.error(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        continue;
      }

      const isDuplicate = (this.attachedFiles || []).some(existingFile => existingFile.name === file.name && existingFile.size === file.size);

      if (isDuplicate) {
        Alert.error(`"${file.name}" is already attached.`);
        continue;
      }

      validFiles.push(file);
    }

    this.attachedFiles = [...(this.attachedFiles || []), ...validFiles];
  }

  onAttachFiles = () => {
    this.fileInputEl?.click();
  };

  onFilesSelected = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const newFiles = Array.from(input.files ?? []);

    const currentCount = this.attachedFiles?.length || 0;
    if (currentCount + newFiles.length > MAX_FILES_LIMIT) {
      Alert.error(`You can only attach up to ${MAX_FILES_LIMIT} files at once.`);
      this.resetFileInput();
      return;
    }

    const validNewFiles: File[] = [];

    for (const file of newFiles) {
      if (file.size === 0) {
        Alert.error(`"${file.name}" is empty and cannot be attached.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        Alert.error(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        continue;
      }

      const isDuplicate = (this.attachedFiles || []).some(existingFile => existingFile.name === file.name && existingFile.size === file.size);

      if (isDuplicate) {
        Alert.error(`"${file.name}" is already attached.`);
        continue;
      }

      validNewFiles.push(file);
    }

    this.attachedFiles = [...(this.attachedFiles || []), ...validNewFiles];
    this.resetFileInput();
  };

  resetFileInput() {
    if (this.fileInputEl) {
      this.fileInputEl.value = '';
    }
  }

  handleRemoveFile(event: CustomEvent<File>) {
    const fileToRemove = event.detail;
    this.attachedFiles = this.attachedFiles.filter(file => file !== fileToRemove);
  }

  //#endregion

  render() {
    const hasHistory = this.chatHistory && this.chatHistory.length > 0;
    const hasVision = this.selectedModel?.capabilities?.includes('vision');
    const baseString = ACCEPTED_FILE_EXTENSIONS.map(ext => `.${ext}`).join(',');
    const acceptedFileTypes = hasVision ? `image/*,${baseString}` : baseString;

    return (
      <div
        class={{
          'wrapper': true,
          'at-bottom': hasHistory,
        }}
      >
        <localmind-welcome chatHistory={this.chatHistory} attachedFiles={this.attachedFiles}></localmind-welcome>
        <localmind-attached-files files={this.attachedFiles} onRemoveFileEvent={e => this.handleRemoveFile(e)}></localmind-attached-files>
        <div class="input-wrapper">
          <textarea
            ref={el => (this.textAreaEl = el as HTMLTextAreaElement)}
            class="input-header"
            placeholder="Ask anything"
            value={this.promptText}
            rows={1}
            onInput={e => this.handleInputChange(e)}
            onKeyPress={e => this.sendPromptViaEnter(e)}
          ></textarea>

          <div class="input-footer">
            <div class="input-footer-left">
              <sl-tooltip content="Attach file" placement="top">
                <sl-icon-button name="paperclip" label="Attach file" onClick={this.onAttachFiles}></sl-icon-button>
              </sl-tooltip>
              <div class={this.useWebSearch ? 'search-toggle-wrapper active' : 'search-toggle-wrapper'}>
                <sl-tooltip content={this.useWebSearch ? 'Disable Web Search' : 'Web Search'} placement="top">
                  <sl-icon-button name="globe" onClick={() => this.toggleWebSearch()}></sl-icon-button>
                </sl-tooltip>
              </div>
              {this.selectedModel?.capabilities?.includes('thinking') && (
                <sl-dropdown class="thinking-level-dropdown" placement="top-start" hoist>
                  <button
                    slot="trigger"
                    type="button"
                    class="thinking-level-trigger"
                    aria-label={`Thinking level: ${this.thinkingLevel}`}
                    aria-haspopup="menu"
                  >
                    <sl-icon name="mortarboard-fill" aria-hidden="true"></sl-icon>
                    <span>{this.thinkingLevel.charAt(0).toUpperCase() + this.thinkingLevel.slice(1)}</span>
                    <sl-icon class="thinking-level-chevron" name="chevron-down" aria-hidden="true"></sl-icon>
                  </button>
                  <sl-menu ref={(el: HTMLElement | undefined) => this.setThinkingMenuElement(el as HTMLElement | undefined)}>
                    {(['off', 'low', 'medium', 'high'] as ThinkingLevel[]).map(level => (
                      <sl-menu-item value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                        {this.thinkingLevel === level && <sl-icon slot="suffix" name="check2"></sl-icon>}
                      </sl-menu-item>
                    ))}
                  </sl-menu>
                </sl-dropdown>
              )}
              <input type="file" accept={acceptedFileTypes} multiple hidden ref={el => (this.fileInputEl = el as HTMLInputElement)} onChange={this.onFilesSelected} />
            </div>
            <div class="input-footer-right">
              <sl-select filled class="models-dropdown" disabled={!this.ollamaRunning} value={this.selectedModel?.model} ref={(el: any) => (this.modelsSelectEl = el as any)} placement="top" hoist>
                <div slot="prefix" class="selected-value-display">
                  <span class="selected-name">{this.selectedModel?.model || 'Choose a model'}</span>
                  {this.selectedModel && <span class="selected-divider">|</span>}
                  <span class="selected-size">{this.selectedModel?.formattedSize}</span>
                </div>

                {this.models.map((model: OllamaModel) => (
                  <sl-option key={model.model} value={model.model}>
                    <div class="dropdown-option">
                      <span>{model.model}</span>
                      <span class="dropdown-option-size">{model.formattedSize}</span>
                    </div>
                  </sl-option>
                ))}
              </sl-select>

              <sl-tooltip content={this.isListening ? 'Stop microphone' : 'Use Microphone'} placement="top">
                <div class={this.isListening ? 'search-toggle-wrapper active' : 'search-toggle-wrapper'}>
                  <sl-icon-button
                    disabled={this.requestIsPending || this.isWritingAnswer}
                    name="mic"
                    label="Use Microphone"
                    onClick={() => this.toggleMicrophone()}
                  ></sl-icon-button>
                </div>
              </sl-tooltip>

              <sl-tooltip content={this.isWritingAnswer ? 'Cancel response' : 'Send'} placement="top">
                <sl-icon-button
                  class="send-button"
                  disabled={this.isWritingAnswer ? false : this.requestIsPending || !this.ollamaRunning}
                  name={this.isWritingAnswer ? 'stop-fill' : 'send'}
                  label={this.isWritingAnswer ? 'Cancel response' : 'Send'}
                  onClick={() => (this.isWritingAnswer ? this.cancelGeneration() : this.sendPromptViaButton())}
                ></sl-icon-button>
              </sl-tooltip>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
