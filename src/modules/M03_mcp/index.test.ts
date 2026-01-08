
import { describe, it, expect } from 'vitest';
import { getMCPManager } from './MCPServerManager';
import { MCPServer } from './types';

describe('M03 MCP Integration', () => {
    it('should initialize MCPServerManager', () => {
        const manager = getMCPManager();
        expect(manager).toBeDefined();
    });

    it('should register and retrieve a server', () => {
        const manager = getMCPManager();
        const server: MCPServer = {
            id: 'test-server',
            name: 'Test Server',
            command: 'node',
            args: ['index.js'],
            env: {},
            status: 'stopped',
            enabled: true,
        };

        manager.registerServer(server);
        const retrieved = manager.getServer('test-server');
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe('test-server');
    });
});
