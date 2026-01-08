/**
 * M02 LLM Providers - Types
 * Production-level type definitions for LLM integration.
 */

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'lmstudio';

export interface LLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionRequest {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface ChatCompletionResponse {
    id: string;
    model: string;
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}

export interface StreamChunk {
    delta: string;
    finishReason?: string;
}

export interface LLMClient {
    chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk>;
    isConfigured(): boolean;
}

export interface CostEstimate {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
}

// Pricing per 1M tokens (approximate, may vary)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
    'claude-3-opus-20240229': { input: 15, output: 75 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'gemini-2.0-flash-exp': { input: 0, output: 0 },
    'gemini-1.5-pro': { input: 1.25, output: 5 },
};
