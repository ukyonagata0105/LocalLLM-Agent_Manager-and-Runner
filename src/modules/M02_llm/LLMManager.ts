/**
 * M02 LLM Providers - LLM Manager
 * Unified interface for managing multiple LLM providers.
 */

import { LLMProvider, LLMConfig, LLMClient, ChatCompletionRequest, ChatCompletionResponse, StreamChunk, CostEstimate, MODEL_PRICING } from './types';
import { OpenAIClient } from './OpenAIClient';
import { AnthropicClient } from './AnthropicClient';
import { GoogleAIClient } from './GoogleAIClient';

export class LLMManager {
    private clients: Map<LLMProvider, LLMClient> = new Map();
    private configs: Map<LLMProvider, LLMConfig> = new Map(); // Store configs for retrieval
    private defaultProvider: LLMProvider = 'openai';
    private usageLog: Array<{ provider: LLMProvider; model: string; tokens: number; timestamp: number }> = [];

    constructor() {
        // Clients are created on-demand when configured
    }

    async loadFromStore(): Promise<void> {
        try {
            let provider, apiKey, model, baseUrl;

            // @ts-expect-error - ipcRenderer is injected by Electron preload
            if (window.ipcRenderer) {
                // Electron Mode
                // @ts-expect-error - ipcRenderer is injected by Electron preload
                const ipc = window.ipcRenderer;
                provider = await ipc.invoke('get-config', 'llm.provider');
                apiKey = await ipc.invoke('get-config', 'llm.apiKey');
                model = await ipc.invoke('get-config', 'llm.model');
                baseUrl = await ipc.invoke('get-config', 'llm.baseUrl');
            } else {
                // Browser Mode (Remote Access)
                try {
                    provider = JSON.parse(localStorage.getItem('config:llm.provider') || '"openai"');
                    apiKey = JSON.parse(localStorage.getItem('config:llm.apiKey') || '""');
                    model = JSON.parse(localStorage.getItem('config:llm.model') || '"gpt-4-turbo"');
                    baseUrl = JSON.parse(localStorage.getItem('config:llm.baseUrl') || '""');
                } catch {
                    // Handle raw strings if not JSON
                    provider = localStorage.getItem('config:llm.provider') || 'openai';
                    apiKey = localStorage.getItem('config:llm.apiKey') || '';
                    model = localStorage.getItem('config:llm.model') || 'gpt-4-turbo';
                    baseUrl = localStorage.getItem('config:llm.baseUrl') || '';
                }
            }

            // Defaults
            provider = provider || 'openai';
            model = model || 'gpt-4-turbo';

            console.log('[LLMManager] Loaded config:', { provider, model, baseUrl });

            this.configure({
                provider: provider as LLMProvider,
                apiKey,
                model,
                baseUrl
            });
            this.setDefaultProvider(provider as LLMProvider);

        } catch (err) {
            console.error('[LLMManager] Failed to load config:', err);
        }
    }

    configure(config: LLMConfig): void {
        let client: LLMClient;

        // Store the config for later retrieval (critical for passing to tools)
        this.configs.set(config.provider, config);

        switch (config.provider) {
            case 'openai':
                client = new OpenAIClient(config.apiKey, config.baseUrl, config.model);
                break;
            case 'anthropic':
                client = new AnthropicClient(config.apiKey, config.model);
                break;
            case 'google':
                client = new GoogleAIClient(config.apiKey, config.model);
                break;
            case 'ollama':
            case 'lmstudio':
                // FIX: Pass apiKey as first arg, not provider string
                client = new OpenAIClient(
                    config.apiKey,
                    config.baseUrl || (config.provider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1'),
                    config.model || 'local-model'
                );
                break;
            default:
                throw new Error(`Unknown provider: ${config.provider}`);
        }

        this.clients.set(config.provider, client);
    }

    setDefaultProvider(provider: LLMProvider): void {
        if (!this.clients.has(provider)) {
            // Check if we have config for it but just need to instantiate?
            // Current design implies configure() instantiates.
            throw new Error(`Provider ${provider} is configured? Check logs.`);
        }
        this.defaultProvider = provider;
    }

    getClient(provider?: LLMProvider): LLMClient {
        const p = provider || this.defaultProvider;
        const client = this.clients.get(p);

        if (!client) {
            throw new Error(`Provider ${p} is not configured. Call configure() first.`);
        }

        return client;
    }

    getConfig(provider?: LLMProvider): LLMConfig | undefined {
        const p = provider || this.defaultProvider;
        return this.configs.get(p);
    }

    async chat(request: ChatCompletionRequest, provider?: LLMProvider): Promise<ChatCompletionResponse> {
        const client = this.getClient(provider);
        const response = await client.chat(request);

        // Log usage
        this.usageLog.push({
            provider: provider || this.defaultProvider,
            model: response.model,
            tokens: response.usage.totalTokens,
            timestamp: Date.now(),
        });

        return response;
    }

    async *chatStream(request: ChatCompletionRequest, provider?: LLMProvider): AsyncGenerator<StreamChunk> {
        const client = this.getClient(provider);
        yield* client.chatStream(request);
    }

    estimateCost(model: string, inputTokens: number, outputTokens: number): CostEstimate {
        const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };

        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;

        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            currency: 'USD',
        };
    }

    getUsageStats(): { totalTokens: number; totalCost: number; byProvider: Record<string, number> } {
        const byProvider: Record<string, number> = {};
        let totalTokens = 0;
        let totalCost = 0;

        for (const entry of this.usageLog) {
            totalTokens += entry.tokens;
            byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.tokens;

            const pricing = MODEL_PRICING[entry.model] || { input: 0, output: 0 };
            const avgPrice = (pricing.input + pricing.output) / 2;
            totalCost += (entry.tokens / 1_000_000) * avgPrice;
        }

        return { totalTokens, totalCost, byProvider };
    }

    getConfiguredProviders(): LLMProvider[] {
        return Array.from(this.clients.keys());
    }
}

// Singleton
let llmManagerInstance: LLMManager | null = null;

export function getLLMManager(): LLMManager {
    if (!llmManagerInstance) {
        llmManagerInstance = new LLMManager();
    }
    return llmManagerInstance;
}
