# M03: MCP Integration 詳細設計書

> **モジュールID**: M03  
> **Tier**: 2 (Standard - デフォルト有効)  
> **依存**: M01, M02  
> **被依存**: M04

---

## 1. 概要

Model Context Protocol（MCP）サーバーの管理とツール呼び出し。

---

## 2. 制限事項（gemini-request.md反映）

| 項目 | 制限 | 理由 |
|------|------|------|
| **起動方式** | Lazy Loading（必要時のみ起動） | 起動遅延対策 |
| **依存環境** | MCPサーバーごとに独立環境（uv/pnpm） | 依存競合回避 |
| **同時起動** | 最大5サーバー | リソース制限 |

---

## 3. MCPサーバー管理

### 3.1 サーバー登録

```yaml
# config/mcp_servers.yaml
servers:
  filesystem:
    command: npx
    args: ["-y", "@anthropic/mcp-server-filesystem", "/path/to/dir"]
    autostart: true
    
  github:
    command: npx
    args: ["-y", "@anthropic/mcp-server-github"]
    env:
      GITHUB_TOKEN: ${GITHUB_TOKEN}
    autostart: false  # Lazy Load
    
  notion:
    command: python
    args: ["-m", "mcp_notion"]
    venv: ~/.mcp/notion-venv  # 独立環境
    autostart: false
```

### 3.2 Lazy Loading

> ⚠️ **改善**: 全サーバー初期ロードではなく必要時に起動

```typescript
class MCPServerManager {
  private activeServers: Map<string, MCPServer> = new Map();
  
  async getServer(id: string): Promise<MCPServer> {
    if (!this.activeServers.has(id)) {
      // 必要になった時点で起動
      const server = await this.startServer(id);
      this.activeServers.set(id, server);
    }
    return this.activeServers.get(id)!;
  }
  
  // アイドルサーバーの自動停止
  async pruneIdleServers(idleMinutes: number = 10): Promise<void> {
    // ...
  }
}
```

---

## 4. 依存環境の分離

> ⚠️ **改善**: サーバー間の依存競合を回避

### 4.1 Python MCPサーバー

```bash
# サーバーごとに独立したvenv
~/.mcp/
├── notion-venv/
│   ├── bin/
│   └── lib/
├── slack-venv/
│   ├── bin/
│   └── lib/
└── custom-venv/
```

### 4.2 Node.js MCPサーバー

```bash
# pnpmワークスペースで分離
~/.mcp/node/
├── filesystem/
│   ├── node_modules/
│   └── package.json
└── github/
    ├── node_modules/
    └── package.json
```

---

## 5. ツール呼び出し

### 5.1 API

```typescript
interface MCPToolCall {
  server: string;
  tool: string;
  arguments: Record<string, any>;
}

interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

// 呼び出し例
const result = await mcp.callTool({
  server: 'filesystem',
  tool: 'read_file',
  arguments: { path: '/path/to/file.txt' }
});
```

### 5.2 タイムアウト

```yaml
mcp:
  timeout:
    connect: 5000   # 5秒
    execute: 30000  # 30秒
```

---

## 6. セキュリティ

### 6.1 権限設定

```yaml
servers:
  filesystem:
    permissions:
      - read: /home/user/documents
      - write: /home/user/documents/output
      # 他のパスはアクセス不可
```

### 6.2 承認フロー

```typescript
// 危険な操作は確認
if (tool.requiresApproval) {
  const approved = await ui.confirm(
    `${tool.name} を実行しますか？`,
    { args: tool.arguments }
  );
  if (!approved) throw new UserCancelledError();
}
```

---

## 7. UI

```
┌─────────────────────────────────────────────────────────────┐
│ MCPサーバー                                  [+ サーバー追加]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🟢 filesystem         [実行中]     ツール: 5    [停止]      │
│    /home/user/documents                                     │
│                                                             │
│ 🟡 github             [待機中]     ツール: 8    [起動]      │
│    Lazy Load - 使用時に自動起動                             │
│                                                             │
│ ⚪ notion             [無効]       ツール: 12   [有効化]    │
│    API Key未設定                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. モジュールAPI

```typescript
export interface MCPIntegrationAPI {
  // サーバー管理
  registerServer(config: MCPServerConfig): void;
  startServer(id: string): Promise<void>;
  stopServer(id: string): Promise<void>;
  
  // ツール
  listTools(serverId?: string): Tool[];
  callTool(call: MCPToolCall): Promise<MCPToolResult>;
  
  // 状態
  getServerStatus(id: string): ServerStatus;
}
```

---

## 9. 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| **@anthropic-ai/sdk** | MCP通信 | MIT |
| **uv** | Python環境分離 | MIT |
| **pnpm** | Node.js環境分離 | MIT |

---

*バージョン: 2.0*
*最終更新: 2026-01-05*
