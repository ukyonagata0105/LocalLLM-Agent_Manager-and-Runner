# 詳細要件定義書 インデックス v2.0

## 概要

LocalLLM Agent Manager & Runnerの全20機能の詳細設計書。
**全機能をモジュールとして実装し、有効化/無効化を選択可能**な設計。

---

## モジュール分類

### Tier 1: Core（必須・常に有効）
| ID | ドキュメント | 内容 |
|----|-------------|------|
| M01 | [Core Engine](./01_orchestration.md) | Subagent、自律レベル、Hooks |
| M02 | [LLM Providers](./02_llm_providers.md) | ローカル/クラウドLLM |
| M04 | [Workflow Engine](./04_workflow_editor.md) | ビジュアルエディタ |
| M10 | [Local Environment](./10_local_environment.md) | Electronアプリ基盤 |
| M21 | [Dashboard](./21_dashboard.md) | 統合ダッシュボード/IDE |
| M22 | [CLI Interface](./22_cli_interface.md) | 管理用CLIツール |

### Tier 2: Standard（デフォルト有効）
| ID | ドキュメント | 内容 |
|----|-------------|------|
| M03 | [MCP Integration](./03_mcp_integration.md) | ツール連携 |
| M05 | [RAG](./05_rag_semantic_search.md) | セマンティック検索 |
| M09 | [Task Management](./09_task_management.md) | タスク管理 |

### Tier 3: Advanced（オプション・明示的に有効化）
| ID | ドキュメント | 内容 | 追加要件 |
|----|-------------|------|----------|
| M06 | [Voice Transcription](./06_voice_transcription.md) | 音声文字起こし | Whisper |
| M07 | [PDF Reader](./07_pdf_reader.md) | PDF閲覧・注釈 | - |
| M08 | [Browser Automation](./08_browser_automation.md) | ブラウザ操作 | Playwright |
| M12 | [Voice Interface](./12_voice_interface.md) | 音声対話 | Whisper + TTS |
| M13 | [Multi-Model](./13_multimodel.md) | モデル自動選択 | 複数LLM設定 |
| M14 | [Agent Memory](./14_agent_memory.md) | 長期記憶 | ベクトルDB |
| M15 | [Docker Sandbox](./15_docker_sandbox.md) | コード実行 | Docker |
| M16 | [Multimodal](./16_multimodal.md) | 画像理解・生成 | - |
| M17 | [Marketplace](./17_marketplace.md) | プラグイン管理 | - |
| M18 | [Analytics](./18_analytics.md) | 使用量分析 | - |

### Tier 4: Server（サーバーモード専用）
| ID | ドキュメント | 内容 | 追加要件 |
|----|-------------|------|----------|
| M11 | [Remote Access](./11_remote_access.md) | リモートアクセス | トンネル |
| M19 | [Team](./19_team_multiuser.md) | マルチユーザー | 認証 |
| M20 | [API Gateway](./20_api_gateway.md) | 外部連携 | - |

---

## 各ドキュメントの構成

各詳細設計書は以下の標準フォーマットに従います：

1. **モジュールヘッダー**: ID、Tier、依存関係
2. **概要**: 機能説明
3. **制限事項**: gemini-request.mdの指摘を反映
4. **詳細仕様**: 技術的な設計
5. **UI**: 画面設計
6. **モジュールAPI**: TypeScriptインターフェース
7. **技術スタック**: 使用ライブラリ

---

## 参考ドキュメント

- [requirements_specification.md](../../requirements_specification.md) - メイン要件定義書
- [gemini-request.md](../../gemini-request.md) - レビュー指摘事項と改善提案

---

*全20件完成 | v2.0 | 最終更新: 2026-01-05*
