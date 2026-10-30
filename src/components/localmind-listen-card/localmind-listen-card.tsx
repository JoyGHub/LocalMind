import { Component, h, Prop, State, Method } from '@stencil/core';
import { TtsService } from '../../services/tts.service';

@Component({
  tag: 'localmind-listen-card',
  styleUrl: 'localmind-listen-card.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindListenCard {
  @Prop({ mutable: true, reflect: true }) open: boolean;
  @Prop() content: string = '';

  @State() isGenerating!: boolean;
  @State() isPlaying!: boolean;
  @State() currentTime!: number;
  @State() duration!: number;
  @State() isDragging!: boolean;
  @State() hasAudio!: boolean;
  @State() visualizerLevels: number[] = Array.from({ length: 24 }, () => 0);

  isMouseDownOnBackdrop!: boolean;
  rangeEl!: HTMLInputElement;
  lastUiTick = 0;
  audioContext: AudioContext | null = null;
  analyserNode: AnalyserNode | null = null;
  sourceNode: MediaElementAudioSourceNode | null = null;
  visualizerFrameId: number | null = null;

  boundHandleSliderInput = (e: Event) => this.handleSliderInput(e as CustomEvent);
  boundHandleSliderChange = (e: Event) => this.handleSliderChange(e as CustomEvent);

  componentWillLoad() {
    this.open = false;
    this.isGenerating = false;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.isDragging = false;
    this.hasAudio = false;
    this.isMouseDownOnBackdrop = false;

    TtsService.onStateChange = state => {
      this.isGenerating = state.isGenerating;
      this.isPlaying = state.isPlaying;
      this.duration = state.duration;
      this.hasAudio = this.duration > 0 || !!this.content;

      const now = performance.now();
      const shouldUpdate = !this.isDragging && (!this.rangeEl || now - this.lastUiTick > 80);

      if (shouldUpdate) {
        this.lastUiTick = now;
        this.currentTime = state.currentTime;
      }

      this.syncVisualizer();
    };
  }

  disconnectedCallback() {
    if (this.rangeEl) {
      this.rangeEl.removeEventListener('sl-input', this.boundHandleSliderInput);
      this.rangeEl.removeEventListener('sl-change', this.boundHandleSliderChange);
    }

    this.stopVisualizer();
    this.sourceNode?.disconnect();
    this.analyserNode?.disconnect();
    this.audioContext?.close().catch(() => undefined);
  }

  bindRangeElement(el: any) {
    if (el && this.rangeEl !== el) {
      if (this.rangeEl) {
        this.rangeEl.removeEventListener('sl-input', this.boundHandleSliderInput);
        this.rangeEl.removeEventListener('sl-change', this.boundHandleSliderChange);
      }
      this.rangeEl = el;
      this.rangeEl.addEventListener('sl-input', this.boundHandleSliderInput);
      this.rangeEl.addEventListener('sl-change', this.boundHandleSliderChange);
    }
  }

  @Method()
  async show(text: string = '') {
    this.content = text;
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
    this.currentTime = 0;
    this.duration = 0;
    this.isGenerating = false;
    this.isPlaying = false;
    this.hasAudio = false;
    this.visualizerLevels = Array.from({ length: 24 }, () => 0);
    TtsService.stop();
  }

  handleMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    this.isMouseDownOnBackdrop = target.classList.contains('backdrop');
  }

  handleMouseUp(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (this.isMouseDownOnBackdrop && target.classList.contains('backdrop')) {
      this.hide();
    }
    this.isMouseDownOnBackdrop = false;
  }

  handleSliderInput(event: CustomEvent) {
    this.isDragging = true;
    this.currentTime = event.detail?.value ?? (event.target as any).value;
  }

  handleSliderChange(event: CustomEvent) {
    const targetValue = event.detail?.value ?? (event.target as any).value;
    TtsService.seek(targetValue);

    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  syncVisualizer() {
    const audio = TtsService.currentAudio;
    if (!audio) {
      this.stopVisualizer();
      if (this.visualizerLevels.some(level => level > 0)) {
        this.visualizerLevels = Array.from({ length: 24 }, () => 0);
      }
      return;
    }

    if (!this.audioContext) {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      this.audioContext = new AudioContextCtor();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.88;
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => undefined);
    }

    if (this.sourceNode?.mediaElement !== audio) {
      this.sourceNode?.disconnect();
      this.sourceNode = this.audioContext.createMediaElementSource(audio);
      this.sourceNode.connect(this.analyserNode!);
      this.analyserNode?.connect(this.audioContext.destination);
    }

    if (!this.visualizerFrameId) {
      this.visualizerFrameId = requestAnimationFrame(this.renderVisualizer);
    }
  }

  stopVisualizer() {
    if (this.visualizerFrameId) {
      cancelAnimationFrame(this.visualizerFrameId);
      this.visualizerFrameId = null;
    }
    this.visualizerLevels = Array.from({ length: 24 }, () => 0);
  }

  renderVisualizer = () => {
    if (!this.analyserNode || !this.isPlaying || !TtsService.currentAudio || TtsService.currentAudio.paused) {
      this.visualizerLevels = Array.from({ length: 24 }, () => 0);
      this.visualizerFrameId = null;
      return;
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const waveformData = new Uint8Array(this.analyserNode.fftSize);
    this.analyserNode.getByteFrequencyData(frequencyData);
    this.analyserNode.getByteTimeDomainData(waveformData);

    const segments = 24;
    const previousLevels = this.visualizerLevels || Array.from({ length: segments }, () => 0);
    const levels = Array.from({ length: segments }, (_, index) => {
      const bandPosition = index / Math.max(1, segments - 1);
      const frequencyIndex = Math.floor(bandPosition * Math.max(0, bufferLength - 1));
      const waveformIndex = Math.floor(bandPosition * Math.max(0, waveformData.length - 1));

      const frequencyValue = frequencyData[frequencyIndex] || 0;
      const waveformValue = waveformData[waveformIndex] || 128;
      const waveformAmplitude = Math.abs(waveformValue - 128) / 128;
      const frequencyAmplitude = frequencyValue / 255;
      const combinedAmplitude = Math.min(1, frequencyAmplitude * 0.7 + waveformAmplitude * 0.3);
      const bandBoost = 0.08 + bandPosition * 0.16;
      const normalized = Math.max(10, Math.min(100, Math.round((combinedAmplitude + bandBoost) * 100)));
      const smoothed = Math.round(previousLevels[index] * 0.65 + normalized * 0.35);
      return smoothed;
    });

    this.visualizerLevels = levels;
    this.visualizerFrameId = requestAnimationFrame(this.renderVisualizer);
  };

  getSpokenTextMarkup() {
    const text = this.content?.trim() || 'Your assistant reply will be spoken here.';
    const tokens = text.split(/(\s+)/);
    const wordCount = tokens.filter(token => /\S/.test(token)).length;
    const activeWordCount = this.duration > 0 && this.currentTime > 0 ? Math.max(0, Math.min(wordCount, Math.floor((this.currentTime / this.duration) * wordCount))) : 0;

    let wordIndex = 0;
    return tokens.map(token => {
      if (/\s/.test(token)) {
        return <span class="word word--space">{token}</span>;
      }

      const isActive = this.isPlaying && wordIndex < activeWordCount;
      wordIndex += 1;
      return <span class={{ 'word': true, 'word--active': isActive }}>{token}</span>;
    });
  }

  render() {
    if (!this.open) return null;

    return (
      <div class="backdrop" onMouseDown={e => this.handleMouseDown(e)} onMouseUp={e => this.handleMouseUp(e)}>
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <div class="eyebrow">Audio player</div>
              <h3>Listen to this response</h3>
            </div>
            <sl-icon-button name="x-lg" label="Close" onClick={() => this.hide()}></sl-icon-button>
          </div>

          <div class="modal-body">
            <div class="content-card">
              <div class="content-header">
                <div class="avatar">
                  <sl-icon name="volume-up-fill"></sl-icon>
                </div>
                <div>
                  <div class="label">Assistant voice</div>
                  <div class="subtitle">Local speech playback</div>
                </div>
              </div>
              <p class="spoken-text">{this.getSpokenTextMarkup()}</p>
            </div>

            {this.isGenerating ? (
              <div class="loading-state">
                <sl-spinner class="audio-generating-spinner"></sl-spinner>
                <p>Generating audio...</p>
              </div>
            ) : (
              <div class="player-card">
                <div class="visualizer" aria-hidden="true">
                  {this.visualizerLevels.map((level, index) => (
                    <div class={{ 'bar': true, 'bar--active': this.isPlaying && level > 0 }} style={{ height: `${Math.max(10, level)}%` }} key={index}></div>
                  ))}
                </div>

                <div class="player-controls">
                  <sl-icon-button
                    class="play-pause-btn"
                    name={this.isPlaying ? 'pause-circle-fill' : 'play-circle-fill'}
                    label={this.isPlaying ? 'Pause' : 'Play'}
                    onClick={() => TtsService.togglePlay()}
                  ></sl-icon-button>

                  <div class="timeline">
                    <sl-range min={0} max={this.duration || 1} value={this.currentTime} ref={(el: any) => this.bindRangeElement(el)} class="seek-bar"></sl-range>
                    <div class="time-row">
                      <span>{this.formatTime(this.currentTime)}</span>
                      <span>{this.formatTime(this.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
