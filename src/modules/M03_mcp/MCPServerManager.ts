/**
 * M03 MCP Integration - Server Manager
 * Manages MCP server lifecycle and tool discovery.
 */

import { MCPServer, MCPTool } from './types';
import { spawn, ChildProcess } from 'child_process';

export class MCPServerManager {
    private servers: Map<string, MCPServer> = new Map();
    private processes: Map<string, ChildProcess> = new Map();
    private tools: Map<string, MCPTool[]> = new Map();

    registerServer(server: MCPServer): void {
        this.servers.set(server.id, server);
    }

    async startServer(serverId: string): Promise<boolean> {
        const server = this.servers.get(serverId);
        if (!server) {
            console.error(`[MCP] Server not found: ${serverId}`);
            return false;
        }

        if (this.processes.has(serverId)) {
            console.warn(`[MCP] Server already running: ${serverId}`);
            return true;
        }

        try {
            server.status = 'starting';

            const childProcess = spawn(server.command, server.args || [], {
                env: { ...globalThis.process?.env, ...server.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            childProcess.on('error', (error: Error) => {
                console.error(`[MCP] Server error ${serverId}:`, error);
                server.status = 'error';
                this.processes.delete(serverId);
            });

            childProcess.on('exit', (code: number | null) => {
                console.log(`[MCP] Server ${serverId} exited with code ${code}`);
                server.status = 'stopped';
                this.processes.delete(serverId);
            });

            this.processes.set(serverId, childProcess);
            server.status = 'running';

            // Discover tools after server starts
            await this.discoverTools(serverId);

            console.log(`[MCP] Server started: ${serverId}`);
            return true;
        } catch (error) {
            console.error(`[MCP] Failed to start server ${serverId}:`, error);
            server.status = 'error';
            return false;
        }
    }

    async stopServer(serverId: string): Promise<void> {
        const process = this.processes.get(serverId);
        if (process) {
            process.kill();
            this.processes.delete(serverId);

            const server = this.servers.get(serverId);
            if (server) {
                server.status = 'stopped';
            }
        }
    }

    private async discoverTools(serverId: string): Promise<void> {
        // In production, this would use JSON-RPC over stdio
        // For now, we'll use a placeholder
        const serverTools: MCPTool[] = [];
        this.tools.set(serverId, serverTools);
        console.log(`[MCP] Discovered ${serverTools.length} tools from ${serverId}`);
    }

    async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
        const process = this.processes.get(serverId);
        if (!process) {
            throw new Error(`Server ${serverId} is not running`);
        }

        // In production, this would send JSON-RPC request and wait for response
        return new Promise((resolve, reject) => {
            const request = JSON.stringify({
                jsonrpc: '2.0',
                id: crypto.randomUUID(),
                method: 'tools/call',
                params: { name: toolName, arguments: args },
            });

            process.stdin?.write(request + '\n');

            // Set up response handler (simplified)
            const timeout = setTimeout(() => {
                reject(new Error('Tool call timeout'));
            }, 30000);

            process.stdout?.once('data', (data) => {
                clearTimeout(timeout);
                try {
                    const response = JSON.parse(data.toString());
                    resolve(response.result);
                } catch {
                    reject(new Error('Invalid response'));
                }
            });
        });
    }

    getServer(serverId: string): MCPServer | undefined {
        return this.servers.get(serverId);
    }

    getAllServers(): MCPServer[] {
        return Array.from(this.servers.values());
    }

    getServerTools(serverId: string): MCPTool[] {
        return this.tools.get(serverId) || [];
    }

    getAllTools(): MCPTool[] {
        const allTools: MCPTool[] = [];
        for (const tools of this.tools.values()) {
            allTools.push(...tools);
        }
        return allTools;
    }
}

// Singleton
let managerInstance: MCPServerManager | null = null;

export function getMCPManager(): MCPServerManager {
    if (!managerInstance) {
        managerInstance = new MCPServerManager();
    }
    return managerInstance;
}
