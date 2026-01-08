/**
 * M02 LLM Providers - LM Studio Client
 * OpenAI-compatible client for LM Studio local server.
 */

import { LLMClient, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from './types';

export class LMStudioClient implements LLMClient {
    private baseUrl: string;
    private _connected: boolean = false;

    constructor(baseUrl: string = 'http://localhost:1234') {
        this.baseUrl = baseUrl;
    }

    async connect(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/models`);
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
            const response = await fetch(`${this.baseUrl}/v1/models`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.data?.map((m: { id: string }) => m.id) || [];
        } catch {
            return [];
        }
    }

    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: request.model || 'local',
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.maxTokens ?? 2048,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`LM Studio error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            id: data.id || crypto.randomUUID(),
            content: data.choices[0]?.message?.content || '',
            model: data.model || 'local',
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            finishReason: data.choices[0]?.finish_reason || 'stop',
        };
    }

    async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: request.model || 'local',
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.maxTokens ?? 2048,
                stream: true,
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`LM Studio streaming error: ${response.statusText}`);
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
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            yield { delta: content };
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        yield { delta: '', finishReason: 'stop' };
    }
}
