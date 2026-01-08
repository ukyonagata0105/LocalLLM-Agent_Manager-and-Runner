/**
 * M01 Core Engine - Agent Engine
 * Core agent loop implementation.
 */

import { AgentSession, AgentContext, ToolDefinition, ExecutionResult, AgentStatus } from './types';
import { getLLMManager, ChatMessage, ChatCompletionResponse } from '../M02_llm';
import { DEFAULT_TOOLS } from './tools';

export class AgentEngine {
    private sessions: Map<string, AgentSession> = new Map();
    private tools: Map<string, ToolDefinition> = new Map();
    private maxIterations: number = 10;
    private initialized: boolean = false;

    constructor() {
        // Register default tools immediately
        this.registerDefaultTools();
    }

    private registerDefaultTools(): void {
        if (this.initialized) return;
        DEFAULT_TOOLS.forEach((tool: ToolDefinition) => this.registerTool(tool));
        this.initialized = true;
    }

    registerTool(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
    }

    async executeTask(task: string): Promise<ExecutionResult> {
        const session = await this.createSession({ systemPrompt: 'You are a helpful agent.' });
        return this.sendMessage(session.id, task);
    }

    async createSession(context?: AgentContext): Promise<AgentSession> {
        const session: AgentSession = {
            id: crypto.randomUUID(),
            status: 'idle',
            messages: [],
            startedAt: Date.now(),
        };

        if (context?.systemPrompt) {
            session.messages.push({
                id: crypto.randomUUID(),
                role: 'system',
                content: context.systemPrompt,
                timestamp: Date.now(),
            });
        }

        if (context?.maxIterations) {
            this.maxIterations = context.maxIterations;
        }

        this.sessions.set(session.id, session);
        return session;
    }

    async sendMessage(sessionId: string, content: string): Promise<ExecutionResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        // Add user message
        session.messages.push({
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now(),
        });

        session.status = 'running';

        try {
            const result = await this.runAgentLoop(session);
            session.status = 'idle';
            return result;
        } catch (error) {
            session.status = 'error';
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    private async runAgentLoop(session: AgentSession): Promise<ExecutionResult> {
        const llmManager = getLLMManager();
        let iterations = 0;
        let totalTokens = 0;
        const startTime = Date.now();

        while (iterations < this.maxIterations) {
            iterations++;

            // Convert session messages to LLM format
            const messages: ChatMessage[] = session.messages.map((m) => ({
                role: m.role === 'tool' ? 'assistant' : m.role,
                content: m.content,
            }));

            // Get LLM response
            let response: ChatCompletionResponse;
            try {
                response = await llmManager.chat({ messages });
                totalTokens += response.usage.totalTokens;
            } catch (error) {
                // LLM not configured
                return {
                    success: false,
                    error: 'LLM not configured. Please set up API keys in Settings.',
                };
            }

            // Add assistant message
            session.messages.push({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.content,
                timestamp: Date.now(),
            });

            // Check for tool calls (simple pattern matching for now)
            const toolMatch = response.content.match(/\[TOOL:(\w+)\]\s*({[^}]+})/);
            if (toolMatch) {
                const toolName = toolMatch[1];
                const toolArgs = JSON.parse(toolMatch[2]);
                const tool = this.tools.get(toolName);

                if (tool) {
                    session.status = 'waiting';
                    const toolResult = await tool.execute(toolArgs);

                    session.messages.push({
                        id: crypto.randomUUID(),
                        role: 'tool',
                        content: JSON.stringify(toolResult),
                        timestamp: Date.now(),
                        toolName,
                        toolArgs,
                        toolResult,
                    });

                    session.status = 'running';
                    continue; // Continue agent loop
                }
            }

            // No tool call, return result
            return {
                success: true,
                output: response.content,
                tokensUsed: totalTokens,
                duration: Date.now() - startTime,
            };
        }

        return {
            success: false,
            error: `Max iterations (${this.maxIterations}) reached`,
            tokensUsed: totalTokens,
            duration: Date.now() - startTime,
        };
    }

    getSession(sessionId: string): AgentSession | undefined {
        return this.sessions.get(sessionId);
    }

    setSessionStatus(sessionId: string, status: AgentStatus): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = status;
        }
    }

    getAllSessions(): AgentSession[] {
        return Array.from(this.sessions.values());
    }

    closeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'completed';
            session.completedAt = Date.now();
        }
    }
}

// Singleton
let engineInstance: AgentEngine | null = null;

export function getAgentEngine(): AgentEngine {
    if (!engineInstance) {
        engineInstance = new AgentEngine();
    }
    return engineInstance;
}
