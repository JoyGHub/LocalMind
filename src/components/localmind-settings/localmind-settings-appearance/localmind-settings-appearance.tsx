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
  accentColorPickerEl!: HTMLInputElement;

  componentWillLoad() {
    this.formValues = {
      theme: settingsState.theme || 'System',
      accentColor: settingsState.accentColor || '#4f46e5',
    };
  }

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
              <div class="accent-options">
                {['#4f46e5', '#0f766e', '#d97706', '#dc2626'].map(color => (
                  <button
                    class={{ 'accent-swatch': true, 'accent-swatch--active': accentColor === color }}
                    style={{ background: color }}
                    type="button"
                    aria-label={color}
                    aria-pressed={accentColor === color}
                    onClick={() => this.handleSettingChange('accentColor', color)}
                  ></button>
                ))}
              </div>
              <sl-color-picker
                ref={(el: any) => (this.accentColorPickerEl = el as any)}
                value={accentColor}
                onSlChange={(event: any) => this.handleSettingChange('accentColor', event.target?.value ?? '#4f46e5')}
              ></sl-color-picker>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
