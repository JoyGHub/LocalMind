import { Component, h, Method, Prop, State, Event, EventEmitter } from '@stencil/core';
import { OllamaModel } from '../../components';
import { Alert } from '../../services/alert.service';
import { settingsService, settingsState } from '../../services/settings.service';
import { deleteOllamaModel, installOllamaModel } from './ollama-models.api';

@Component({
  tag: 'localmind-models',
  styleUrl: 'localmind-models.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindModels {
  @Prop({ mutable: true }) models: OllamaModel[] = [];
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  @State() modelDownloadVisible!: boolean;
  @State() modelToDelete: string | null = null;
  @State() progress: number = 0;
  @State() statusMessage: string = '';
  @State() isInstalling: boolean = false;
  @State() isDeleting: boolean = false;
  @State() modelName = '';

  @Event() modelsUpdatedEvent!: EventEmitter<any>;

  async installOllamaModel() {
    const modelName = this.modelName.trim();
    if (!modelName) {
      Alert.error('Please enter a valid model name.');
      return;
    }

    this.progress = 0;
    this.statusMessage = 'Starting download...';
    this.isInstalling = true;

    try {
      await installOllamaModel(modelName, update => {
        this.statusMessage = update.status;
        this.progress = update.progress;
      });
      Alert.success(`Model ${modelName} has been successfully installed.`);
      this.modelsUpdatedEvent.emit();
      this.modelName = '';
    } catch (error: unknown) {
      Alert.error(`Failed to install model: ${this.getErrorMessage(error)}`);
      this.statusMessage = 'Installation failed.';
    } finally {
      this.isInstalling = false;
    }
  }

  async confirmDeleteModel() {
    if (!this.modelToDelete) return;

    const tempModelToDelete = this.modelToDelete.trim();
    if (this.isDeleting) return;
    this.isDeleting = true;

    try {
      await deleteOllamaModel(tempModelToDelete);
      this.modelsUpdatedEvent.emit();
      Alert.success(`Model ${tempModelToDelete} has been deleted successfully.`);
    } catch (error: unknown) {
      Alert.error(`Failed to delete model: ${this.getErrorMessage(error)}`);
    } finally {
      this.modelToDelete = null;
      this.isDeleting = false;
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  deleteModel(modelName: string) {
    this.modelToDelete = modelName;
  }

  setModelAsDefault(modelName: string) {
    if (settingsState.defaultModel === modelName) {
      Alert.success(`${modelName} is already the default model.`);
      return;
    }

    settingsService.updateSetting('defaultModel', modelName);
    settingsService.saveSettings();
    Alert.success(`${modelName} is now the default model.`);
  }

  @Method()
  async show() {
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
  }

  handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) this.hide();
  }

  async copyModelName(modelName: string) {
    try {
      await navigator.clipboard.writeText(modelName);
      Alert.success(`Copied to clipboard: ${modelName}`);
    } catch (error) {
      Alert.error('Failed to copy model name.');
    }
  }

  openModelOnOllamaSite(model: string) {
    window.open(`https://ollama.com/library/${encodeURIComponent(model)}`, '_blank', 'noopener,noreferrer');
  }

  async viewModelfile(modelName: string) {
    try {
      const response = await fetch('http://localhost:11434/api/show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (response.ok) {
        const data = await response.json();
        const modelfileContent = data.modelfile;
        if (typeof modelfileContent !== 'string') {
          Alert.error(`No modelfile was returned for ${modelName}.`);
          return;
        }

        const pathMatch = modelfileContent.match(/FROM\s+([A-Za-z]:\\[^\r\n]+)/);

        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1].trim();

          try {
            const proxyResponse = await fetch('http://localhost:5000/api/open-explorer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ path: filePath }),
            });
            if (!proxyResponse.ok) throw new Error(`Proxy returned status ${proxyResponse.status}.`);
          } catch (proxyError) {
            console.error(proxyError);
            Alert.error('Failed to contact Python proxy to open File Explorer.');
          }
        } else {
          Alert.error(`No local file path was found in the modelfile for ${modelName}.`);
        }
      } else {
        const error = await response.json();
        Alert.error(`Failed to fetch modelfile: ${error.error}`);
      }
    } catch (error: unknown) {
      Alert.error(`Network error: ${this.getErrorMessage(error)}`);
    }
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onClick={event => this.handleBackdropClick(event)}>
        <div class="card">
          <div class="card-content">
            <localmind-model-overview models={this.models} onCloseEvent={() => this.hide()} />
            <localmind-model-table
              models={this.models}
              defaultModel={settingsState.defaultModel}
              onCopyModelEvent={event => this.copyModelName(event.detail)}
              onViewModelfileEvent={event => this.viewModelfile(event.detail)}
              onOpenLibraryEvent={event => this.openModelOnOllamaSite(event.detail)}
              onSetDefaultEvent={event => this.setModelAsDefault(event.detail)}
              onDeleteModelEvent={event => this.deleteModel(event.detail)}
            ></localmind-model-table>
          </div>
          <localmind-model-download-section
            modelName={this.modelName}
            isInstalling={this.isInstalling}
            progress={this.progress}
            statusMessage={this.statusMessage}
            onModelInputEvent={event => (this.modelName = event.detail)}
            onInstallRequestedEvent={() => this.installOllamaModel()}
          ></localmind-model-download-section>
        </div>
        <localmind-model-delete-dialog
          modelName={this.modelToDelete}
          isDeleting={this.isDeleting}
          onCancelEvent={() => (this.modelToDelete = null)}
          onConfirmEvent={() => this.confirmDeleteModel()}
        ></localmind-model-delete-dialog>
      </div>
    );
  }
}
