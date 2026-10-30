import { Alert } from './alert.service';

export class TtsService {
  static currentAudio: HTMLAudioElement | null = null;
  static currentUtterance: SpeechSynthesisUtterance | null = null;
  static abortController: AbortController | null = null;
  static animationFrameId: number | null = null;

  static cachedText = '';
  static cachedUrl: string | null = null;

  static onStateChange: (state: { isGenerating: boolean; isPlaying: boolean; currentTime: number; duration: number }) => void = () => { };

  static updateUI(isGenerating = false) {
    let isPlaying = false;
    let currentTime = 0;
    let duration = 0;

    if (this.currentAudio) {
      isPlaying = !this.currentAudio.paused;
      currentTime = this.currentAudio.currentTime || 0;
      duration = this.currentAudio.duration || 0;
    } else if (this.currentUtterance) {
      isPlaying = speechSynthesis.speaking && !speechSynthesis.paused;
    }

    this.onStateChange({ isGenerating, isPlaying, currentTime, duration });
  }

  static startSmoothUIUpdate() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const loop = () => {
      if (this.currentAudio && !this.currentAudio.paused) {
        this.updateUI();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  static stopSmoothUIUpdate() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  static async speak(text: string) {
    const formattedText = this.formatText(text);

    if (!formattedText) {
      Alert.error('There is no text to speak.');
      this.updateUI(false);
      return;
    }

    this.stop();
    this.updateUI(true);

    if (formattedText === this.cachedText && this.cachedUrl) {
      this.playAudioUrl(this.cachedUrl);
      return;
    }

    if (await this.isPiperAvailable()) {
      this.cachedText = formattedText;
      await this.generateAndPlayPiperAudio(formattedText);
      return;
    }

    if ('speechSynthesis' in window) {
      this.playNative(formattedText);
      return;
    }

    this.updateUI(false);
    Alert.error('No TTS options available.');
  }

  static async isPiperAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8000/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  static async getPiperTtsVoices() {
    try {
      const response = await fetch(`http://localhost:8000/voices`);
      console.log(response);
    } catch (error) {
      Alert.error('TTS get voices Error:');
    }
  }

  static async generateAndPlayPiperAudio(text: string, voice = 'en_US-hfc_female-medium') {
    try {
      this.abortController = new AbortController();
      const response = await fetch(`http://localhost:8000/tts?text=${encodeURIComponent(text)}&voice=${voice}`, {
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.error('TTS Error: ' + error.detail);
        this.updateUI(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (this.cachedUrl) {
        URL.revokeObjectURL(this.cachedUrl);
      }

      this.cachedUrl = url;
      this.playAudioUrl(url);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        Alert.error('Network or playback error.');
        this.updateUI(false);
      }
    }
  }

  static playAudioUrl(url: string) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    this.currentAudio = new Audio(url);

    this.currentAudio.onloadedmetadata = () => {
      this.updateUI(false);
    };

    this.currentAudio.onplay = () => {
      this.startSmoothUIUpdate();
      this.updateUI();
    };

    this.currentAudio.onpause = () => {
      this.stopSmoothUIUpdate();
      this.updateUI();
    };
    this.currentAudio.ontimeupdate = () => {
      this.updateUI();
    };
    this.currentAudio.onended = () => {
      this.stopSmoothUIUpdate();
      this.currentAudio?.pause();
      this.currentAudio = null;
      this.updateUI(false);
    };

    this.currentAudio.play().catch(error => {
      console.error('Playback failed', error);
      this.updateUI(false);
    });
  }

  static playNative(text: string) {
    speechSynthesis.cancel();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = 1;
    this.currentUtterance.pitch = 1;
    this.currentUtterance.volume = 1;

    this.currentUtterance.onstart = () => this.updateUI();
    this.currentUtterance.onpause = () => this.updateUI();
    this.currentUtterance.onresume = () => this.updateUI();
    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      this.updateUI(false);
    };

    speechSynthesis.speak(this.currentUtterance);
  }

  static replay() {
    if (this.cachedUrl) {
      this.playAudioUrl(this.cachedUrl);
      return;
    }

    if (this.cachedText) {
      this.speak(this.cachedText);
    }
  }

  static togglePlay() {
    if (this.currentAudio) {
      if (this.currentAudio.paused) {
        if (this.currentAudio.currentTime >= this.currentAudio.duration && this.currentAudio.duration > 0) {
          this.currentAudio.currentTime = 0;
        }
        this.currentAudio.play().catch(() => this.updateUI(false));
      } else {
        this.currentAudio.pause();
      }
    } else if (this.currentUtterance) {
      if (speechSynthesis.speaking) {
        if (speechSynthesis.paused) speechSynthesis.resume();
        else speechSynthesis.pause();
        this.updateUI();
      }
    } else if (this.cachedUrl) {
      this.playAudioUrl(this.cachedUrl);
    }
  }

  static seek(seconds: number) {
    if (this.currentAudio) {
      this.currentAudio.currentTime = seconds;
      this.updateUI();
    }
  }

  static stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    this.stopSmoothUIUpdate();
    this.updateUI(false);
  }

  static formatText(text: string): string {
    return text
      .replace(/[*_`]/g, '')
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF])/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/&/g, 'and')
      .replace(/%/g, ' percent')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
