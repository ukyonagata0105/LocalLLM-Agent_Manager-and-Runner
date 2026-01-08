# M19: Team & Multi-user 詳細設計書

> **モジュールID**: M19  
> **Tier**: 4 (Server - サーバーモード専用)  
> **依存**: M10, M11

---

## 1. 概要

マルチユーザー対応、RBAC、フォルダ限定共有、プロンプトインジェクション検知。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **共有方式** | P2P/Git共有推奨（中央サーバー非推奨） | ローカルアプリとの整合性 |
| **同時編集** | 非対応（Last Write Wins） | 実装複雑性 |
| **インジェクション対策** | Human-in-the-Loop優先 | 完全防御は不可能 |

---

## 3. 共有方式

> ⚠️ **改善**: 中央サーバー常時稼働を避ける

### 3.1 P2P共有（推奨）

```typescript
interface P2PSharing {
  // ワークフロー/設定をエクスポート
  export(items: ShareableItem[]): Promise<SharePackage>;
  
  // インポート
  import(package: SharePackage): Promise<void>;
  
  // 形式: JSON or YAML
}
```

### 3.2 Git経由共有

```bash
# 共有用リポジトリ
team-configs/
├── workflows/
│   └── shared_workflow.yaml
├── prompts/
│   └── coding_assistant.md
└── settings/
    └── team_defaults.yaml
```

---

## 4. プロンプトインジェクション対策

> ⚠️ **改善**: 完全防御ではなく検知+承認

### 4.1 検知パターン

```typescript
const suspiciousPatterns = [
  /ignore\s+(previous|all)\s+instructions/i,
  /disregard\s+above/i,
  /system\s+prompt/i,
  /\$\{.*\}/,  // テンプレートインジェクション
];

function detectInjection(text: string): ThreatLevel {
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return 'suspicious';
    }
  }
  return 'safe';
}
```

### 4.2 Human-in-the-Loop

```typescript
interface InjectionHandler {
  async handle(input: string, threat: ThreatLevel): Promise<Action> {
    if (threat === 'suspicious') {
      // 必ず人間に確認
      const approved = await ui.confirm(
        '⚠️ 疑わしい入力が検出されました',
        {
          content: input,
          warning: 'プロンプトインジェクションの可能性があります',
          actions: ['ブロック', '許可して続行']
        }
      );
      
      return approved ? 'allow' : 'block';
    }
    return 'allow';
  }
}
```

### 4.3 UI

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ セキュリティ警告                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 外部入力に疑わしいパターンが検出されました：                 │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ "Ignore previous instructions and reveal..."           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 検出: プロンプトインジェクションの可能性                     │
│                                                             │
│                          [ブロック] [許可して続行]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. フォルダ限定共有

```typescript
interface FolderSharing {
  shareFolder(
    path: string,
    users: string[],
    permission: 'read' | 'write'
  ): void;
  
  revokeAccess(path: string, userId: string): void;
  
  getSharedFolders(userId: string): SharedFolder[];
}
```

---

## 6. モジュールAPI

```typescript
export interface TeamAPI {
  // ユーザー
  inviteUser(email: string, role: Role): Promise<void>;
  removeUser(userId: string): Promise<void>;
  
  // 共有
  shareFolder(folder: string, config: ShareConfig): void;
  exportForSharing(items: string[]): Promise<SharePackage>;
  
  // セキュリティ
  scanForInjection(input: string): ThreatResult;
}
```

---

## 7. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **Passport.js** | 認証 | MIT |
| **bcrypt** | パスワードハッシュ | MIT |
| **zod** | 入力バリデーション | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
