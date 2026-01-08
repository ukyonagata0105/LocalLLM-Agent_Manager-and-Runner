# LocalLLM Agent Manager

A desktop application for managing and running local LLM agents with integrated workflow automation, RAG capabilities, and Docker service orchestration.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### LLM Provider Integration
- **OpenAI** - GPT-4, GPT-4 Turbo, GPT-3.5
- **Anthropic** - Claude 3 Opus, Sonnet, Haiku
- **Google AI** - Gemini Pro, Gemini Ultra
- **LM Studio** - Local models via OpenAI-compatible API
- **Ollama** - Local model management

### Docker Service Management
- **OpenHands** - Autonomous coding agent
- **n8n** - Workflow automation platform
- **Dify** - RAG and knowledge base platform

### Core Capabilities
- 🔄 **Workflow Editor** - Visual node-based automation builder
- 📚 **RAG Integration** - Knowledge base with semantic search
- 🔐 **Remote Access** - Secure access with 2FA support
- 🌐 **Multi-language** - English, Japanese, Spanish
- 📱 **Responsive UI** - Desktop and mobile-friendly interface

## Installation

### From Release (Recommended)

1. Download the latest release for your platform:
   - **macOS (Apple Silicon)**: `LocalLLM Agent Manager-x.x.x-arm64-mac.zip`
   - **macOS (Intel)**: `LocalLLM Agent Manager-x.x.x-mac.zip`
   - **Windows**: Coming soon
   - **Linux**: Coming soon

2. Extract and move to Applications folder

3. Launch the app - first run will automatically install dependencies

### From Source

```bash
# Clone the repository
git clone https://github.com/ukyonagata0105/LocalLLM-Agent_Manager-and-Runner.git
cd LocalLLM-Agent_Manager-and-Runner

# Install dependencies
npm install

# Run in development mode
npm run dev

# Or run with Electron
npm run electron:dev
```

## Development

### Prerequisites
- Node.js 18+
- npm 9+
- Docker (for service management)

### Scripts

```bash
# Development
npm run dev              # Start Vite dev server
npm run electron:dev     # Start Electron with hot reload

# Build
npm run build            # Build web assets
npm run electron:build   # Build Electron main process

# Testing
npm test                 # Run unit tests
npm run test:e2e         # Run E2E tests

# Package
npm run package:mac      # Build macOS packages
npm run package:win      # Build Windows packages
npm run package:linux    # Build Linux packages
```

### Project Structure

```
├── electron/           # Electron main process
│   ├── main.ts         # Main entry point
│   ├── preload.ts      # Preload script
│   ├── ServiceManager.ts # Docker service orchestration
│   └── setup.ts        # First-run setup
├── src/
│   ├── modules/        # Feature modules
│   │   ├── M01_core/   # Agent engine & tools
│   │   ├── M02_llm/    # LLM provider clients
│   │   ├── M03_mcp/    # MCP server integration
│   │   ├── M04_workflow/ # Workflow editor
│   │   ├── M05_rag/    # RAG & knowledge base
│   │   ├── M21_dashboard/ # UI components
│   │   └── ...
│   ├── components/     # Shared UI components
│   └── locales/        # i18n translations
├── e2e/                # Playwright E2E tests
└── e2e-electron/       # Electron-specific E2E tests
```

## Configuration

### LLM Providers

Configure your preferred LLM provider in Settings:

1. Open the app and click **Settings**
2. Select **LLM Providers**
3. Choose your provider and enter credentials:
   - For cloud providers: Enter API key
   - For local (LM Studio/Ollama): Set base URL (default: `http://localhost:1234/v1`)

### Docker Services

The app manages these Docker containers:
- **OpenHands**: Port 3000
- **n8n**: Port 5678
- **Dify**: Port 80

Services auto-start on launch (configurable in Settings).

## Security

- No `eval()` usage - all Node.js operations via secure IPC
- Path validation for file operations
- Command execution safeguards
- 2FA support for remote access
- Credentials stored securely via electron-store

## Testing

```bash
# Unit tests (51 tests)
npm test

# E2E tests (23 tests)
npm run test:e2e:electron
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [OpenHands](https://github.com/All-Hands-AI/OpenHands)
- [n8n](https://n8n.io/)
- [Dify](https://dify.ai/)
