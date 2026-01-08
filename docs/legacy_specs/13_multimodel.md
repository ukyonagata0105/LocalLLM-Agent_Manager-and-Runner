# M13: Multi-Model Orchestration 詳細設計書

> **モジュールID**: M13  
> **Tier**: 3 (Advanced - 明示的に有効化)  
> **依存**: M02  
> **追加要件**: 複数LLM設定（M02経由）

---

## 1. 概要

タスクに応じて最適なLLMを自動選択。コスト最適化、レスポンス向上。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **ルーティング** | ルールベース優先（LLM判定は最終手段） | ルーターコスト削減 |
| **A/Bテスト** | 初期は手動分析のみ | 実装複雑性 |

---

## 3. ルールベースルーティング

> ⚠️ **改善**: LLM推論コスト削減

```typescript
class RuleBasedRouter {
  private rules: RoutingRule[] = [
    // キーワードマッチ
    {
      match: (task) => task.includes('コード') || task.includes('プログラム'),
      model: 'claude-3-5-sonnet'
    },
    {
      match: (task) => task.includes('要約') || task.includes('まとめ'),
      model: 'gpt-4o-mini'
    },
    {
      match: (task) => task.length < 100,  // 短いタスク
      model: 'llama-3.2-3b'
    }
  ];
  
  route(task: string): string {
    for (const rule of this.rules) {
      if (rule.match(task)) {
        return rule.model;
      }
    }
    // フォールバック: デフォルトモデル
    return this.defaultModel;
  }
}
```

### 3.1 ルーティング優先度

1. **ユーザー指定** - 明示的にモデル指定された場合
2. **ルールベース** - キーワード・タスク長による分類
3. **LLM分類** - 上記で判定できない場合のみ（コスト発生）
4. **デフォルト** - 設定されたデフォルトモデル

---

## 4. コスト最適化

```typescript
interface CostOptimizer {
  // 予算内で最適なモデル選択
  selectWithinBudget(
    task: string,
    dailyBudgetRemaining: number
  ): string;
  
  // 予算超過時の動作
  onBudgetExceeded: 'switch_to_local' | 'block' | 'warn';
}
```

---

## 5. UI

```
┌─────────────────────────────────────────────────────────────┐
│ マルチモデル設定                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ルーティングモード:                                         │
│ (●) ルールベース（推奨・低コスト）                          │
│ ( ) LLM自動判定（高精度・コスト増）                         │
│                                                             │
│ タスク別ルール:                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ キーワード「コード」 → claude-3-5-sonnet              ││
│ │ キーワード「要約」   → gpt-4o-mini                    ││
│ │ 短いタスク（<100文字）→ llama-3.2-3b                  ││
│ │ その他              → gpt-4o（デフォルト）            ││
│ └─────────────────────────────────────────────────────────┘│
│ [+ ルール追加]                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. モジュールAPI

```typescript
export interface MultiModelAPI {
  // ルーティング
  route(task: string): Promise<string>;
  
  // ルール管理
  addRule(rule: RoutingRule): void;
  removeRule(ruleId: string): void;
  getRules(): RoutingRule[];
  
  // コスト
  getDailyCost(): number;
  setDailyBudget(amount: number): void;
}
```

---

## 7. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **tiktoken** | トークンカウント | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
