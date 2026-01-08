# LocalLLM Agent Manager - Requirements Specification v3.4 (Production Ready)
**Date**: 2026-01-08
**Status**: PRODUCTION READY

## 1. Executive Summary
The LocalLLM Agent Manager is a high-level orchestration system that manages autonomous agents, workflows, and knowledge with full API integration.

**Core Value Proposition**:
- **Zero-Touch Configuration**: LLM settings propagate automatically to all services
- **Natural Language Automation**: Create n8n workflows from plain text
- **Autonomous Coding**: Delegate tasks to OpenHands agent
- **Mobile Access**: PWA with 2FA for remote monitoring
- **Unified Knowledge**: Auto-indexed RAG across local files and Dify

## 2. System Components

| Component | Role | Port |
|-----------|------|------|
| Electron App | Dashboard & Orchestration | 5173 |
| OpenHands | Autonomous Coding Agent | 3000 |
| n8n | Workflow Automation | 5678 |
| Dify | RAG & LLM Gateway | 80 |
| Remote API | Mobile Access | 3001 |

## 3. Agent Capabilities

### 3.1 Available Tools (18)
```
File Operations: read_file, write_file, list_directory, search_text
System: execute_command
n8n: list_workflows, create_workflow, execute_workflow
OpenHands: execute_task, get_status
Dify: list_datasets, search_knowledge, add_document
Workflow: generate_workflow (NL→n8n)
Docker: manage_openhands, manage_n8n, manage_dify
RAG: toggle_auto_indexing
```

### 3.2 Natural Language Workflow Generation
```typescript
// Example: "毎日18時にGitのコミット履歴を取得して日報を作成"
const workflow = await generator.generate(description);
// Creates n8n workflow with scheduled trigger + nodes
```

## 4. Knowledge Management

### 4.1 Auto RAG Indexer
- **Modes**: idle (1min activity timeout), manual, realtime
- **Watched Extensions**: .md, .txt, .ts, .tsx, .js, .py, .json, .yaml
- **Exclusions**: node_modules, .git, dist, build

### 4.2 RAG MCP Server
Exposes knowledge tools for OpenHands via MCP protocol:
- `search_knowledge`: Semantic search
- `add_to_knowledge`: Add documents
- `list_knowledge_sources`: List datasets

## 5. Remote & Mobile Access

### 5.1 Authentication
- Password + TOTP 2FA
- 24-hour session expiry
- Device tracking

### 5.2 Mobile Features
- Task approval
- Workflow execution (no edit)
- System monitoring
- PWA installable

## 6. Default Credentials
- **n8n**: admin@localllm.local / LocalLLM2024!
- **Remote API**: (configurable)

## 7. Test Coverage
| Type | Count |
|------|-------|
| Unit Tests | 40 |
| E2E Tests | 18 |
| Build Modules | 1764 |
