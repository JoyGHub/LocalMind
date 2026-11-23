import { Component, Event, EventEmitter, h, Prop } from '@stencil/core';
import { OllamaModel } from '../../components';
import { bytesToGbMb } from '../../utils/utils';

@Component({
  tag: 'localmind-model-overview',
  styleUrl: 'localmind-model-overview.css',
  shadow: true,
})
export class LocalmindModelOverview {
  @Prop() models: OllamaModel[] = [];

  @Event({ bubbles: true, composed: true }) closeEvent!: EventEmitter<void>;

  render() {
    const families = new Set<string>();
    const quantizations = new Set<string>();
    let totalSize = 0;

    this.models.forEach(model => {
      if (Number.isFinite(model.size)) totalSize += model.size;
      if (model.details?.family) families.add(model.details.family);
      if (model.details?.quantization_level) quantizations.add(model.details.quantization_level);
    });

    return (
      <div class="model-overview">
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
          <sl-icon-button name="x" class="close-btn" onClick={() => this.closeEvent.emit()}></sl-icon-button>
        </div>

        <div class="stats-container">
          <div class="stat-card">
            <div class="icon-box purple">
              <sl-icon name="boxes"></sl-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{this.models.length}</div>
              <div class="stat-label">Models</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="icon-box blue">
              <sl-icon name="device-hdd"></sl-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{bytesToGbMb(totalSize)}</div>
              <div class="stat-label">Total Size</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="icon-box green">
              <sl-icon name="cpu"></sl-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{families.size}</div>
              <div class="stat-label">Families</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="icon-box orange">
              <sl-icon name="speedometer2"></sl-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{quantizations.size}</div>
              <div class="stat-label">Quantization Levels</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
