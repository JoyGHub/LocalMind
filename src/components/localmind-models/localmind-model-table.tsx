import { Component, Event, EventEmitter, h, Prop } from '@stencil/core';
import { OllamaModel } from '../../components';
import { bytesToGbMb } from '../../utils/utils';

@Component({
  tag: 'localmind-model-table',
  styleUrl: 'localmind-model-table.css',
  shadow: true,
})
export class LocalmindModelTable {
  @Prop() models: OllamaModel[] = [];
  @Prop() defaultModel: string = '';

  @Event({ bubbles: true, composed: true }) copyModelEvent!: EventEmitter<string>;
  @Event({ bubbles: true, composed: true }) viewModelfileEvent!: EventEmitter<string>;
  @Event({ bubbles: true, composed: true }) openLibraryEvent!: EventEmitter<string>;
  @Event({ bubbles: true, composed: true }) setDefaultEvent!: EventEmitter<string>;
  @Event({ bubbles: true, composed: true }) deleteModelEvent!: EventEmitter<string>;

  render() {
    if (this.models.length === 0) {
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
            <div class="col-model">Model</div>
            <div class="col-size">Size</div>
            <div>Capabilities</div>
            <div>Format</div>
            <div>Parameters</div>
            <div>Quantization</div>
            <div class="col-actions">Actions</div>
          </div>
          <div class="table-body">
            {this.models.map(model => (
              <div class="table-row" key={model.model}>
                <div class="col-model cell-model">
                  <div class="model-avatar">
                    <sl-icon name="robot"></sl-icon>
                  </div>
                  <div class="model-info">
                    <div class="model-name">
                      <span>{model.model}</span>
                      {this.defaultModel === model.model && (
                        <sl-tooltip content="Default model" placement="bottom">
                          <sl-icon name="star-fill" class="default-star"></sl-icon>
                        </sl-tooltip>
                      )}
                    </div>
                    <div class="model-family-sub">{model.details?.family || 'unknown'}</div>
                  </div>
                </div>
                <div class="col-size">{bytesToGbMb(Number.isFinite(model.size) ? model.size : 0)}</div>
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
                      <sl-menu-item onClick={() => this.copyModelEvent.emit(model.model)}>
                        <sl-icon slot="prefix" name="copy"></sl-icon>
                        Copy Name
                      </sl-menu-item>
                      <sl-menu-item onClick={() => this.viewModelfileEvent.emit(model.model)}>
                        <sl-icon slot="prefix" name="file-earmark-text"></sl-icon>
                        View Modelfile
                      </sl-menu-item>
                      <sl-menu-item onClick={() => this.openLibraryEvent.emit(model.model)}>
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
                      <sl-menu-item onClick={() => this.setDefaultEvent.emit(model.model)}>
                        <sl-icon slot="prefix" name={this.defaultModel === model.model ? 'star-fill' : 'star'}></sl-icon>
                        {this.defaultModel === model.model ? 'Default Model' : 'Set as Default'}
                      </sl-menu-item>
                      <sl-menu-item disabled>
                        <sl-icon slot="prefix" name="box-arrow-right"></sl-icon>
                        Export
                      </sl-menu-item>
                      <sl-divider></sl-divider>
                      <sl-menu-item onClick={() => this.deleteModelEvent.emit(model.model)}>
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
}
