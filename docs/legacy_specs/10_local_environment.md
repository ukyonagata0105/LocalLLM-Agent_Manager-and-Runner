# M10: Local Environment 詳細設計書

> **モジュールID**: M10  
> **Tier**: 1 (Core - 常に有効)  
> **依存**: なし  
> **被依存**: M11, M17, M18, M19, M20

---

## 1. 概要

Electronベースのデスクトップアプリ基盤。データ永続化、自動更新、モジュール管理。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **インストーラー** | 最小構成（Electron+Node）、追加機能はオンデマンド | サイズ肥大化防止 |
| **Docker** | 「上級者向け」扱い、WASMサンドボックスを代替検討 | 一般ユーザーへの障壁 |
| **バックグラウンド** | アプリ起動中のみ動作 | 常時稼働前提の廃止 |

---

## 3. オンデマンドダウンロード

> ⚠️ **改善**: インストーラー最小化

```typescript
interface AssetManager {
  // 必要時にダウンロード
  downloadIfNeeded(asset: Asset): Promise<string>;
  
  // ダウンロード状況
  getDownloadProgress(assetId: string): Progress;
  
  // クリーンアップ
  removeUnused(): Promise<void>;
}

type Asset = 
  | { type: 'whisper-model'; model: WhisperModel }
  | { type: 'llm-model'; model: string }
  | { type: 'python-runtime' }
  | { type: 'playwright-browsers' };
```

### 3.1 初回起動ウィザード

```
┌─────────────────────────────────────────────────────────────┐
│ セットアップ                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 追加コンポーネントをダウンロードしますか？                   │
│                                                             │
│ ☐ ローカルLLM実行環境 (2.5GB)                               │
│   └ Ollama/LM Studio連携に必要                              │
│                                                             │
│ ☐ 音声認識モデル (466MB)                                    │
│   └ Whisper small モデル                                    │
│                                                             │
│ ☐ ブラウザ自動化 (350MB)                                    │
│   └ Chromium ブラウザ                                       │
│                                                             │
│ 後からでもダウンロードできます                               │
│                                                             │
│                     [スキップ] [ダウンロード開始]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 配布形式

### 4.1 対応プラットフォーム

| OS | アーキテクチャ | 形式 |
|----|---------------|------|
| macOS | x64, arm64 | .dmg |
| Windows | x64 | .exe |
| Linux | x64 | .AppImage |

### 4.2 サイズ目標

| 構成 | サイズ |
|------|--------|
| 最小（Electron+Node） | ~150MB |
| +Python Runtime | ~350MB |
| +Whisper small | ~500MB |
| Full | ~2GB |

---

## 5. データ永続化

### 5.1 ストレージ構成

```
~/.localllm-agent/
├── config/
│   ├── settings.yaml
│   └── modules.yaml
├── data/
│   ├── database.sqlite
│   └── vectors/
├── cache/
│   └── models/
├── logs/
└── downloads/  # オンデマンドダウンロード先
```

### 5.2 データベース

```typescript
// SQLite
interface Database {
  workflows: Workflow[];
  executions: Execution[];
  tasks: Task[];
  settings: Setting[];
}
```

---

## 6. モジュールマネージャー

```typescript
interface ModuleManager {
  // 有効化/無効化
  enable(moduleId: string): Promise<void>;
  disable(moduleId: string): Promise<void>;
  
  // 状態
  getStatus(moduleId: string): ModuleStatus;
  listModules(): ModuleInfo[];
  
  // 依存解決
  resolveDependencies(moduleId: string): string[];
}
```

---

## 7. 自動更新

```typescript
interface AutoUpdater {
  checkForUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(): Promise<void>;
  installUpdate(): void;
  
  // 設定
  autoCheck: boolean;
  checkInterval: number;
}
```

---

## 8. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **Electron** | デスクトップアプリ | MIT |
| **electron-builder** | ビルド・配布 | MIT |
| **electron-updater** | 自動更新 | MIT |
| **better-sqlite3** | SQLite | MIT |
| **keytar** | 認証情報保存 | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
