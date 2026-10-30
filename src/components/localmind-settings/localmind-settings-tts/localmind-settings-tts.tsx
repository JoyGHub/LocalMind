import { Component, h, Method, State } from '@stencil/core';
import { settingsService, settingsState } from '../../../services/settings.service';
import { LocalMindSettings } from '../../../types/interfaces';

interface TtsVoice {
  model: string;
  language: string;
  gender: string;
  quality: string;
  size: string;
  builtIn?: boolean;
}

const BUILT_IN_VOICE = 'en_US-hfc_female-medium';

const installedVoices: TtsVoice[] = [
  {
    model: BUILT_IN_VOICE,
    language: 'English (US)',
    gender: 'Female',
    quality: 'Medium',
    size: '',
    builtIn: true,
  },
  {
    model: 'en_GB-alba_female-medium',
    language: 'English (GB)',
    gender: 'Female',
    quality: 'Medium',
    size: '55.2 MB',
  },
  {
    model: 'ro_RO-irina_female-medium',
    language: 'Romanian',
    gender: 'Female',
    quality: 'Medium',
    size: '54.8 MB',
  },
];

const availableVoices: TtsVoice[] = [
  {
    model: 'en_US-amy_female-high',
    language: 'English (US)',
    gender: 'Female',
    quality: 'High',
    size: '52.1 MB',
  },
  {
    model: 'en_AU-natasha_female-medium',
    language: 'English (Australia)',
    gender: 'Female',
    quality: 'Medium',
    size: '53.0 MB',
  },
  {
    model: 'es_ES-sara_female-medium',
    language: 'Spanish (Spain)',
    gender: 'Female',
    quality: 'Medium',
    size: '51.7 MB',
  },
  {
    model: 'fr_FR-siwis-low',
    language: 'French (France)',
    gender: 'Female',
    quality: 'Low',
    size: '31.8 MB',
  },
  {
    model: 'de_DE-thorsten-medium',
    language: 'German (Germany)',
    gender: 'Male',
    quality: 'Medium',
    size: '61.5 MB',
  },
];

@Component({
  tag: 'localmind-settings-tts',
  styleUrl: 'localmind-settings-tts.css',
  shadow: true,
})
export class LocalMindSettingsTts {
  @State() formValues: Partial<LocalMindSettings> = {};
  @State() installed = [...installedVoices];
  @State() available = [...availableVoices];
  @State() activeTab: 'installed' | 'available' = 'installed';

  ttsSelectEl!: HTMLSelectElement;

  componentWillLoad() {
    this.ensureDefaultVoice();
    this.syncFormValues();
  }

  ensureDefaultVoice() {
    const savedVoice = (settingsState as any).defaultVoice;
    const hasSavedVoice = this.installed.some(voice => voice.model === savedVoice);

    if (!hasSavedVoice) {
      settingsService.updateSetting(
        'defaultVoice' as keyof LocalMindSettings,
        BUILT_IN_VOICE as never
      );
    }
  }

  syncFormValues() {
    this.formValues = {
      ...this.formValues,
      defaultVoice:
        (settingsState as any).defaultVoice || BUILT_IN_VOICE,
    } as Partial<LocalMindSettings>;
  }

  handleVoiceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.formValues = {
      ...this.formValues,
      defaultVoice: target.value,
    } as Partial<LocalMindSettings>;

