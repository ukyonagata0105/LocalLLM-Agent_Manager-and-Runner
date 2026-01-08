# M20: API Gateway 詳細設計書

> **モジュールID**: M20  
> **Tier**: 4 (Server - サーバーモード専用)  
> **依存**: M10, M11

---

## 1. 概要

REST API公開、Webhook受信、メール/RSS監視。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **デフォルトバインド** | 127.0.0.1のみ | セキュリティ |
| **外部公開** | 警告表示 + 認証強制 | 意図しない公開防止 |
| **バックグラウンド** | アプリ起動中のみ（サーバーモード除く） | 常時稼働前提廃止 |

---

## 3. セキュアデフォルト

> ⚠️ **改善**: 意図しない外部公開リスク対策

### 3.1 デフォルト設定

```yaml
api:
  host: 127.0.0.1  # ローカルのみ
  port: 3000
  
  # 外部公開は明示的に設定
  external:
    enabled: false
    require_auth: true  # 強制
```

### 3.2 外部公開時の警告

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ API外部公開の警告                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ APIを外部ネットワークに公開しようとしています。              │
│                                                             │
│ リスク:                                                     │
│ ・不正アクセスの可能性                                      │
│ ・ワークフローの不正実行                                    │
│ ・データ漏洩                                                │
│                                                             │
│ 以下のセキュリティ対策が自動的に有効化されます：             │
│ ☑ APIキー認証                                               │
│ ☑ レート制限                                                │
│ ☑ アクセスログ記録                                          │
│                                                             │
│                         [キャンセル] [理解して有効化]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. APIエンドポイント

### 4.1 ワークフロー

```typescript
POST /api/v1/workflows/{id}/execute
Authorization: Bearer sk-xxxxx
Body: { params: { ... } }
Response: { executionId: string, status: 'started' }

GET /api/v1/workflows/executions/{executionId}
Response: { status: 'completed', output: any }
```

### 4.2 エージェント

```typescript
POST /api/v1/agents/{id}/chat
Body: { message: string }
Response: { response: string }
```

---

## 5. Webhook受信

```yaml
webhooks:
  - id: github-push
    path: /api/v1/webhooks/github-push
    secret: ${GITHUB_WEBHOOK_SECRET}
    trigger:
      workflow: on_github_push
```

---

## 6. 外部監視（アプリ起動中のみ）

> ⚠️ **制限**: 常時稼働ではなくアプリ起動中のみ

```yaml
monitoring:
  email:
    enabled: false  # サーバーモード時のみ推奨
    
  rss:
    enabled: false
    feeds:
      - url: https://example.com/feed
        poll_interval: 15m
```

---

## 7. モジュールAPI

```typescript
export interface APIGatewayAPI {
  // サーバー
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // 設定
  enableExternal(confirm: boolean): Promise<void>;
  
  // Webhook
  registerWebhook(config: WebhookConfig): void;
  
  // APIキー
  createAPIKey(name: string): Promise<string>;
  revokeAPIKey(keyId: string): Promise<void>;
}
```

---

## 8. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **Express** | APIサーバー | MIT |
| **express-rate-limit** | レート制限 | MIT |
| **helmet** | セキュリティヘッダー | MIT |
| **swagger-ui-express** | APIドキュメント | Apache 2.0 |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
