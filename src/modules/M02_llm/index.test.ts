
import { describe, it, expect } from 'vitest';
import { getLLMManager, LLMManager } from './LLMManager';

describe('M02 LLM Providers', () => {
    it('should initialize LLMManager', () => {
        const manager = getLLMManager();
        expect(manager).toBeDefined();
        expect(manager).toBeInstanceOf(LLMManager);
    });

    it('should configure a provider', () => {
        const manager = getLLMManager();
        manager.configure({
            provider: 'openai',
            apiKey: 'test-key',
            model: 'gpt-4',
        });

        const client = manager.getClient('openai');
        expect(client).toBeDefined();
    });

    it('should throw error for unconfigured provider', () => {
        const manager = getLLMManager();
        expect(() => manager.getClient('anthropic')).toThrow();
    });
});
