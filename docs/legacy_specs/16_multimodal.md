# M16: Multimodal 詳細設計書

> **モジュールID**: M16  
> **Tier**: 3 (Advanced - 明示的に有効化)  
> **依存**: M02

---

## 1. 概要

画像理解・生成、OCR。マルチモーダルLLM連携。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **ローカルモデル** | 「簡易モード」と表示、クラウド推奨 | 性能期待値管理 |
| **OCR精度** | 日本語は限定的、クラウドフォールバック推奨 | ローカル限界 |

---

## 3. 性能期待値管理

> ⚠️ **改善**: ローカルモデルへの過度な期待を抑制

### 3.1 モード表示

```typescript
interface VisionAnalysis {
  async analyze(image: Buffer, prompt: string): Promise<AnalysisResult> {
    const result = await this.model.analyze(image, prompt);
    
    // ローカルモデル使用時は注釈を付ける
    if (this.isLocalModel) {
      result.disclaimer = 
        '⚠️ 簡易解析モード: より詳細な分析にはクラウドモデルをお試しください';
    }
    
    return result;
  }
}
```

### 3.2 UI表示

```
┌─────────────────────────────────────────────────────────────┐
│ 画像解析結果                                                │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ 簡易解析モード（ローカルモデル使用中）                    │
│    より詳細な分析には [Claude Vision に切り替え]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 解析結果:                                                   │
│ この画像にはグラフが含まれています。棒グラフで...           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 対応モデル

### 4.1 ローカル

| モデル | 用途 | 備考 |
|--------|------|------|
| **LLaVA** | 画像理解 | 日本語限定的 |
| **Bakllava** | 画像理解 | - |

### 4.2 クラウド（推奨）

| モデル | 用途 | 備考 |
|--------|------|------|
| **GPT-4V** | 画像理解 | OCR高精度 |
| **Claude Vision** | 画像理解 | ドキュメント得意 |
| **Gemini Pro Vision** | 画像理解 | 日本語対応 |

---

## 5. 機能

### 5.1 画像理解

```typescript
interface ImageUnderstanding {
  analyze(image: Buffer, prompt: string): Promise<string>;
  describe(image: Buffer): Promise<string>;
  extractText(image: Buffer): Promise<string>;  // OCR
}
```

### 5.2 画像生成（クラウドのみ）

```typescript
interface ImageGeneration {
  generate(prompt: string): Promise<Buffer>;
  
  // 対応プロバイダ
  provider: 'dalle' | 'stability';
}
```

---

## 6. モジュールAPI

```typescript
export interface MultimodalAPI {
  // 画像理解
  analyze(image: Buffer, prompt: string): Promise<AnalysisResult>;
  extractText(image: Buffer): Promise<string>;
  
  // 画像生成（クラウドのみ）
  generate?(prompt: string): Promise<Buffer>;
  
  // モデル切り替え
  switchToCloud(): void;
  switchToLocal(): void;
}
```

---

## 7. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **sharp** | 画像処理 | Apache 2.0 |
| **tesseract.js** | OCRフォールバック | Apache 2.0 |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
