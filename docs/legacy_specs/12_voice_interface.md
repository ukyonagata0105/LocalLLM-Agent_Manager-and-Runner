# M12: Voice Interface 詳細設計書

> **モジュールID**: M12  
> **Tier**: 3 (Advanced - 明示的に有効化)  
> **依存**: M01, M02  
> **追加要件**: Whisper + Piper/Coqui TTS

---

## 1. 概要

音声対話インターフェース。STT（音声認識）、TTS（音声合成）。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **レイテンシ** | ストリーミングTTS + Filler応答で軽減 | 会話体験向上 |
| **VRAM** | M06と排他制御共有 | リソース競合 |
| **多言語** | 日本語・英語のみ初期対応 | 品質確保 |

---

## 3. レイテンシ対策

> ⚠️ **改善**: 応答遅延によるUX低下対策

### 3.1 ストリーミングTTS

```typescript
interface StreamingTTS {
  // LLM出力を待たず、最初のセンテンスから再生開始
  synthesizeStream(textStream: AsyncIterable<string>): AudioStream;
}

// 使用例
const textStream = llm.chatStream(request);
const audioStream = tts.synthesizeStream(textStream);
audioPlayer.play(audioStream);
```

### 3.2 Filler応答

```typescript
const fillers = [
  "はい、少々お待ちください",
  "確認しています",
  "わかりました、処理中です"
];

async function respondWithFiller() {
  // 即座にFiller再生
  tts.speak(randomChoice(fillers));
  
  // バックグラウンドでLLM実行
  const response = await llm.chat(request);
  tts.speak(response);
}
```

---

## 4. 音声認識（STT）

```typescript
interface SpeechToText {
  transcribe(audio: AudioBuffer): Promise<string>;
  transcribeStream(stream: AudioStream): AsyncIterable<string>;
  
  config: {
    model: 'tiny' | 'base' | 'small' | 'medium' | 'large';
    language: 'ja' | 'en' | 'auto';
  };
}
```

---

## 5. 音声合成（TTS）

```typescript
interface TextToSpeech {
  synthesize(text: string): Promise<AudioBuffer>;
  synthesizeStream(textStream: AsyncIterable<string>): AudioStream;
  
  config: {
    voice: string;
    speakingRate: number;
  };
}
```

---

## 6. UI

```
┌─────────────────────────────────────────────────────────────┐
│ 音声アシスタント                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                  ┌───────────────────┐                      │
│                  │   (波形表示)      │                      │
│                  └───────────────────┘                      │
│                                                             │
│                "タスクの状況を教えて"                        │
│                                                             │
│                    [🎤 押して話す]                          │
│                                                             │
│ 設定: [small ▼] 言語: [自動 ▼]                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. モジュールAPI

```typescript
export interface VoiceInterfaceAPI {
  // STT
  startListening(): Promise<void>;
  stopListening(): Promise<string>;
  
  // TTS
  speak(text: string): Promise<void>;
  stopSpeaking(): void;
  
  // 会話
  startConversation(): Promise<void>;
  endConversation(): void;
}
```

---

## 8. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **Whisper.cpp** | 音声認識 | MIT |
| **Piper** | 音声合成 | MIT |
| **Web Audio API** | 音声I/O | - |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
