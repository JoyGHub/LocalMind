import { Component, h, Method, State } from '@stencil/core';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '../../../constants/prompts';
import { settingsService, settingsState } from '../../../services/settings.service';
import { t } from '../../../services/i18n.service';
import { LocalMindSettings } from '../../../types/interfaces';

@Component({
  tag: 'localmind-settings-general',
  styleUrl: 'localmind-settings-general.css',
  shadow: true,
})
export class LocalMindSettingsGeneral {
  @State() formValues: Partial<LocalMindSettings> = {};

  instructionInputEls: HTMLInputElement[] = [];
  languageSelectEl!: HTMLSelectElement;

  componentWillLoad() {
    this.formValues = {
      instructions: settingsState.instructions ?? DEFAULT_SYSTEM_INSTRUCTIONS,
      language: settingsState.language || 'English',
    };
  }

  addInstruction() {
    const instructions = [...this.getInstructionValues(), ''];
    this.formValues = { ...this.formValues, instructions };
    settingsService.updateSetting('instructions', instructions);
  }

  deleteInstruction(index: number) {
    const instructions = this.getInstructionValues().filter((_, instructionIndex) => instructionIndex !== index);
    this.formValues = { ...this.formValues, instructions };
    settingsService.updateSetting('instructions', instructions);
  }

  getInstructionValues() {
    return (this.formValues.instructions ?? []).map(
      (instruction, index) => this.instructionInputEls[index]?.value ?? instruction,
    );
  }

  handleSettingChange(key: keyof LocalMindSettings, value: string) {
    this.formValues = { ...this.formValues, [key]: value };
    settingsService.updateSetting(key, value as never);
  }

  @Method()
  async commitCurrentValues() {
    const values: Partial<LocalMindSettings> = {
      instructions: this.getInstructionValues(),
      language: this.languageSelectEl?.value ?? this.formValues.language ?? 'English',
    };
    this.formValues = values;
    Object.entries(values).forEach(([key, value]) => {
      settingsService.updateSetting(key as keyof LocalMindSettings, value as never);
    });
    return values;
  }

  render() {
    const locale = this.formValues.language || settingsState.language || 'English';
    const instructions = this.formValues.instructions ?? [];

    return (
      <div class="settings-section">
        <div class="settings-header">{t('tabGeneral', locale)}</div>
        <div class="settings-grid">
          <div class="setting-card">
            <div class="setting-info">
              <div class="setting-title">{t('settingTitleLanguage', locale)}</div>
              <div class="setting-description">{t('settingDescriptionLanguage', locale)}</div>
            </div>
            <div class="setting-control">
              <sl-select
                ref={(el: any) => (this.languageSelectEl = el as any)}
                value={this.formValues.language || 'English'}
                onSlChange={(event: any) => this.handleSettingChange('language', event.target?.value ?? 'English')}
              >
                <sl-option value="English">English</sl-option>
                <sl-option value="Romanian">Română</sl-option>
              </sl-select>
            </div>
          </div>

          <div class="setting-card">
            <div class="setting-info">
              <div class="setting-title">{t('settingTitleInstructions', locale)}</div>
              <div class="setting-description">{t('settingDescriptionInstructions', locale)}</div>
            </div>
            <div class="setting-control wide-control instructions-control">
              <div class="instructions-list">
                {instructions.map((instruction, index) => (
                  <div class="instruction-row" key={index}>
                    <sl-input
                      aria-label={`${t('instructionLabel', locale)} ${index + 1}`}
                      ref={(el: any) => (this.instructionInputEls[index] = el as HTMLInputElement)}
                      value={instruction}
                    ></sl-input>
                    <sl-icon-button
                      name="trash"
                      label={`${t('deleteInstruction', locale)} ${index + 1}`}
                      class="instruction-delete"
                      onClick={() => this.deleteInstruction(index)}
                    ></sl-icon-button>
                  </div>
                ))}
                {instructions.length === 0 && <div class="instructions-empty">{t('emptyInstructions', locale)}</div>}
              </div>
              <div class="instruction-actions">
                <sl-icon-button
                  name="plus-lg"
                  label={t('addInstruction', locale)}
                  class="instruction-add"
                  onClick={() => this.addInstruction()}
                ></sl-icon-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
