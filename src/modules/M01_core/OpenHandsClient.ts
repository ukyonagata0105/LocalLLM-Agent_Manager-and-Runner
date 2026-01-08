/**
 * OpenHands API Client
 * Allows Agent to create sessions, send tasks, and monitor execution
 */

export interface OpenHandsSession {
    conversation_id: string;
    status: 'idle' | 'running' | 'paused' | 'finished' | 'error';
    created_at: string;
    last_activity: string;
}

export interface OpenHandsMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}

export interface OpenHandsAction {
    action: string;
    args: Record<string, unknown>;
    thought?: string;
}

export interface OpenHandsObservation {
    observation: string;
    content: string;
    extras?: Record<string, unknown>;
}

export interface OpenHandsEvent {
    id: number;
    source: 'agent' | 'user' | 'environment';
    action?: string;
    args?: Record<string, unknown>;
    message?: string;
    observation?: string;
    content?: string;
    timestamp: string;
}

export class OpenHandsClient {
    private baseUrl: string;
    private currentSessionId: string | null = null;

    constructor(baseUrl: string = 'http://localhost:3000') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(`${this.baseUrl}/api${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenHands API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    /**
     * Create a new conversation/session
     */
    async createSession(): Promise<{ conversation_id: string }> {
        const result = await this.request<{ conversation_id: string }>('/conversations', {
            method: 'POST',
        });
        this.currentSessionId = result.conversation_id;
        return result;
    }

    /**
     * List all sessions
     */
    async listSessions(): Promise<{ conversations: OpenHandsSession[] }> {
        return this.request('/conversations');
    }

    /**
     * Get session details
     */
    async getSession(sessionId: string): Promise<OpenHandsSession> {
        return this.request(`/conversations/${sessionId}`);
    }

    /**
     * Send a message/task to the agent
     */
    async sendMessage(sessionId: string, message: string): Promise<void> {
        await this.request(`/conversations/${sessionId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    /**
     * Get conversation history/events
     */
    async getEvents(sessionId: string): Promise<{ events: OpenHandsEvent[] }> {
        return this.request(`/conversations/${sessionId}/events`);
    }

    /**
     * Stop the agent execution
     */
    async stopAgent(sessionId: string): Promise<void> {
        await this.request(`/conversations/${sessionId}/stop`, {
            method: 'POST',
        });
    }

    /**
     * Get current agent state
     */
    async getAgentState(sessionId: string): Promise<{ state: string }> {
        return this.request(`/conversations/${sessionId}/state`);
    }

    /**
     * Execute a task and wait for completion
     * High-level convenience method
     */
    async executeTask(task: string, options?: {
        sessionId?: string;
        timeout?: number;
        onEvent?: (event: OpenHandsEvent) => void;
    }): Promise<{
        success: boolean;
        sessionId: string;
        events: OpenHandsEvent[];
        error?: string;
    }> {
        const timeout = options?.timeout || 300000; // 5 minutes default
        let sessionId = options?.sessionId;

        // Create session if not provided
        if (!sessionId) {
            const session = await this.createSession();
            sessionId = session.conversation_id;
        }

        // Send the task
        await this.sendMessage(sessionId, task);

        // Poll for completion
        const startTime = Date.now();
        const events: OpenHandsEvent[] = [];
        let lastEventId = 0;

        while (Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s

            try {
                const result = await this.getEvents(sessionId);

                // Process new events
                for (const event of result.events) {
                    if (event.id > lastEventId) {
                        events.push(event);
                        lastEventId = event.id;
                        options?.onEvent?.(event);
                    }
                }

                // Check if agent is done
                const state = await this.getAgentState(sessionId);
                if (state.state === 'finished' || state.state === 'error') {
                    return {
                        success: state.state === 'finished',
                        sessionId,
                        events,
                        error: state.state === 'error' ? 'Agent encountered an error' : undefined,
                    };
                }
            } catch (err) {
                console.warn('[OpenHandsClient] Polling error:', err);
            }
        }

        // Timeout
        return {
            success: false,
            sessionId,
            events,
            error: 'Task execution timed out',
        };
    }

    /**
     * Quick task execution with just a prompt
     */
    async runTask(prompt: string): Promise<string> {
        const result = await this.executeTask(prompt);

        if (!result.success) {
            throw new Error(result.error || 'Task failed');
        }

        // Extract final output from events
        const outputs = result.events
            .filter(e => e.observation === 'run' || e.observation === 'write')
            .map(e => e.content)
            .filter(Boolean);

        return outputs.join('\n') || 'Task completed';
    }
}

// Singleton instance
let openHandsClientInstance: OpenHandsClient | null = null;

export function getOpenHandsClient(baseUrl?: string): OpenHandsClient {
    if (!openHandsClientInstance || baseUrl) {
        openHandsClientInstance = new OpenHandsClient(baseUrl);
    }
    return openHandsClientInstance;
}
