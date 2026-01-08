/**
 * M03 MCP Integration - Types
 * Types for Model Context Protocol server management.
 */

export interface MCPServer {
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    enabled: boolean;
    status: 'stopped' | 'starting' | 'running' | 'error';
}

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    serverId: string;
}

export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    serverId: string;
}

export interface MCPConfig {
    servers: MCPServer[];
    autoStart: string[]; // Server IDs to auto-start
}
