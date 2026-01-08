/**
 * M02 LLM Providers - OpenAI Client
 * Production implementation using official OpenAI SDK.
 */

import OpenAI from 'openai';
import { LLMClient, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from './types';

export class OpenAIClient implements LLMClient {
    private client: OpenAI | null = null;
    private defaultModel: string;

    constructor(apiKey?: string, baseUrl?: string, model: string = 'gpt-4o-mini') {
        this.defaultModel = model;

        // For Local LLMs (LM Studio/Ollama), API Key is often optional but SDK requires it.
        const finalApiKey = apiKey || (baseUrl ? 'not-needed' : undefined);

        if (finalApiKey) {
            this.client = new OpenAI({
                apiKey: finalApiKey,
                baseURL: baseUrl,
                dangerouslyAllowBrowser: true, // For Electron renderer process
            });
        }
    }

    isConfigured(): boolean {
        return this.client !== null;
    }

    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        if (!this.client) {
            throw new Error('OpenAI client not configured. Please provide an API key.');
        }

        const response = await this.client.chat.completions.create({
            model: request.model || this.defaultModel,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
        });

        const choice = response.choices[0];

        return {
            id: response.id,
            model: response.model,
            content: choice.message.content || '',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
            finishReason: choice.finish_reason as ChatCompletionResponse['finishReason'],
        };
    }

    async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
        if (!this.client) {
            throw new Error('OpenAI client not configured. Please provide an API key.');
        }

        const stream = await this.client.chat.completions.create({
            model: request.model || this.defaultModel,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
            stream: true,
        });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            const finishReason = chunk.choices[0]?.finish_reason;

            yield {
                delta,
                finishReason: finishReason || undefined,
            };
        }
    }
}
