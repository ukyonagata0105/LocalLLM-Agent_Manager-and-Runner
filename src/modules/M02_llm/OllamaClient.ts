/**
 * M02 LLM Providers - Ollama Client
 * Client for Ollama local server.
 */

import { LLMClient, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from './types';

export class OllamaClient implements LLMClient {
    private baseUrl: string;
    private _connected: boolean = false;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    async connect(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            this._connected = response.ok;
            return this._connected;
        } catch {
            this._connected = false;
            return false;
        }
    }

    isConfigured(): boolean {
        return this._connected;
    }

    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.models?.map((m: { name: string }) => m.name) || [];
        } catch {
            return [];
        }
    }

    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: request.model || 'llama3.2',
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                stream: false,
                options: {
                    temperature: request.temperature ?? 0.7,
                    num_predict: request.maxTokens ?? 2048,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            id: crypto.randomUUID(),
            content: data.message?.content || '',
            model: data.model || request.model || 'ollama',
            usage: {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            },
            finishReason: 'stop',
        };
    }

    async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: request.model || 'llama3.2',
                messages: request.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                stream: true,
                options: {
                    temperature: request.temperature ?? 0.7,
                    num_predict: request.maxTokens ?? 2048,
                },
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`Ollama streaming error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message?.content) {
                            yield { delta: parsed.message.content, finishReason: parsed.done ? 'stop' : undefined };
                        }
                        if (parsed.done) return;
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        yield { delta: '', finishReason: 'stop' };
    }
}
