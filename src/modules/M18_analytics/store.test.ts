/**
 * M18 Analytics Store - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalyticsStore } from './store';

describe('M18 Analytics Store', () => {
    beforeEach(() => {
        useAnalyticsStore.setState({
            events: [],
        });
    });

    it('should track an event', () => {
        const store = useAnalyticsStore.getState();

        store.trackEvent('test_event', { value: 42 });

        const state = useAnalyticsStore.getState();
        expect(state.events).toHaveLength(1);
        expect(state.events[0].type).toBe('test_event');
        expect(state.events[0].data.value).toBe(42);
    });

    it('should track token usage and count input tokens', () => {
        const store = useAnalyticsStore.getState();

        store.trackTokenUsage(100, 50);

        const metrics = store.getMetrics();
        // The store only counts input tokens in totalTokens
        expect(metrics.totalTokens).toBe(100);
    });

    it('should accumulate token usage', () => {
        const store = useAnalyticsStore.getState();

        store.trackTokenUsage(100, 50);
        store.trackTokenUsage(200, 100);

        const metrics = store.getMetrics();
        // Accumulates input tokens: 100 + 200 + 100 = 400
        expect(metrics.totalTokens).toBe(400);
    });

    it('should track events with timestamps', () => {
        const store = useAnalyticsStore.getState();
        const before = Date.now();

        store.trackEvent('test', {});

        const state = useAnalyticsStore.getState();
        expect(state.events[0].timestamp).toBeGreaterThanOrEqual(before);
    });
});