    settingsService.updateSetting(
      'defaultVoice' as keyof LocalMindSettings,
      target.value as never
    );
  }

  setDefaultVoice(model: string) {
    this.formValues = {
      ...this.formValues,
      defaultVoice: model,
    } as Partial<LocalMindSettings>;

    settingsService.updateSetting(
      'defaultVoice' as keyof LocalMindSettings,
      model as never
    );
  }

  deleteVoice(model: string) {
    if (model === BUILT_IN_VOICE) {
      return;
    }

    const nextInstalled = this.installed.filter(voice => voice.model !== model);
    const wasDefault = ((this.formValues as any).defaultVoice || BUILT_IN_VOICE) === model;

    this.installed = nextInstalled;

    if (wasDefault) {
      this.setDefaultVoice(BUILT_IN_VOICE);
    }
  }

  downloadVoice(voice: TtsVoice) {
    if (this.installed.some(installedVoice => installedVoice.model === voice.model)) {
      return;
    }

    this.installed = [...this.installed, voice];
    this.available = this.available.filter(availableVoice => availableVoice.model !== voice.model);
  }

  refreshAvailableVoices() {
    this.available = [...availableVoices].filter(
      voice => !this.installed.some(installedVoice => installedVoice.model === voice.model)
    );
  }

  @Method()
  async commitCurrentValues() {
    const nextValues = {
      ...(this.formValues as Partial<LocalMindSettings>),
      defaultVoice:
        (this.formValues as any).defaultVoice ||
        (settingsState as any).defaultVoice ||
        BUILT_IN_VOICE,
    } as Partial<LocalMindSettings>;

    this.formValues = nextValues;

    Object.entries(nextValues).forEach(([key, value]) => {
      settingsService.updateSetting(key as keyof LocalMindSettings, value as never);
    });

    return nextValues;
  }

  renderVoiceMeta(voice: TtsVoice) {
    const meta = [voice.language, voice.gender, voice.quality];

    if (voice.size) {
      meta.push(voice.size);
    }

    return meta.join(' • ');
  }

  renderInstalledTable() {
    const defaultVoice = (this.formValues as any).defaultVoice || BUILT_IN_VOICE;

    return (
      <div class="voice-table">
        <div class="voice-table-header">
          <span>Voice model</span>
          <span>Details</span>
          <span class="actions-column">Actions</span>
        </div>

        {this.installed.map(voice => {
          const isDefault = defaultVoice === voice.model;

          return (
            <div class="voice-row" key={voice.model}>
              <div class="voice-name-cell">
                <div class="voice-name-line">
                  <span class="voice-name">{voice.model}</span>
                  {voice.builtIn && <span class="voice-badge voice-badge--built-in">Built-in</span>}
                </div>
                <span class="voice-meta">{this.renderVoiceMeta(voice)}</span>
              </div>

              <div class="voice-status">
                {isDefault && <span class="voice-badge voice-badge--default">Default</span>}
                {voice.builtIn && <span class="voice-built-in-note">Built-in voice, cannot be removed</span>}
              </div>

              <div class="voice-row-actions">
                {!isDefault && !voice.builtIn && (
                  <sl-button size="small" onClick={() => this.setDefaultVoice(voice.model)}>
                    Set as Default
                  </sl-button>
                )}
                {!voice.builtIn && (
                  <sl-icon-button
                    name="trash"
                    label={`Delete ${voice.model}`}
                    class="delete-button"
                    onClick={() => this.deleteVoice(voice.model)}
                  ></sl-icon-button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  renderAvailableTable() {
    return (
      <div class="voice-table">
        <div class="voice-table-header">
          <span>Voice model</span>
          <span>Details</span>
          <span class="actions-column">Actions</span>
        </div>

        {this.available.map(voice => (
          <div class="voice-row" key={voice.model}>
            <div class="voice-name-cell">
              <span class="voice-name">{voice.model}</span>
              <span class="voice-meta">{this.renderVoiceMeta(voice)}</span>
            </div>

            <div></div>

            <div class="voice-row-actions">
              <sl-button size="small" onClick={() => this.downloadVoice(voice)}>
                <sl-icon slot="prefix" name="download"></sl-icon>
                Download
              </sl-button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  render() {
    const defaultVoice = (this.formValues as any).defaultVoice || BUILT_IN_VOICE;

    return (
      <div class="settings-section">
        <div class="settings-header">Text to Speech</div>

        <div class="settings-description">
          Manage and select the Piper TTS voice model used for speech synthesis.
        </div>

        <div class="setting-card">
          <div class="setting-info">
            <div class="setting-title">Default Voice</div>
            <div class="setting-description">
              This voice will be used for all Text to Speech responses.
            </div>
          </div>

          <div class="setting-control">
            <sl-select
              filled
              class="voice-dropdown"
              value={defaultVoice}
              ref={(el: any) => (this.ttsSelectEl = el as any)}
              placement="bottom"
              hoist
              onSlChange={(event: any) => this.handleVoiceChange(event)}
            >
              {this.installed.map(voice => (
                <sl-option key={voice.model} value={voice.model}>
                  <div class="dropdown-option">
                    <span class="dropdown-option-label">
                      {voice.model}
                      {defaultVoice === voice.model && (
                        <sl-icon name="star-fill" class="default-star"></sl-icon>
                      )}
                    </span>
                    {voice.size && <span class="dropdown-option-size">{voice.size}</span>}
                  </div>
                </sl-option>
              ))}
            </sl-select>
          </div>
        </div>

        <div class="voice-tabs">
          <button
            type="button"
            class={{
              'voice-tab': true,
              'voice-tab--active': this.activeTab === 'installed',
            }}
            onClick={() => (this.activeTab = 'installed')}
          >
            Installed Voices ({this.installed.length})
          </button>

          <button
            type="button"
            class={{
              'voice-tab': true,
              'voice-tab--active': this.activeTab === 'available',
            }}
            onClick={() => (this.activeTab = 'available')}
          >
            Available Voices ({this.available.length})
          </button>
        </div>

        <div class="voice-list-card">
          <div class="voice-list-header">
            <div>
              <div class="voice-list-title">
                {this.activeTab === 'installed' ? 'Installed Voices' : 'Available Voices'}
              </div>
              <div class="voice-list-description">
                {this.activeTab === 'installed'
                  ? 'Manage voice models currently installed in LocalMind.'
                  : 'Browse and download additional Piper TTS voice models.'}
              </div>
            </div>

            {this.activeTab === 'available' && (
              <sl-button size="small" onClick={() => this.refreshAvailableVoices()}>
                <sl-icon slot="prefix" name="arrow-clockwise"></sl-icon>
                Refresh
              </sl-button>
            )}
          </div>

          {this.activeTab === 'installed'
            ? this.renderInstalledTable()
            : this.renderAvailableTable()}
        </div>
      </div>
    );
  }
}
