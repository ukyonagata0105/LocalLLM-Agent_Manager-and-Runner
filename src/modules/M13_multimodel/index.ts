import { getLLMManager, ChatCompletionRequest, ChatCompletionResponse, LLMProvider } from '../M02_llm';

export interface RoutingRule {
    condition: (request: ChatCompletionRequest) => boolean;
    provider: LLMProvider;
    reason: string;
}

export class MultiModelOrchestrator {
    private rules: RoutingRule[] = [];
    private fallbackChain: LLMProvider[] = [];

    addRule(rule: RoutingRule): void {
        this.rules.push(rule);
    }

    setFallbackChain(providers: LLMProvider[]): void {
        this.fallbackChain = providers;
    }

    async route(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        const llm = getLLMManager();

        // Check routing rules
        for (const rule of this.rules) {
            if (rule.condition(request)) {
                console.log(`[Orchestrator] Routing to ${rule.provider}: ${rule.reason}`);
                try {
                    return await llm.chat(request, rule.provider);
                } catch (error) {
                    console.warn(`[Orchestrator] ${rule.provider} failed, trying fallback`);
                }
            }
        }

        // Try fallback chain
        for (const provider of this.fallbackChain) {
            try {
                return await llm.chat(request, provider);
            } catch (error) {
                console.warn(`[Orchestrator] ${provider} failed in fallback chain`);
            }
        }

        throw new Error('All providers failed');
    }
}

let instance: MultiModelOrchestrator | null = null;

export function getOrchestrator(): MultiModelOrchestrator {
    if (!instance) instance = new MultiModelOrchestrator();
    return instance;
}
