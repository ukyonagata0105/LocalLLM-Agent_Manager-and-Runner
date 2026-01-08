export interface VoiceTranscriptionResult {
    text: string;
    confidence: number;
    language?: string;
    duration?: number;
}

export interface VoiceConfig {
    model: string;
    language?: string;
    sampleRate?: number;
}

export class VoiceTranscriber {
    private config: VoiceConfig;

    constructor(config?: Partial<VoiceConfig>) {
        this.config = { model: 'whisper-1', ...config };
    }

    async transcribe(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
        // In production: use Whisper.cpp or OpenAI Whisper API
        console.log(`[Voice] Transcribing audio (${audioBlob.size} bytes)`);
        return {
            text: 'Transcribed text would appear here',
            confidence: 0.95,
            language: this.config.language || 'en',
            duration: 0,
        };
    }

    async transcribeFromMic(): Promise<VoiceTranscriptionResult> {
        // In production: record from microphone and transcribe
        return this.transcribe(new Blob());
    }
}

let instance: VoiceTranscriber | null = null;

export function getVoiceTranscriber(config?: Partial<VoiceConfig>): VoiceTranscriber {
    if (!instance) instance = new VoiceTranscriber(config);
    return instance;
}
