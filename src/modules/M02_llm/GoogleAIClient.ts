/**
 * M02 LLM Providers - Google AI Client
 * Production implementation using Google Generative AI SDK.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LLMClient, ChatCompletionRequest, ChatCompletionResponse, StreamChunk, ChatMessage } from './types';

export class GoogleAIClient implements LLMClient {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    private defaultModel: string;

    constructor(apiKey?: string, model: string = 'gemini-2.0-flash-exp') {
        this.defaultModel = model;

        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model });
        }
    }

    isConfigured(): boolean {
        return this.genAI !== null && this.model !== null;
    }

    private convertMessages(messages: ChatMessage[]): { systemInstruction?: string; history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>; lastMessage: string } {
        let systemInstruction: string | undefined;
        const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        let lastMessage = '';

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (msg.role === 'system') {
                systemInstruction = msg.content;
            } else if (i === messages.length - 1 && msg.role === 'user') {
                lastMessage = msg.content;
            } else {
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                });
            }
        }

        return { systemInstruction, history, lastMessage };
    }

    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        if (!this.genAI) {
            throw new Error('Google AI client not configured. Please provide an API key.');
        }

        const modelName = request.model || this.defaultModel;
        const { systemInstruction, history, lastMessage } = this.convertMessages(request.messages);

        const model = this.genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage);
        const response = result.response;

        return {
            id: crypto.randomUUID(),
            model: modelName,
            content: response.text(),
            usage: {
                promptTokens: response.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata?.totalTokenCount || 0,
            },
            finishReason: 'stop',
        };
    }

    async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
        if (!this.genAI) {
            throw new Error('Google AI client not configured. Please provide an API key.');
        }

        const modelName = request.model || this.defaultModel;
        const { systemInstruction, history, lastMessage } = this.convertMessages(request.messages);

        const model = this.genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(lastMessage);

        for await (const chunk of result.stream) {
            yield {
                delta: chunk.text(),
            };
        }

        yield {
            delta: '',
            finishReason: 'stop',
        };
    }
}
