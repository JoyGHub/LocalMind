import { Component, h, State } from '@stencil/core';
import { Alert } from '../../../services/alert.service';
import { imageGenService } from '../../../services/image-gen.service';
import { settingsService, settingsState } from '../../../services/settings.service';
import {
  ImageGenBackendType,
  ImageGenEngineStatus,
  ImageGenInstallProgress,
  ImageGenModel,
  ImageGenModelDownloadProgress,
  ImageGenModelsResponse,
} from '../../../types/interfaces';

const IDLE_INSTALL_STATE: ImageGenInstallProgress = {
  status: 'idle',
  stage: 'idle',
  percent: 0,
  message: '',
  error: null,
};

@Component({
  tag: 'localmind-settings-image-gen',
  styleUrl: 'localmind-settings-image-gen.css',
  shadow: true,
})
export class LocalMindSettingsImageGen {
  @State() status: ImageGenEngineStatus = {
    backendOnline: false,
    installed: false,
    version: null,
    backend: null,
    detectedBackend: 'auto',
    availableBackends: ['auto', 'cuda', 'vulkan', 'metal', 'cpu'],
    platform: '',
    installPath: 'modules/image-gen/sdcpp',
    repoUrl: 'https://github.com/leejet/stable-diffusion.cpp',
    installState: { ...IDLE_INSTALL_STATE },
  };
  @State() modelsResponse: ImageGenModelsResponse = {
    models: [],
    modelsDir: 'models/image',
    installedCount: 0,
  };
  @State() modelsLoading = false;
  @State() modelFilter: 'all' | 'installed' = 'all';
  @State() modelSearch = '';
  @State() actionError = '';
  @State() installing = false;
  @State() downloadingModels: Record<string, ImageGenModelDownloadProgress> = {};

  componentWillLoad() {
    this.loadStatus();
  }

  async loadStatus() {
    this.status = await imageGenService.getStatus();
    if (this.status.installed) {
      await this.loadModels();
    }
  }

  async loadModels() {
    this.modelsLoading = true;
    try {
      this.modelsResponse = await imageGenService.getModels();
    } finally {
      this.modelsLoading = false;
    }
  }

  handleSwitchChange(key: 'imageGenEnabled' | 'unloadLlmBeforeImageGen', event: any) {
    settingsService.updateSetting(key, Boolean(event.target?.checked));
  }

  handleBackendChange(event: any) {
    settingsService.updateSetting('imageGenBackend', (event.target?.value || 'auto') as ImageGenBackendType);
  }

