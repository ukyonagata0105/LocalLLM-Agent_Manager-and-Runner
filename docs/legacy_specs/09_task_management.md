# M09: Task Management 詳細設計書

> **モジュールID**: M09  
> **Tier**: 2 (Standard - デフォルト有効)  
> **依存**: M01

---

## 1. 概要

task.md形式のタスク管理。カンバン・リスト・カレンダービュー。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **外部編集** | 競合時はリロードダイアログ表示（マージなし） | 実装複雑性回避 |
| **依存関係** | 単純なブロック関係のみ（クリティカルパス非対応） | スコープ限定 |

---

## 3. task.md形式

```markdown
# プロジェクト名

## カテゴリ
- [ ] 未完了タスク
- [/] 進行中タスク
- [x] 完了タスク

## 詳細
- [ ] タスク名 @assignee #tag due:2024-01-15 priority:high
```

---

## 4. 外部編集の競合処理

> ⚠️ **改善**: 複雑なマージは避け、ユーザー選択

```typescript
interface ConflictHandler {
  onExternalChange(path: string): void;
}

// 実装
watcher.on('change', async (path) => {
  const hasLocalChanges = editor.isDirty();
  
  if (hasLocalChanges) {
    const choice = await ui.confirm(
      'ファイルが外部で変更されました',
      {
        buttons: ['外部変更を読み込む', 'ローカル変更を維持']
      }
    );
    
    if (choice === 0) {
      editor.reload();
    }
    // choice === 1 の場合は何もしない
  } else {
    editor.reload();
  }
});
```

---

## 5. ビュー

### 5.1 リストビュー

```
▼ Phase 1
  ☑ 要件定義     @alice  ✓
  ◐ 実装        @bob    進行中
  ☐ テスト      @charlie 未着手
```

### 5.2 カンバンビュー

```
┌──────────────┬──────────────┬──────────────┐
│   To Do      │ In Progress  │    Done      │
├──────────────┼──────────────┼──────────────┤
│ [テスト]     │ [実装]       │ [要件定義]   │
└──────────────┴──────────────┴──────────────┘
```

---

## 6. エージェント連携

```typescript
interface TaskAgentIntegration {
  // エージェントからタスク操作
  markAsStarted(taskId: string): Promise<void>;
  markAsCompleted(taskId: string): Promise<void>;
  
  // タスクからエージェント起動
  executeTask(taskId: string): Promise<void>;
}
```

---

## 7. モジュールAPI

```typescript
export interface TaskManagementAPI {
  // CRUD
  createTask(task: CreateTaskInput): Task;
  updateTask(id: string, updates: Partial<Task>): Task;
  deleteTask(id: string): void;
  
  // クエリ
  getTasks(filter?: TaskFilter): Task[];
  
  // ファイル
  loadFromFile(path: string): Promise<void>;
  saveToFile(path: string): Promise<void>;
}
```

---

## 8. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **marked** | Markdownパース | MIT |
| **chokidar** | ファイル監視 | MIT |
| **date-fns** | 日付処理 | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
