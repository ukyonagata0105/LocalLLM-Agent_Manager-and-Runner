# M02: LLM Providers 詳細設計書

> **モジュールID**: M02  
> **Tier**: 1 (Core - 常に有効)  
> **依存**: M01  
> **被依存**: M13, M16

---

## 1. 概要

ローカルLLM（LM Studio, Ollama）およびクラウドLLM（OpenAI, Anthropic, Google等）への統一接続レイヤー。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **コスト計算** | 「推定コスト」として表示 | プロバイダ間のトークン計算差異 |
| **フォールバック** | 最大2段階（Primary→Secondary→Error） | 無限ループ・コスト増防止 |
| **デフォルト** | クラウドAPI推奨、ローカルはオプション | ハードウェア要件軽減 |

---

## 3. 対応プロバイダ

### 3.1 ローカル

| プロバイダ | 接続方式 | 備考 |
|-----------|---------|------|
| **LM Studio** | OpenAI互換API | 推奨 |
| **Ollama** | REST API | 軽量 |
| **LocalAI** | OpenAI互換API | - |

### 3.2 クラウド

| プロバイダ | 対応モデル | SDK |
|-----------|-----------|-----|
| **OpenAI** | GPT-4o, GPT-4, GPT-3.5 | openai |
| **Anthropic** | Claude 3.5, Claude 3 | @anthropic-ai/sdk |
| **Google** | Gemini 1.5 Pro/Flash | @google/generative-ai |
| **Groq** | Llama, Mixtral | OpenAI互換 |

---

## 4. 統一API

```typescript
interface LLMProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  
  // 接続
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // モデル
  listModels(): Promise<Model[]>;
  
  // 推論
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;
  
  // Embedding（オプション）
  embed?(text: string): Promise<number[]>;
}

interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
}
```

---

## 5. フォールバック

### 5.1 チェーン設定

> ⚠️ **制限**: 最大2段階

```yaml
providers:
  primary: openai
  secondary: anthropic
  # tertiary は設定不可
  
fallback:
  max_depth: 2  # ハードコード制限
  triggers:
    - rate_limit
    - timeout
    - server_error
```

### 5.2 フォールバックロジック

```typescript
async function executeWithFallback(request: ChatRequest): Promise<ChatResponse> {
  const chain = [config.primary, config.secondary];
  let lastError: Error | null = null;
  
  for (const providerId of chain) {
    try {
      return await providers[providerId].chat(request);
    } catch (error) {
      lastError = error;
      if (!shouldFallback(error)) break;
    }
  }
  
  throw new FallbackExhaustedError(lastError);
}
```

---

## 6. コスト追跡

### 6.1 推定コスト計算

> ⚠️ **制限**: 正確な計算は困難、推定値として表示

```typescript
interface CostEstimator {
  // tiktoken でトークン数を統一カウント
  countTokens(text: string): number;
  
  // プロバイダ別単価で計算
  estimateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number;  // USD
}

// UI表示
// "推定コスト: ~$0.05"  ← 「~」を付けて概算であることを明示
```

### 6.2 価格テーブル

```yaml
pricing:
  openai:
    gpt-4o:
      input: 0.0025   # per 1K tokens
      output: 0.01
    gpt-4o-mini:
      input: 0.00015
      output: 0.0006
      
  anthropic:
    claude-3-5-sonnet:
      input: 0.003
      output: 0.015
      
  local:
    "*":
      input: 0
      output: 0
```

---

## 7. 設定UI

```
┌─────────────────────────────────────────────────────────────┐
│ LLMプロバイダ設定                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🌐 クラウド（推奨）                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☑ OpenAI                                                ││
│ │   API Key: [sk-••••••••••••] [テスト]                   ││
│ │   デフォルトモデル: [gpt-4o ▼]                          ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ☑ Anthropic                                             ││
│ │   API Key: [sk-ant-•••••] [テスト]                      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 💻 ローカル（オプション）                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☐ LM Studio     http://localhost:1234  ⚠️ 未接続        ││
│ │ ☐ Ollama        http://localhost:11434 ⚠️ 未接続        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ フォールバック: [OpenAI ▼] → [Anthropic ▼] → エラー        │
│                                                             │
│ 今月の推定コスト: ~$12.50                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. モジュールAPI

```typescript
export interface LLMProvidersAPI {
  // プロバイダ管理
  registerProvider(config: ProviderConfig): void;
  getProvider(id: string): LLMProvider;
  listProviders(): LLMProvider[];
  
  // 推論
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;
  
  // コスト
  getEstimatedCost(): CostSummary;
}
```

---

## 9. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **openai** | OpenAI/互換API | MIT |
| **@anthropic-ai/sdk** | Anthropic API | MIT |
| **tiktoken** | トークンカウント | MIT |
| **keytar** | APIキー安全保存 | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