  async install() {
    this.actionError = '';
    this.installing = true;
    this.status = {
      ...this.status,
      installState: {
        status: 'installing',
        stage: 'fetching_release',
        percent: 0,
        message: 'Preparing stable-diffusion.cpp installation...',
        error: null,
      },
    };

    try {
      this.status = await imageGenService.installEngine(settingsState.imageGenBackend, progress => {
        this.status = { ...this.status, installState: progress };
      });
      if (this.status.installed) await this.loadModels();
      Alert.success('stable-diffusion.cpp installation completed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Engine installation failed.';
      this.actionError = message;
      this.status = {
        ...this.status,
        installState: { ...IDLE_INSTALL_STATE, status: 'error', stage: 'error', message, error: message },
      };
    } finally {
      this.installing = false;
    }
  }

  async uninstall() {
    this.actionError = '';
    try {
      await imageGenService.uninstallEngine();
      this.status = await imageGenService.getStatus();
      this.modelsResponse = { models: [], modelsDir: 'models/image', installedCount: 0 };
      Alert.success('stable-diffusion.cpp was uninstalled.');
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Engine uninstall failed.';
    }
  }

  setDefaultModel(model: ImageGenModel) {
    settingsService.updateSetting('defaultImageModel', model.id);
    Alert.success(`${model.name} set as the default image model.`);
  }

  async downloadModel(model: ImageGenModel) {
    if (this.downloadingModels[model.id]) return;
    this.actionError = '';
    try {
      await imageGenService.downloadModel(model.id, progress => {
        this.downloadingModels = {
          ...this.downloadingModels,
          [model.id]: progress,
        };
      });
      const progress = this.downloadingModels[model.id];
      if (progress?.stage === 'error') {
        Alert.error(progress.error || progress.message || `Failed to download ${model.name}.`);
        return;
      }
      await this.loadModels();
      if (settingsState.defaultImageModel === '') {
        settingsService.updateSetting('defaultImageModel', model.id);
      }
      Alert.success(`${model.name} downloaded successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to download ${model.name}.`;
      this.actionError = message;
      Alert.error(message);
    } finally {
      const next = { ...this.downloadingModels };
      delete next[model.id];
      this.downloadingModels = next;
    }
  }

  async deleteModel(model: ImageGenModel) {
    this.actionError = '';
    try {
      await imageGenService.deleteModel(model.id);
      await this.loadModels();
      if (settingsState.defaultImageModel === model.id) {
        settingsService.updateSetting('defaultImageModel', '');
      }
      Alert.success(`${model.name} deleted successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to delete ${model.name}.`;
      this.actionError = message;
      Alert.error(message);
    }
  }

  accelerationLabel() {
    const backend = this.status.installed ? this.status.backend : null;
    const detected = backend || this.status.detectedBackend;
    if (!detected || detected === 'auto') return 'Auto-Detect';
    if (detected.toLowerCase() === 'cuda') return 'NVIDIA CUDA';
    if (detected.toLowerCase() === 'metal') return 'Apple Metal';
    if (detected.toLowerCase() === 'vulkan') return 'Vulkan';
    if (detected.toLowerCase() === 'cpu') return 'CPU';
    return detected;
  }

  filteredModels() {
    const search = this.modelSearch.trim().toLowerCase();
    return this.modelsResponse.models.filter(model => {
      if (this.modelFilter === 'installed' && !model.installed) return false;
      if (!search) return true;
      return [
        model.name,
        model.family,
        ...(model.tags || []),
      ].some(value => value.toLowerCase().includes(search));
    });
  }

  formatBytes(bytes: number) {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `~${gb.toFixed(1)} GB`;
  }

  renderToggleCard(title: string, description: string, checked: boolean, settingKey: 'imageGenEnabled' | 'unloadLlmBeforeImageGen') {
    return (
      <div class="setting-card toggle-card">
        <div class="setting-info">
          <div class="setting-title">{title}</div>
          <div class="setting-description">{description}</div>
        </div>
        <sl-switch
          checked={checked}
          onSlChange={(event: any) => this.handleSwitchChange(settingKey, event)}
        ></sl-switch>
      </div>
    );
  }

  renderStatusPill() {
    if (this.installing || this.status.installState.status === 'installing') {
      return <span class="status-pill installing"><span class="status-dot"></span>Installing...</span>;
    }
    if (this.status.installState.status === 'error' || this.actionError) {
      return <span class="status-pill error"><span class="status-dot"></span>Error</span>;
    }
    if (this.status.installed) {
      return <span class="status-pill installed"><span class="status-dot"></span>Installed</span>;
    }
    return <span class="status-pill neutral"><span class="status-dot"></span>Not Installed</span>;
  }

  renderEngineCard() {
    const progress = this.status.installState;
    const isInstalling = this.installing || progress.status === 'installing';

    return (
      <div class="engine-card">
        <div class="engine-header">
          <div class="engine-heading">
            <div class="engine-icon"><sl-icon name="image"></sl-icon></div>
            <div>
              <div class="engine-title">stable-diffusion.cpp</div>
              <a
                class="repo-link"
                href={this.status.repoUrl || 'https://github.com/leejet/stable-diffusion.cpp'}
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/leejet/stable-diffusion.cpp
                <sl-icon name="box-arrow-up-right"></sl-icon>
              </a>
            </div>
          </div>
          {this.renderStatusPill()}
        </div>

        <div class="engine-details">
          <span class="acceleration-badge">{this.accelerationLabel()}</span>
          {this.status.installed ? (
            <div class="fragment-wrapper">
              {this.status.version && <span class="meta-tag">{this.status.version}</span>}
              <span class="install-path">{this.status.installPath || 'modules/image-gen/sdcpp'}</span>
            </div>
          ) : (
            <span class="engine-summary">Lightweight C/C++ diffusion runtime — zero Python or PyTorch bloat</span>
          )}
        </div>

        {isInstalling && (
          <div class="install-progress">
            <sl-progress-bar value={progress.percent || 0}></sl-progress-bar>
            <div class="progress-message">{progress.percent}% · {progress.message || 'Installing...'}</div>
          </div>
        )}

        <div class="engine-controls">
          {!this.status.installed ? (
            <div class="fragment-wrapper">
              <div class="backend-control">
                <label>Acceleration</label>
                <sl-select
                  value={settingsState.imageGenBackend}
                  disabled={isInstalling || !this.status.backendOnline}
                  onSlChange={(event: any) => this.handleBackendChange(event)}
                >
                  <sl-option value="auto">Auto</sl-option>
                  <sl-option value="cuda">CUDA</sl-option>
                  <sl-option value="vulkan">Vulkan</sl-option>
                  <sl-option value="metal">Metal</sl-option>
                  <sl-option value="cpu">CPU</sl-option>
                </sl-select>
              </div>
              <sl-button
                variant="primary"
                disabled={isInstalling || !this.status.backendOnline}
                onClick={() => this.install()}
              >
                <sl-icon slot="prefix" name="download"></sl-icon>
                Install Engine
              </sl-button>
            </div>
          ) : (
            <div class="fragment-wrapper">
              <sl-button variant="primary" disabled={isInstalling} onClick={() => this.install()}>
                <sl-icon slot="prefix" name="arrow-repeat"></sl-icon>
                Reinstall / Update
              </sl-button>
              <sl-button variant="danger" outline disabled={isInstalling} onClick={() => this.uninstall()}>
                Uninstall
              </sl-button>
            </div>
          )}
        </div>
      </div>
    );
  }

  renderPlaceholder() {
    return (
      <div class="models-placeholder">
        Install stable-diffusion.cpp above to browse compatible image models and choose your default model.
      </div>
    );
  }

  renderModelCard(model: ImageGenModel) {
    const isDefault = settingsState.defaultImageModel === model.id;
    const downloadProgress = this.downloadingModels[model.id];
    const isDownloading = Boolean(downloadProgress);
    const [width = '', height = ''] = (model.defaultResolution || '').split('x');
    return (
      <div class={`model-card${isDefault ? ' default-model' : ''}`} key={model.id}>
        <div class="model-main">
          <div class="model-name-row">
            <span class="model-name">{model.name}</span>
            {isDefault && <sl-badge variant="primary">Default</sl-badge>}
          </div>
          <div class="model-badges">
            <sl-tag size="small">{model.family}</sl-tag>
            <sl-tag size="small">{model.minVramGb} GB VRAM</sl-tag>
            <sl-tag size="small">{model.sizeLabel || this.formatBytes(model.estimatedSizeBytes)}</sl-tag>
            {(model.tags || []).map(tag => <sl-tag key={tag} size="small" variant="neutral">{tag}</sl-tag>)}
          </div>
          <div class="model-description">{model.description}</div>
          <div class="model-recipe">
            {model.defaultSteps} steps · {width || model.defaultResolution}{height ? `×${height}` : ''}
          </div>
          {isDownloading && downloadProgress && (
            <div class="model-download-progress">
              <sl-progress-bar value={downloadProgress.percent || 0}></sl-progress-bar>
              <div class="model-progress-message">
                File {downloadProgress.fileIndex}/{downloadProgress.totalFiles}
                {downloadProgress.fileName ? ` · ${downloadProgress.fileName}` : ''}
                {' '}({downloadProgress.percent}%)
              </div>
            </div>
          )}
        </div>
        <div class="model-actions">
          {model.installed ? (
            <sl-badge variant="success">Downloaded</sl-badge>
          ) : (
            <sl-badge variant="neutral">Not Downloaded</sl-badge>
          )}
          {model.installed && !isDefault && (
            <sl-button size="small" onClick={() => this.setDefaultModel(model)}>
              Set as Default
            </sl-button>
          )}
          {!model.installed && (
            <sl-button
              size="small"
              variant="primary"
              outline
              disabled={isDownloading}
              onClick={() => this.downloadModel(model)}
            >
              <sl-icon slot="prefix" name="download"></sl-icon>
              {isDownloading ? 'Downloading...' : 'Download'}
            </sl-button>
          )}
          {model.installed && (
            <sl-icon-button
              name="trash"
              label={`Delete ${model.name}`}
              onClick={() => this.deleteModel(model)}
            ></sl-icon-button>
          )}
        </div>
      </div>
    );
  }

  renderModelsSection() {
    if (!this.status.installed) return this.renderPlaceholder();

    const installedCount = this.modelsResponse.installedCount;
    const availableCount = this.modelsResponse.models.length;
    const filtered = this.filteredModels();

    return (
      <div class="models-section">
        <div class="models-toolbar">
          <div class="models-title-row">
            <span class="models-title">Image Models</span>
            <span class="count-pill">{installedCount} installed / {availableCount} available</span>
          </div>
          <div class="models-controls">
            <div class="filter-buttons">
              <sl-button
                size="small"
                variant={this.modelFilter === 'all' ? 'primary' : 'default'}
                onClick={() => (this.modelFilter = 'all')}
              >
                All
              </sl-button>
              <sl-button
                size="small"
                variant={this.modelFilter === 'installed' ? 'primary' : 'default'}
                onClick={() => (this.modelFilter = 'installed')}
              >
                Installed
              </sl-button>
            </div>
            <sl-input
              size="small"
              clearable
              placeholder="Search name, family, or tag"
              value={this.modelSearch}
              onSlInput={(event: any) => (this.modelSearch = event.target?.value || '')}
            >
              <sl-icon slot="prefix" name="search"></sl-icon>
            </sl-input>
            <sl-icon-button
              name="arrow-clockwise"
              label="Refresh image models"
              onClick={() => this.loadModels()}
            ></sl-icon-button>
          </div>
        </div>

        {this.modelsLoading ? (
          <div class="models-list">
            {[0, 1, 2].map(index => (
              <div class="model-card skeleton-card" key={index}>
                <sl-skeleton effect="pulse"></sl-skeleton>
                <sl-skeleton effect="pulse"></sl-skeleton>
              </div>
            ))}
          </div>
        ) : (
          <div class="models-list">
            {filtered.map(model => this.renderModelCard(model))}
            {!filtered.length && <div class="models-empty">No image models match your filter.</div>}
          </div>
        )}
      </div>
    );
  }

  render() {
    return (
      <div class="settings-section">
        <div class="settings-header">Image Generation</div>

        <div class="settings-grid">
          {this.renderToggleCard(
            'Enable Image Generation',
            'Generate images locally on your machine using stable-diffusion.cpp',
            settingsState.imageGenEnabled,
            'imageGenEnabled',
          )}
          {this.renderToggleCard(
            'Auto-Unload LLM Before Generating',
            'Frees GPU VRAM by unloading the active Ollama model before generating images — recommended for GPUs under 24 GB',
            settingsState.unloadLlmBeforeImageGen,
            'unloadLlmBeforeImageGen',
          )}
        </div>

        <div class="settings-header engine-section-title">Engine</div>
        {!this.status.backendOnline && (
          <sl-alert variant="warning" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            Backend image-gen endpoints are not active yet — complete Part 2 to enable one-click installation.
          </sl-alert>
        )}
        {this.actionError && (
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
            {this.actionError}
            <sl-button slot="suffix" size="small" onClick={() => this.status.installed ? this.uninstall() : this.install()}>
              Retry
            </sl-button>
          </sl-alert>
        )}
        {this.renderEngineCard()}
        {this.renderModelsSection()}
      </div>
    );
  }
}
