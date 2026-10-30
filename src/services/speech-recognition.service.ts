import { Alert } from './alert.service';

export class SpeechRecognitionService {
  recognition!: any;

  isSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  startListening(onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void) {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      Alert.error('Speech recognition is not supported by this browser.');
      return;
    }

    this.stopListening();

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = navigator.language || 'en-US';

    this.recognition.onresult = (event: any) => {
      let transcript = '';

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      const isFinal = event.results[event.results.length - 1]?.isFinal || false;
      onResult(transcript, isFinal);
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        Alert.error(`Speech recognition error: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      this.recognition = null;
      onEnd();
    };

    this.recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
