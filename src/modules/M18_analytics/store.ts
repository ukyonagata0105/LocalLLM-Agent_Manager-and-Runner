/**
 * M18 Analytics - Analytics Service
 * Event tracking and metrics aggregation.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalyticsEvent, MetricPoint, DashboardMetrics } from './types';

interface AnalyticsState {
    events: AnalyticsEvent[];
    dailyMetrics: Map<string, { tokens: number; messages: number; cost: number }>;

    trackEvent: (type: string, data?: Record<string, unknown>) => void;
    trackTokenUsage: (tokens: number, cost: number) => void;
    getMetrics: () => DashboardMetrics;
    clearEvents: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
    persist(
        (set, get) => ({
            events: [],
            dailyMetrics: new Map(),

            trackEvent: (type, data = {}) => {
                const event: AnalyticsEvent = {
                    id: crypto.randomUUID(),
                    type,
                    data,
                    timestamp: Date.now(),
                };
                set((state) => ({
                    events: [...state.events.slice(-1000), event], // Keep last 1000 events
                }));
            },

            trackTokenUsage: (tokens, cost) => {
                const today = new Date().toISOString().split('T')[0];
                const state = get();
                const current = state.dailyMetrics.get(today) || { tokens: 0, messages: 0, cost: 0 };

                const newMetrics = new Map(state.dailyMetrics);
                newMetrics.set(today, {
                    tokens: current.tokens + tokens,
                    messages: current.messages + 1,
                    cost: current.cost + cost,
                });

                set({ dailyMetrics: newMetrics });
            },

            getMetrics: () => {
                const state = get();
                const now = Date.now();
                const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

                let totalTokens = 0;
                let totalCost = 0;
                let totalMessages = 0;
                const messagesPerDay: MetricPoint[] = [];
                const tokensPerDay: MetricPoint[] = [];

                for (const [dateStr, metrics] of state.dailyMetrics.entries()) {
                    const date = new Date(dateStr).getTime();
                    if (date >= thirtyDaysAgo) {
                        totalTokens += metrics.tokens;
                        totalCost += metrics.cost;
                        totalMessages += metrics.messages;
                        messagesPerDay.push({ timestamp: date, value: metrics.messages });
                        tokensPerDay.push({ timestamp: date, value: metrics.tokens });
                    }
                }

                return {
                    totalSessions: state.events.filter(e => e.type === 'session_start').length,
                    totalTokens,
                    totalCost,
                    activeAgents: 0, // Would be populated from agent engine
                    taskCompletion: 0, // Would be calculated from task store
                    messagesPerDay,
                    tokensPerDay,
                };
            },

            clearEvents: () => set({ events: [], dailyMetrics: new Map() }),
        }),
        {
            name: 'analytics-storage',
            partialize: (state) => ({
                events: state.events.slice(-100),
                dailyMetrics: Object.fromEntries(state.dailyMetrics),
            }),
        }
    )
);
