import { Component, h, Method, State } from '@stencil/core';
import { settingsService, settingsState } from '../../../services/settings.service';
import { t } from '../../../services/i18n.service';
import { LocalMindSettings } from '../../../types/interfaces';

@Component({
  tag: 'localmind-settings-appearance',
  styleUrl: 'localmind-settings-appearance.css',
  shadow: true,
})
export class LocalMindSettingsAppearance {
  @State() formValues: Partial<LocalMindSettings> = {};

  themeSelectEl!: HTMLSelectElement;
  accentColorPickerEl?: HTMLElement & { value: string };

  componentWillLoad() {
    this.formValues = {
      theme: settingsState.theme || 'System',
      accentColor: settingsState.accentColor || '#4f46e5',
    };
  }

  componentDidLoad() {
    this.accentColorPickerEl?.addEventListener('sl-input', this.handleAccentColorEvent);
    this.accentColorPickerEl?.addEventListener('sl-change', this.handleAccentColorEvent);
  }

  disconnectedCallback() {
    this.accentColorPickerEl?.removeEventListener('sl-input', this.handleAccentColorEvent);
    this.accentColorPickerEl?.removeEventListener('sl-change', this.handleAccentColorEvent);
  }

  handleAccentColorEvent = () => {
    const color = this.accentColorPickerEl?.value;

    if (!color || color === this.formValues.accentColor) {
      return;
    }

    this.handleSettingChange('accentColor', color);
  };

  handleSettingChange(key: keyof LocalMindSettings, value: string) {
    this.formValues = { ...this.formValues, [key]: value };
    settingsService.updateSetting(key, value as never);
  }

  @Method()
  async commitCurrentValues() {
    const values: Partial<LocalMindSettings> = {
      theme: this.themeSelectEl?.value ?? this.formValues.theme ?? 'System',
      accentColor: this.accentColorPickerEl?.value ?? this.formValues.accentColor ?? '#4f46e5',
    };

    this.formValues = values;

    Object.entries(values).forEach(([key, value]) => {
      settingsService.updateSetting(key as keyof LocalMindSettings, value as never);
    });

    return values;
  }

  render() {
    const locale = settingsState.language || 'English';
    const accentColor = this.formValues.accentColor || '#4f46e5';

    return (
      <div class="settings-section">
        <div class="settings-header">{t('tabAppearance', locale)}</div>

        <div class="settings-grid">
          <div class="setting-card">
            <div class="setting-info">
              <div class="setting-title">{t('settingTitleTheme', locale)}</div>
              <div class="setting-description">{t('settingDescriptionTheme', locale)}</div>
            </div>

            <div class="setting-control">
              <sl-select
                ref={(el: any) => (this.themeSelectEl = el as any)}
                value={this.formValues.theme || 'System'}
                onSlChange={(event: any) => this.handleSettingChange('theme', event.target?.value ?? 'System')}
              >
                <sl-option value="System">System</sl-option>
                <sl-option value="Light">Light</sl-option>
                <sl-option value="Dark">Dark</sl-option>
              </sl-select>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-info">
              <div class="setting-title">{t('settingTitleAccentColor', locale)}</div>
              <div class="setting-description">{t('settingDescriptionAccentColor', locale)}</div>
            </div>

            <div class="setting-control wide-control">
              <div class="accent-color-card">
                <sl-color-picker ref={(el: any) => (this.accentColorPickerEl = el)} value={accentColor} format="hex"></sl-color-picker>

                <div class="accent-color-hex">{accentColor.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
