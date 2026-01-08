/**
 * n8n API Client
 * Allows Agent to create, read, update, delete workflows in n8n
 */

export interface N8nWorkflow {
    id: string;
    name: string;
    active: boolean;
    nodes: N8nNode[];
    connections: Record<string, N8nConnection>;
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface N8nNode {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    parameters: Record<string, unknown>;
}

export interface N8nConnection {
    main: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface N8nExecution {
    id: string;
    finished: boolean;
    mode: string;
    startedAt: string;
    stoppedAt?: string;
    workflowId: string;
    status: 'running' | 'success' | 'error' | 'waiting';
    data?: {
        resultData?: {
            runData?: Record<string, unknown>;
        };
    };
}

export class N8nClient {
    private baseUrl: string;
    private apiKey?: string;

    constructor(baseUrl: string = 'http://localhost:5678', apiKey?: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.apiKey) {
            (headers as Record<string, string>)['X-N8N-API-KEY'] = this.apiKey;
        }

        const response = await fetch(`${this.baseUrl}/api/v1${path}`, {
            ...options,
            headers,
            credentials: 'include', // For session cookies
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`n8n API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    /**
     * List all workflows
     */
    async listWorkflows(): Promise<{ data: N8nWorkflow[] }> {
        return this.request('/workflows');
    }

    /**
     * Get a specific workflow
     */
    async getWorkflow(id: string): Promise<N8nWorkflow> {
        return this.request(`/workflows/${id}`);
    }

    /**
     * Create a new workflow
     */
    async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
        return this.request('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflow),
        });
    }

    /**
     * Update an existing workflow
     */
    async updateWorkflow(id: string, updates: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
        return this.request(`/workflows/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    /**
     * Delete a workflow
     */
    async deleteWorkflow(id: string): Promise<void> {
        return this.request(`/workflows/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Activate a workflow
     */
    async activateWorkflow(id: string): Promise<N8nWorkflow> {
        return this.request(`/workflows/${id}/activate`, {
            method: 'POST',
        });
    }

    /**
     * Deactivate a workflow
     */
    async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
        return this.request(`/workflows/${id}/deactivate`, {
            method: 'POST',
        });
    }

    /**
     * Execute a workflow manually
     */
    async executeWorkflow(id: string, data?: Record<string, unknown>): Promise<N8nExecution> {
        return this.request(`/workflows/${id}/execute`, {
            method: 'POST',
            body: JSON.stringify({ data }),
        });
    }

    /**
     * Get execution details
     */
    async getExecution(id: string): Promise<N8nExecution> {
        return this.request(`/executions/${id}`);
    }

    /**
     * List recent executions
     */
    async listExecutions(workflowId?: string): Promise<{ data: N8nExecution[] }> {
        const query = workflowId ? `?workflowId=${workflowId}` : '';
        return this.request(`/executions${query}`);
    }

    /**
     * Create a simple automation workflow
     */
    async createSimpleAutomation(name: string, trigger: string, action: string): Promise<N8nWorkflow> {
        const workflow: Partial<N8nWorkflow> = {
            name,
            nodes: [
                {
                    id: 'trigger-1',
                    name: 'Trigger',
                    type: 'n8n-nodes-base.manualTrigger',
                    position: [250, 300],
                    parameters: {},
                },
                {
                    id: 'action-1',
                    name: 'Action',
                    type: 'n8n-nodes-base.code',
                    position: [450, 300],
                    parameters: {
                        jsCode: action,
                    },
                },
            ],
            connections: {
                'Trigger': {
                    main: [[{ node: 'Action', type: 'main', index: 0 }]],
                },
            },
            settings: {
                saveManualExecutions: true,
            },
        };

        return this.createWorkflow(workflow);
    }
}

// Singleton instance
let n8nClientInstance: N8nClient | null = null;

export function getN8nClient(baseUrl?: string, apiKey?: string): N8nClient {
    if (!n8nClientInstance || baseUrl) {
        n8nClientInstance = new N8nClient(baseUrl, apiKey);
    }
    return n8nClientInstance;
}
