# M15: Docker Sandbox (OpenHands)

> **モジュールID**: M15  
> **Tier**: 1 (Core - OpenHands統合)  
> **依存**: M01 (OpenHands)  
> **被依存**: M04, M21

---

## 1. 概要

OpenHands の中核機能である **Docker Sandbox** を利用し、安全なコード実行環境を提供します。
`M01 Core Engine` が生成したコードは、すべてこのサンドボックス内で実行されます。
ユーザーのローカルファイルシステムへのアクセスは、Dockerのマウント設定を通じて制御します。

---

## 2. 機能要件

### 2.1 実行環境
- **Default Image**: OpenHands標準の実行用イメージを使用（Python, Node.js, Shell などをプリインストール）。
- **Custom Image**: プロジェクトごとの `Dockerfile` に基づくカスタムイメージのビルドと使用をサポート。

### 2.2 ファイルシステム連携 (Manager Layer)
- **Workspace Mount**: ユーザーのプロジェクトディレクトリをサンドボックス内の `/workspace` にマウント。
- **Permission Control**: デフォルトでは読み取り専用などでマウントし、書き込みが必要な場合のみ権限を付与する（Human-in-the-Loop）。

### 2.3 ターミナル接続
- **Web Terminal**: `M21 Dashboard` 上の `XTerm.js` から、サンドボックス内のシェル（`/bin/bash`）へWebSocket経由で接続。
- **Command Log**: 実行されたコマンドとその出力結果を `M14 Agent Memory` に記録。

---

## 3. セキュリティ

- **Network Access**: ホワイトリスト方式で外部アクセスを制限（例: `pip`, `npm`, `github.com` のみ許可）。
- **Resource Limit**: コンテナごとのCPU/メモリ使用量を制限し、ホストマシンの安定性を確保。

---

## 4. 技術スタック

- **Docker SDK**: Node.js から Docker Daemon を介してコンテナを制御。
- **OpenHands Runner**: コンテナ内でのコマンド実行と結果取得を担うエージェント。

---

*バージョン: 2.0 (OpenHands Integrated)*
*最終更新: 2026-01-05*
