# M22: CLI Interface (agent-manager)

> **モジュールID**: M22  
> **Tier**: 1 (Core - OpenHands統合)  
> **依存**: M01, M10, M21  
> **被依存**: なし

---

## 1. 概要

本モジュールは、システム全体の管理・運用を行うためのコマンドラインツール `agent-manager` を提供します。
**OpenHands CLI (`openhands`) をラップ** し、単なるタスク実行だけでなく、プロジェクト管理、デーモン起動、ダッシュボードへの接続機能を追加します。

---

## 2. デザイン原則

1.  **Wrapper**: エージェント実行そのものは OpenHands CLI に委譲する（可能な場合）。
2.  **Manager First**: OpenHands が持たない「プロジェクト」「長期記憶」「タスクキュー」の概念を扱う。
3.  **Daemon Control**: サーバーモードやバックグラウンドプロセスの管理を簡単にする。

---

## 3. コマンド体系

### 3.1 ライフサイクル管理

```bash
# プロジェクト初期化（config/, task.md, .agent-memory/ の生成）
$ agent-manager init [project-name]

# マネージャーデーモン起動（Dashboard + OpenHands Runtime）
# --headless: ブラウザなしで起動
$ agent-manager start [--port 3000] [--headless]

# デーモン停止
$ agent-manager stop

# ステータス確認（実行中のエージェント、リソース使用量）
$ agent-manager status
```

### 3.2 タスク実行 (OpenHands Wrapper)

```bash
# 単発タスク実行
# M14の記憶とM09のタスクコンテキストを注入してから OpenHands を起動
$ agent-manager run "Reactでログイン画面を作って"

# ファイルからタスク実行
$ agent-manager run -f ./requirements_updated.md

# 特定のタスクIDを指定して実行（from task.md）
$ agent-manager task run 3
```

### 3.3 設定・管理

```bash
# モジュールの有効化/無効化
$ agent-manager module enable M15_docker
$ agent-manager module list

# キャッシュ/ログのクリア
$ agent-manager clean --all
```

---

## 4. OpenHands CLI との違い

| 機能 | OpenHands CLI (`openhands`) | Agent Manager (`agent-manager`) |
|------|-----------------------------|---------------------------------|
| **スコープ** | 単一セッション / 単一タスク | プロジェクト全体 / ライフサイクル |
| **記憶** | セッション内のみ | **M14 長期記憶** の自動注入 |
| **タスク** | 引数で指定 | **M09 task.md** と連携 |
| **UI** | TUI (Text UI) | **M21 Dashboard** (Web UI) への接続 |

---

## 5. 技術スタック

*   **Runtime**: Node.js (TypeScript)
*   **Library**: `commander` or `yargs`
*   **Internal**: `child_process` で `openhands` コマンドまたは Python ランタイムを呼び出し

---

*バージョン: 2.0 (OpenHands Integrated)*
*最終更新: 2026-01-05*
