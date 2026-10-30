import { Component, h, Method, Prop, State } from '@stencil/core';
import { settingsService, settingsState } from '../../../services/settings.service';
import { t } from '../../../services/i18n.service';
import { LocalMindSettings } from '../../../types/interfaces';

@Component({
  tag: 'localmind-settings-model',
  styleUrl: 'localmind-settings-model.css',
  shadow: true,
})
export class LocalMindSettingsModel {
  @Prop() models!: any[];
  @Prop() ollamaRunning!: boolean;

  @State() formValues: Partial<LocalMindSettings> = {};

  modelsSelectEl!: HTMLSelectElement;
  contextSelectEl!: HTMLSelectElement;
  temperatureInputEl!: HTMLInputElement;
  topPInputEl!: HTMLInputElement;
  topKInputEl!: HTMLInputElement;
  maxTokensInputEl!: HTMLInputElement;

  componentWillLoad() {
    if (!settingsState.defaultModel && this.models?.length) {
      settingsService.updateSetting('defaultModel', this.models[0].model);
    }
    this.formValues = {
      defaultModel: settingsState.defaultModel || '',
      contextWindow: settingsState.contextWindow ?? 32000,
      temperature: settingsState.temperature ?? 1,
      top_p: settingsState.top_p ?? 0.95,
      top_k: settingsState.top_k ?? 64,
      maxTokens: settingsState.maxTokens ?? 2048,
    };
  }

  handleSettingChange(key: keyof LocalMindSettings, value: string | number) {
    this.formValues = { ...this.formValues, [key]: value };
    settingsService.updateSetting(key, value as never);
  }

  @Method()
  async commitCurrentValues() {
    const values: Partial<LocalMindSettings> = {
      defaultModel: this.modelsSelectEl?.value ?? this.formValues.defaultModel ?? settingsState.defaultModel ?? '',
      contextWindow: Number(this.contextSelectEl?.value ?? this.formValues.contextWindow ?? 32000),
      temperature: Number(this.temperatureInputEl?.value ?? this.formValues.temperature ?? 1),
      top_p: Number(this.topPInputEl?.value ?? this.formValues.top_p ?? 0.95),
      top_k: Number(this.topKInputEl?.value ?? this.formValues.top_k ?? 64),
      maxTokens: Number(this.maxTokensInputEl?.value ?? this.formValues.maxTokens ?? 2048),
    };
    this.formValues = values;
    Object.entries(values).forEach(([key, value]) => {
      settingsService.updateSetting(key as keyof LocalMindSettings, value as never);
    });
    return values;
  }

  render() {
    const locale = settingsState.language || 'English';
    const currentModel = this.formValues.defaultModel || settingsState.defaultModel || '';

    return (
      <div class="settings-section">
        <div class="settings-header">{t('tabModel', locale)}</div>
        <div class="settings-grid">
          <div class="setting-card">
            <div class="setting-info">
              <div class="setting-title">{t('settingTitleDefaultModel', locale)}</div>
              <div class="setting-description">{t('settingDescriptionDefaultModel', locale)}</div>
            </div>
            <div class="setting-control">
              <sl-select
                filled
                class="models-dropdown"
                value={currentModel}
                ref={(el: any) => (this.modelsSelectEl = el as any)}
                placement="bottom"
                hoist
                disabled={!this.models || !this.ollamaRunning}
                onSlChange={(event: any) => this.handleSettingChange('defaultModel', event.target?.value ?? '')}
              >
                {this.models?.map((model: any) => (
                  <sl-option key={model.model} value={model.model}>
                    <div class="dropdown-option">
                      <span class="dropdown-option-label">
                        {model.model}
                        {currentModel === model.model && (
                          <sl-tooltip content={t('settingTitleDefaultModel', locale)} placement="bottom">
                            <sl-icon name="star-fill" class="default-star"></sl-icon>
                          </sl-tooltip>
                        )}
                      </span>
                      <span class="dropdown-option-size">{model.formattedSize}</span>
                    </div>
                  </sl-option>
                ))}
              </sl-select>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-info">
              <div class="setting-title">{t('settingTitleContextLength', locale)}</div>
              <div class="setting-description">{t('settingDescriptionContextLength', locale)}</div>
            </div>
            <div class="setting-control">
              <sl-select
                ref={(el: any) => (this.contextSelectEl = el as any)}
                value={this.formValues.contextWindow?.toString() ?? '32000'}
                onSlChange={(event: any) => this.handleSettingChange('contextWindow', Number(event.target?.value ?? 32000))}
              >
                <sl-option value="4096">4k</sl-option>
                <sl-option value="8192">8k</sl-option>
                <sl-option value="16384">16k</sl-option>
                <sl-option value="32000">32k</sl-option>
                <sl-option value="65536">64k</sl-option>
                <sl-option value="131072">128k</sl-option>
                <sl-option value="262144">256k</sl-option>
              </sl-select>
            </div>
          </div>

          {([
            { key: 'temperature', title: 'settingTitleTemperature', description: 'settingDescriptionTemperature', value: this.formValues.temperature ?? 1, min: '0', max: '2', step: '0.1', ref: (el: HTMLInputElement) => (this.temperatureInputEl = el) },
            { key: 'top_p', title: 'settingTitleTopP', description: 'settingDescriptionTopP', value: this.formValues.top_p ?? 0.95, min: '0', max: '1', step: '0.01', ref: (el: HTMLInputElement) => (this.topPInputEl = el) },
            { key: 'top_k', title: 'settingTitleTopK', description: 'settingDescriptionTopK', value: this.formValues.top_k ?? 64, min: '0', step: '1', ref: (el: HTMLInputElement) => (this.topKInputEl = el) },
            { key: 'maxTokens', title: 'settingTitleMaxTokens', description: 'settingDescriptionMaxTokens', value: this.formValues.maxTokens ?? 2048, min: '-1', ref: (el: HTMLInputElement) => (this.maxTokensInputEl = el) },
          ] as const).map(setting => (
            <div class="setting-card">
              <div class="setting-info">
                <div class="setting-title">{t(setting.title, locale)}</div>
                <div class="setting-description">{t(setting.description, locale)}</div>
              </div>
              <div class="setting-control">
                <sl-input
                  type="number"
                  ref={setting.ref as any}
                  value={setting.value}
                  min={setting.min}
                  max={'max' in setting ? setting.max : undefined}
                  step={'step' in setting ? setting.step : undefined}
                  onInput={(event: any) => this.handleSettingChange(setting.key, Number(event.target?.value ?? 0))}
                  onSlInput={(event: any) => this.handleSettingChange(setting.key, Number(event.target?.value ?? 0))}
                ></sl-input>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
