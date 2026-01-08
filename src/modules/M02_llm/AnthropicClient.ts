/**
 * M02 LLM Providers - Anthropic Client
 * Production implementation using official Anthropic SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMClient, ChatCompletionRequest, ChatCompletionResponse, StreamChunk, ChatMessage } from './types';

export class AnthropicClient implements LLMClient {
    private client: Anthropic | null = null;
    private defaultModel: string;

    constructor(apiKey?: string, model: string = 'claude-3-5-sonnet-20241022') {
        this.defaultModel = model;

        if (apiKey) {
            this.client = new Anthropic({
                apiKey,
                dangerouslyAllowBrowser: true,
            });
        }
    }

    isConfigured(): boolean {
        return this.client !== null;
    }

    private convertMessages(messages: ChatMessage[]): { system?: string; messages: Anthropic.MessageParam[] } {
        let system: string | undefined;
        const anthropicMessages: Anthropic.MessageParam[] = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                system = msg.content;
            } else {
                anthropicMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }

        return { system, messages: anthropicMessages };
    }

    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        if (!this.client) {
            throw new Error('Anthropic client not configured. Please provide an API key.');
        }

        const { system, messages } = this.convertMessages(request.messages);

        const response = await this.client.messages.create({
            model: request.model || this.defaultModel,
            max_tokens: request.maxTokens ?? 4096,
            system: system,
            messages: messages,
        });

        const textContent = response.content.find(c => c.type === 'text');

        return {
            id: response.id,
            model: response.model,
            content: textContent?.type === 'text' ? textContent.text : '',
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'stop',
        };
    }

    async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
        if (!this.client) {
            throw new Error('Anthropic client not configured. Please provide an API key.');
        }

        const { system, messages } = this.convertMessages(request.messages);

        const stream = this.client.messages.stream({
            model: request.model || this.defaultModel,
            max_tokens: request.maxTokens ?? 4096,
            system: system,
            messages: messages,
        });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield {
                    delta: event.delta.text,
                };
            } else if (event.type === 'message_stop') {
                yield {
                    delta: '',
                    finishReason: 'stop',
                };
            }
        }
    }
}
