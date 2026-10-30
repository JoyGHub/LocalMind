import { Component, h, Method, Prop, State, Event, EventEmitter } from '@stencil/core';
import { OllamaModel } from '../../components';
import { Alert } from '../../services/alert.service';
import { settingsService, settingsState } from '../../services/settings.service';
import { bytesToGbMb } from '../../utils/utils';

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
  @State() modelName = '';

  @Event() modelsUpdatedEvent!: EventEmitter<any>;

  downloadStages: string[] = ['Pulling image...', 'Verifying sha256 digest...', 'Writing manifest..', 'Success.'];

  handleInputChange(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.modelName = target.value || '';
  }

  async installOllamaModel() {
    if (!this.modelName) {
      Alert.error('Please enter a valid model name.');
      return;
    }

    this.progress = 0;
    this.statusMessage = 'Starting download...';
    this.isInstalling = true;

    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: this.modelName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.error(`Failed to install model: ${error.error}`);
        this.statusMessage = 'Installation failed.';
        this.isInstalling = false;
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let isSuccessful = false;

      while (true) {
        const { done, value } = await reader?.read()!;
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        try {
          const parsedChunk = JSON.parse(chunk);
          if (parsedChunk.error) {
            Alert.error(`Failed to install model: ${parsedChunk.error}`);
            this.statusMessage = 'Installation failed.';
            this.isInstalling = false;
            return;
          }

          if (parsedChunk.status) {
            this.statusMessage = parsedChunk.status;

            const stageIndex = this.downloadStages.indexOf(parsedChunk.status);
            if (stageIndex !== -1) {
              this.progress = ((stageIndex + 1) / this.downloadStages.length) * 100;
            }

            if (parsedChunk.status === 'success') {
              Alert.success(`Model ${this.modelName.trim()} has been successfully installed.`);
              isSuccessful = true;
            }
          }
        } catch (error) {
          Alert.error('Error parsing chunk:' + error);
        }
      }

      if (isSuccessful) {
        this.modelsUpdatedEvent.emit();
        this.modelName = '';
      }
    } catch (error: any) {
      Alert.error(error);
      this.statusMessage = 'Installation failed due to a network issue.';
    } finally {
      this.isInstalling = false;
    }
  }

  async confirmDeleteModel() {
    if (!this.modelToDelete) return;

    const tempModelToDelete = this.modelToDelete.trim();

    try {
      const response = await fetch('http://localhost:11434/api/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: this.modelToDelete }),
      });

      if (response.ok) {
        this.modelsUpdatedEvent.emit();
        Alert.success(`Model ${tempModelToDelete} has been deleted successfully.`);
      } else {
        const error = await response.json();
        Alert.error(`Failed to delete model: ${error.error}`);
      }
    } catch (error: any) {
      Alert.error(`Network error: ${error.message}`);
    } finally {
      this.modelToDelete = null;
    }
  }

  calculateStats() {
    let totalSize = 0;
    const families = new Set<string>();
    const quantizations = new Set<string>();

    this.models.forEach(m => {
      totalSize += m.size || 0;
      if (m.details?.family) families.add(m.details.family);
      if (m.details?.quantization_level) quantizations.add(m.details.quantization_level);
    });

    return {
      modelsCount: this.models.length,
      totalSizeFormatted: bytesToGbMb(totalSize),
      familiesCount: families.size,
      quantizationsCount: quantizations.size,
    };
  }

  async deleteModel(modelName: string) {
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

  handleBackdropClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('backdrop')) {
      this.hide();
    }
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

        const pathMatch = modelfileContent.match(/FROM\s+([A-Za-z]:\\[^\r\n]+)/);

        if (pathMatch && pathMatch[1]) {
          const filePath = pathMatch[1].trim();

          try {
            await fetch('http://localhost:5000/api/open-explorer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ path: filePath }),
            });
          } catch (proxyError) {
            console.error(proxyError);
            Alert.error('Failed to contact Python proxy to open File Explorer.');
          }
        }
      } else {
        const error = await response.json();
        Alert.error(`Failed to fetch modelfile: ${error.error}`);
      }
    } catch (error: any) {
      Alert.error(`Network error: ${error.message}`);
    }
  }

  renderHeader() {
    return (
      <div class="header">
        <div class="header-left">
          <div class="icon-box primary">
            <sl-icon name="box"></sl-icon>
          </div>
          <div>
            <div class="main-title">Installed Models</div>
            <div class="sub-title">Manage your local Ollama models</div>
          </div>
        </div>
        <sl-icon-button name="x" class="close-btn" onClick={() => this.hide()}></sl-icon-button>
      </div>
    );
  }

  renderStats() {
    const stats = this.calculateStats();
    return (
      <div class="stats-container">
        <div class="stat-card">
          <div class="icon-box purple">
            <sl-icon name="boxes"></sl-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{stats.modelsCount}</div>
            <div class="stat-label">Models</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon-box blue">
            <sl-icon name="device-hdd"></sl-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{stats.totalSizeFormatted}</div>
            <div class="stat-label">Total Size</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon-box green">
            <sl-icon name="cpu"></sl-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{stats.familiesCount}</div>
            <div class="stat-label">Families</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon-box orange">
            <sl-icon name="speedometer2"></sl-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{stats.quantizationsCount}</div>
            <div class="stat-label">Quantization Levels</div>
          </div>
        </div>
      </div>
    );
  }

  renderTable() {
    if (this.models.length <= 0) {
      return (
        <div class="empty-state">
          <p>No models installed</p>
        </div>
      );
    }

    return (
      <div class="table-container">
        <div class="models-table">
          <div class="table-header">
            <div class="col-model">
              Model
              {/* <sl-icon name="chevron-expand"></sl-icon> */}
            </div>
            <div class="col-size">
              Size
              {/* <sl-icon name="chevron-expand"></sl-icon> */}
            </div>
            <div>Capabilities</div>
            <div>Format</div>
            <div>Parameters</div>
            <div>Quantization</div>
            <div class="col-actions">Actions</div>
          </div>
          <div class="table-body">
            {this.models.map(model => (
              <div class="table-row">
                <div class="col-model cell-model">
                  <div class="model-avatar">
                    <sl-icon name="robot"></sl-icon>
                  </div>
                  <div class="model-info">
                    <div class="model-name">
                      <span>{model.model}</span>
                      {settingsState.defaultModel === model.model && (
                        <sl-tooltip content="Default model" placement="bottom">
                          <sl-icon name="star-fill" class="default-star"></sl-icon>
                        </sl-tooltip>
                      )}
                    </div>
                    <div class="model-family-sub">{model.details?.family || 'unknown'}</div>
                  </div>
                </div>
                <div class="col-size">{bytesToGbMb(model.size)}</div>
                <div class="capabilities-cell">
                  {model.capabilities?.includes('vision') && (
                    <sl-tooltip content="Vision" placement="bottom">
                      <div class="badge badge-cap-vision">
                        <sl-icon name="eye-fill"></sl-icon>
                      </div>
                    </sl-tooltip>
                  )}
                  {model.capabilities?.includes('tools') && (
                    <sl-tooltip content="Tools" placement="bottom">
                      <div class="badge badge-cap-tools">
                        <sl-icon name="tools"></sl-icon>
                      </div>
                    </sl-tooltip>
                  )}
                  {model.capabilities?.includes('audio') && (
                    <sl-tooltip content="Audio" placement="bottom">
                      <div class="badge badge-cap-audio">
                        <sl-icon name="volume-up-fill"></sl-icon>
                      </div>
                    </sl-tooltip>
                  )}
                  {model.capabilities?.includes('thinking') && (
                    <sl-tooltip content="Thinking" placement="bottom">
                      <div class="badge badge-cap-thinking">
                        <sl-icon name="mortarboard-fill"></sl-icon>
                      </div>
                    </sl-tooltip>
                  )}
                </div>
                <div>
                  <span class="badge badge-format">{model.details?.format || 'N/A'}</span>
                </div>
                <div>{model.details?.parameter_size || 'N/A'}</div>
                <div>
                  <span class="badge badge-quant">{model.details?.quantization_level || 'N/A'}</span>
                </div>
                <div class="col-actions actions-cell">
                  <sl-dropdown placement="bottom-end" class="options-dropdown">
                    <sl-icon-button slot="trigger" name="three-dots" class="action-btn"></sl-icon-button>

                    <sl-menu>
                      <sl-menu-item onClick={() => this.copyModelName(model.model)}>
                        <sl-icon slot="prefix" name="copy"></sl-icon>
                        Copy Name
                      </sl-menu-item>
                      <sl-menu-item onClick={() => this.viewModelfile(model.model)}>
                        <sl-icon slot="prefix" name="file-earmark-text"></sl-icon>
                        View Modelfile
                      </sl-menu-item>
                      <sl-menu-item onClick={() => this.openModelOnOllamaSite(model.model)}>
                        <sl-icon slot="prefix" name="box-arrow-up-right"></sl-icon>
                        View on Ollama.com
                      </sl-menu-item>

                      <sl-divider></sl-divider>

                      <sl-menu-item disabled>
                        <sl-icon slot="prefix" name="info-circle"></sl-icon>
                        View Details
                      </sl-menu-item>
                      <sl-menu-item disabled>
                        <sl-icon slot="prefix" name="play-circle"></sl-icon>
                        Run in Playground
                      </sl-menu-item>
                      <sl-menu-item onClick={() => this.setModelAsDefault(model.model)}>
                        <sl-icon slot="prefix" name={settingsState.defaultModel === model.model ? 'star-fill' : 'star'}></sl-icon>
                        {settingsState.defaultModel === model.model ? 'Default Model' : 'Set as Default'}
                      </sl-menu-item>
                      <sl-menu-item disabled>
                        <sl-icon slot="prefix" name="box-arrow-right"></sl-icon>
                        Export
                      </sl-menu-item>

                      <sl-divider></sl-divider>

                      <sl-menu-item onClick={() => this.deleteModel(model.model)}>
                        <sl-icon slot="prefix" name="trash"></sl-icon>
                        Delete
                      </sl-menu-item>
                    </sl-menu>
                  </sl-dropdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  renderDownloadSection() {
    return (
      <div class="download-section">
        <div class="download-header">
          <div class="icon-box primary-light">
            <sl-icon name="download"></sl-icon>
          </div>
          <div>
            <div class="main-title">Download a Model</div>
            <div class="sub-title">Search and install models from the Ollama library.</div>
          </div>
        </div>

        <div class="download-controls">
          <sl-input
            disabled={this.isInstalling}
            class="model-input"
            placeholder="Search for a model (e.g. gemma4:12b, qwen3.5:9b, llama3.1:8b)"
            clearable
            value={this.modelName}
            onInput={(e: InputEvent) => this.handleInputChange(e)}
          >
            <sl-icon name="search" slot="prefix"></sl-icon>
          </sl-input>

          {this.modelName.trim() ? (
            <sl-button variant="primary" class="primary-btn" disabled={this.isInstalling} loading={this.isInstalling} onClick={() => this.installOllamaModel()}>
              Install Model
            </sl-button>
          ) : (
            <sl-button class="primary-btn" href="https://ollama.com/search" target="_blank">
              Browse Ollama Library <sl-icon name="box-arrow-up-right" slot="suffix"></sl-icon>
            </sl-button>
          )}
        </div>

        <div class="progress-container">
          {this.isInstalling ? (
            <div class="active-download">
              <sl-progress-bar value={this.progress} indeterminate={this.progress === 0}></sl-progress-bar>
              <span class="progress-status">{this.statusMessage}</span>
            </div>
          ) : (
            <div class="inactive-download">
              <sl-icon name="download"></sl-icon> No active downloads
            </div>
          )}
        </div>
      </div>
    );
  }

  renderDeleteModal() {
    if (!this.modelToDelete) return null;
    return (
      <div class="confirmation-dialog-wrapper">
        <div class="confirmation-dialog-header">Confirm Deletion</div>
        <div class="confirmation-dialog">
          <p>
            Are you sure you want to delete the model <strong>{this.modelToDelete}</strong>?
          </p>
          <div class="dialog-actions">
            <sl-button outline variant="neutral" onClick={() => (this.modelToDelete = null)}>
              Cancel
            </sl-button>
            <sl-button variant="danger" onClick={() => this.confirmDeleteModel()}>
              Delete
            </sl-button>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onClick={e => this.handleBackdropClick(e)}>
        <div class="card">
          <div class="card-content">
            {this.renderHeader()}
            {this.renderStats()}
            {this.renderTable()}
          </div>
          {this.renderDownloadSection()}
        </div>
        {this.renderDeleteModal()}
      </div>
    );
  }
}
