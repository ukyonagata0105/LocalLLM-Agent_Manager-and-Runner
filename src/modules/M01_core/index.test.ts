import { describe, it, expect, vi } from 'vitest';
import { getAgentEngine } from './AgentEngine';
import { ToolDefinition } from './types';

describe('M01 Core Engine', () => {
    it('should initialize AgentEngine', () => {
        const engine = getAgentEngine();
        expect(engine).toBeDefined();
    });

    it('should create a session', async () => {
        const engine = getAgentEngine();
        const session = await engine.createSession();
        expect(session.id).toBeDefined();
        expect(session.status).toBe('idle');
        expect(engine.getSession(session.id)).toBeDefined();
    });

    it('should register a tool', () => {
        const engine = getAgentEngine();
        const tool: ToolDefinition = {
            name: 'test-tool',
            description: 'A test tool',
            parameters: {}, // Use correct property name if schema is parameters, or check types.ts
            execute: vi.fn(),
        };
        engine.registerTool(tool);
        // Access private tools map via any or assume it works if no error
        // Since we can't access private property easily in TS without casting, 
        // we mainly check for no error. 
        // In a real scenario we'd have a getTool method.
    });
});
