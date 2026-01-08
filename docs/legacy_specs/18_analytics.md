# M18: Analytics 詳細設計書

> **モジュールID**: M18  
> **Tier**: 3 (Advanced - 明示的に有効化)  
> **依存**: M10

---

## 1. 概要

使用量分析、コスト追跡、パフォーマンス監視。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **デフォルト** | SQLiteローカル保存のみ | インフラ負荷軽減 |
| **Langfuse** | 外部サーバー設定時のみオプション | Docker不要化 |
| **ダッシュボード** | SQLクエリベースの簡易版 | 軽量化 |

---

## 3. ストレージ構成

> ⚠️ **改善**: デフォルトはSQLiteのみ

### 3.1 SQLite（デフォルト）

```sql
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY,
  type TEXT,  -- 'llm_call', 'workflow_execution', 'tool_use'
  timestamp DATETIME,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost REAL,
  success BOOLEAN
);
```

### 3.2 Langfuse（オプション）

```yaml
analytics:
  provider: local  # または 'langfuse'
  
  langfuse:
    enabled: false  # 明示的に有効化必要
    host: https://cloud.langfuse.com
    publicKey: ${LANGFUSE_PUBLIC_KEY}
    secretKey: ${LANGFUSE_SECRET_KEY}
```

---

## 4. ダッシュボード

### 4.1 概要パネル

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics                                   期間: [過去7日▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│ │ トークン    │ │ 推定コスト  │ │ 成功率      │ │ 実行数  ││
│ │   125,430   │ │   ~$12.50   │ │    94.2%    │ │   156   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘│
│                                                             │
│ モデル別使用量                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ GPT-4o         [████████████░░░░░░░░] 60%               ││
│ │ Claude-3.5     [████████░░░░░░░░░░░░] 30%               ││
│ │ Llama-3.2      [██░░░░░░░░░░░░░░░░░░] 10%               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 予算管理

```yaml
budget:
  monthly_limit: 50  # USD
  
  alerts:
    - threshold: 80  # 80%到達
      action: notify
    - threshold: 100  # 100%到達
      action: switch_to_local
```

---

## 6. モジュールAPI

```typescript
export interface AnalyticsAPI {
  // メトリクス記録
  record(metric: Metric): void;
  
  // クエリ
  query(filter: MetricFilter): Promise<Metric[]>;
  getSummary(period: Period): Promise<Summary>;
  
  // 予算
  getBudgetStatus(): BudgetStatus;
  setBudget(amount: number): void;
  
  // エクスポート
  export(format: 'json' | 'csv'): Promise<string>;
}
```

---

## 7. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **SQLite** | メトリクス保存 | Public Domain |
| **Chart.js** | グラフ描画 | MIT |
| **Langfuse** | トレーシング（オプション） | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
