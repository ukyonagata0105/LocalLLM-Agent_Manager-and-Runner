/**
 * M01 Core Engine - Types
 * Production-level type definitions for the core orchestration engine.
 */

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'error' | 'completed';

export interface AgentSession {
    id: string;
    status: AgentStatus;
    currentTask?: string;
    messages: AgentMessage[];
    startedAt: number;
    completedAt?: number;
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    toolResult?: unknown;
}

export interface AgentContext {
    projectPath?: string;
    systemPrompt?: string;
    memory?: string[];
    tools?: string[];
    maxIterations?: number;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, {
        type: string;
        description: string;
        required?: boolean;
    }>;
    execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ExecutionResult {
    success: boolean;
    output?: unknown;
    error?: string;
    tokensUsed?: number;
    duration?: number;
}
