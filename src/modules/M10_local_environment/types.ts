/**
 * M10 Local Environment - Types
 * Production-level type definitions for configuration and module management.
 */

export interface AppConfig {
    mode: 'desktop' | 'server';
    dataDir: string;
    logsDir: string;
    server: {
        host: string;
        port: number;
        requireAuth: boolean;
    };
    modules: Record<string, ModuleConfig>;
}

export interface ModuleConfig {
    enabled: boolean;
    settings?: Record<string, unknown>;
}

export interface ModuleDefinition {
    id: string;
    name: string;
    tier: 1 | 2 | 3 | 4;
    dependencies: string[];
    defaultEnabled: boolean;
}

export interface SystemInfo {
    platform: NodeJS.Platform;
    arch: string;
    nodeVersion: string;
    electronVersion?: string;
    cpuCores: number;
    totalMemory: number;
    freeMemory: number;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
    // Tier 1: Core
    { id: 'M01', name: 'Core Engine', tier: 1, dependencies: [], defaultEnabled: true },
    { id: 'M02', name: 'LLM Providers', tier: 1, dependencies: ['M01'], defaultEnabled: true },
    { id: 'M04', name: 'Workflow Engine', tier: 1, dependencies: ['M01'], defaultEnabled: true },
    { id: 'M10', name: 'Local Environment', tier: 1, dependencies: [], defaultEnabled: true },
    { id: 'M21', name: 'Dashboard', tier: 1, dependencies: ['M10'], defaultEnabled: true },
    { id: 'M22', name: 'CLI Interface', tier: 1, dependencies: ['M01'], defaultEnabled: true },

    // Tier 2: Standard
    { id: 'M03', name: 'MCP Integration', tier: 2, dependencies: ['M02'], defaultEnabled: true },
    { id: 'M05', name: 'RAG & Semantic Search', tier: 2, dependencies: ['M02'], defaultEnabled: true },
    { id: 'M09', name: 'Task Management', tier: 2, dependencies: ['M01'], defaultEnabled: true },

    // Tier 3: Advanced
    { id: 'M06', name: 'Voice Transcription', tier: 3, dependencies: [], defaultEnabled: false },
    { id: 'M07', name: 'PDF Reader', tier: 3, dependencies: [], defaultEnabled: false },
    { id: 'M08', name: 'Browser Automation', tier: 3, dependencies: ['M01'], defaultEnabled: false },
    { id: 'M12', name: 'Voice Interface', tier: 3, dependencies: ['M06'], defaultEnabled: false },
    { id: 'M13', name: 'Multi-Model Orchestration', tier: 3, dependencies: ['M02'], defaultEnabled: false },
    { id: 'M14', name: 'Agent Memory', tier: 3, dependencies: ['M05'], defaultEnabled: false },
    { id: 'M15', name: 'Docker Sandbox', tier: 3, dependencies: ['M01'], defaultEnabled: false },
    { id: 'M16', name: 'Multimodal', tier: 3, dependencies: ['M02'], defaultEnabled: false },
    { id: 'M17', name: 'Marketplace', tier: 3, dependencies: [], defaultEnabled: false },
    { id: 'M18', name: 'Analytics', tier: 3, dependencies: [], defaultEnabled: false },

    // Tier 4: Server
    { id: 'M11', name: 'Remote Access', tier: 4, dependencies: ['M10'], defaultEnabled: false },
    { id: 'M19', name: 'Team & Multi-user', tier: 4, dependencies: ['M10', 'M11'], defaultEnabled: false },
    { id: 'M20', name: 'API Gateway', tier: 4, dependencies: ['M10', 'M11'], defaultEnabled: false },
];
