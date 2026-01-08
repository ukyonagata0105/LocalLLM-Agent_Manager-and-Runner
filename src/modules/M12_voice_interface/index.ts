export interface VoiceInterfaceConfig {
    sttEnabled: boolean;
    ttsEnabled: boolean;
    language: string;
    voice?: string;
}

export class VoiceInterface {
    private config: VoiceInterfaceConfig;
    private synth: SpeechSynthesis | null = null;

    constructor(config?: Partial<VoiceInterfaceConfig>) {
        this.config = {
            sttEnabled: true,
            ttsEnabled: true,
            language: 'en-US',
            ...config,
        };

        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.synth = window.speechSynthesis;
        }
    }

    async speak(text: string): Promise<void> {
        if (!this.config.ttsEnabled || !this.synth) {
            console.log(`[TTS] Would speak: ${text}`);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.config.language;

        return new Promise((resolve) => {
            utterance.onend = () => resolve();
            this.synth!.speak(utterance);
        });
    }

    stopSpeaking(): void {
        this.synth?.cancel();
    }

    getAvailableVoices(): SpeechSynthesisVoice[] {
        return this.synth?.getVoices() || [];
    }
}

let instance: VoiceInterface | null = null;

export function getVoiceInterface(config?: Partial<VoiceInterfaceConfig>): VoiceInterface {
    if (!instance) instance = new VoiceInterface(config);
    return instance;
}
