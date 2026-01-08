# M01: Core Engine（オーケストレーション）詳細設計書

> **モジュールID**: M08  
> **Tier**: 3 (Advanced - 本システム独自)  
> **依存**: M01 (OpenHands)  
> **被依存**: M04全モジュール

---

## 1. 概要

本モジュールは **OpenHands Runtime** のラッパーとして機能します。
独自の自律ループは実装せず、タスク実行、イベントハンドリング、エージェント状態管理はすべて OpenHands の API を通じて行います。
本システムは「司令塔」として、OpenHands に対して高レベルなタスク指示とコンテキスト注入を行います。

---

## 2. アーキテクチャ

### 2.1 責任分界点

| 機能 | 担当 | 備考 |
|------|------|------|
| **自律ループ** | OpenHands | 思考→行動→観察のサイクル |
| **ツール実行** | OpenHands | Shell, Browser, FileEdit |
| **タスク分解** | M09 (本システム) | 複雑なタスクをサブタスク化 |
| **記憶管理** | M14 (本システム) | 長期記憶の検索と注入 |
| **監視・介入** | M21 (本システム) | ユーザーによる停止・修正指示 |
| **Hookポイント** | `PreToolUse` / `PostToolUse` の2点のみ | 実装複雑性の回避 |
| **PROJECT.md** | Context Pruning機能で関連部分のみ送信 | トークン制限対策 |
| **エラーハンドリング** | 3回リトライ後にユーザー通知 | 無限ループ防止 |

---

## 3. Subagentアーキテクチャ

### 3.1 データソースマップ (OpenHands連携)

| ウィジェット | データソース | API / Event |
|-------------|--------------|-------------|
| **Agent Status** | OpenHands | `agent_state_changed` |
| **Terminal** | OpenHands | `cmd_output` (WebSocket) |
| **Browser** | OpenHands | `screenshot` (Base64 Stream) |
| **File Tree** | OpenHands | `list_files` (Sandbox API) |

### 3.2 Subagent生成

```typescript
interface Subagent {
  type: 'orchestrator' | 'code' | 'research' | 'browser' | 'custom';
  parentId?: string;
  
  // 実行
  execute(task: Task): Promise<Result>;
  
  // ライフサイクル
  spawn(): Promise<Subagent>;
  terminate(): Promise<void>;
}
```

---

## 4. 自律レベル制御

### 4.1 レベル定義

| Level | 名前 | 動作 |
|-------|------|------|
| 0 | Suggest | 提案のみ、実行は人間 |
| 1 | Confirm | 毎回確認を求める |
| 2 | Auto-Safe | 安全な操作のみ自動 |
| 3 | Full | 完全自動（危険操作も） |

### 4.2 操作別デフォルト

```yaml
autonomy:
  default_level: 1
  
  operations:
    file_read: 2
    file_write: 1
    file_delete: 0
    shell_execute: 0
    browser_navigate: 2
    api_call: 1
```

---

## 5. Hookシステム

### 5.1 対応Hook（初期リリース）

> ⚠️ **制限**: 複雑性回避のため、初期は2ポイントのみ

```typescript
type HookPoint = 
  | 'PreToolUse'    // ツール実行前
  | 'PostToolUse';  // ツール実行後

interface Hook {
  point: HookPoint;
  handler: (context: HookContext) => Promise<HookResult>;
}

interface HookResult {
  action: 'allow' | 'deny' | 'modify';
  modifiedArgs?: any;
  reason?: string;
}
```

### 5.2 設定例

```yaml
hooks:
  - point: PreToolUse
    match:
      tool: "shell_*"
    action: require_approval
    
  - point: PostToolUse
    match:
      tool: "*"
    action: log
```

---

## 6. PROJECT.md（コンテキスト管理）

### 6.1 構造

```markdown
# PROJECT.md

## About
プロジェクトの概要

## Rules
- コーディング規約
- 禁止事項

## Architecture
アーキテクチャ概要

## Context
現在のタスクに関連する情報
```

### 6.2 Context Pruning

> ⚠️ **改善**: トークン制限対策

```typescript
interface ContextPruner {
  // 関連セクションのみ抽出
  prune(
    projectMd: string,
    currentTask: Task,
    maxTokens: number
  ): string;
}
```

---

## 7. モジュールAPI

```typescript
// M01 Core Engine API
export interface CoreEngineAPI {
  // Subagent
  createSubagent(config: SubagentConfig): Promise<Subagent>;
  listSubagents(): Subagent[];
  
  // 自律レベル
  setAutonomyLevel(level: number): void;
  getAutonomyLevel(): number;
  
  // Hook
  registerHook(hook: Hook): void;
  unregisterHook(hookId: string): void;
  
  // 実行
  execute(task: Task): Promise<ExecutionResult>;
}
```

---

## 8. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **TypeScript** | 実装言語 | Apache 2.0 |
| **EventEmitter** | Hook実行 | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
