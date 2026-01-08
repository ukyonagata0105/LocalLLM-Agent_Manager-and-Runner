/**
 * M18 Analytics - Types
 */

export interface AnalyticsEvent {
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
    sessionId?: string;
}

export interface MetricPoint {
    timestamp: number;
    value: number;
}

export interface DashboardMetrics {
    totalSessions: number;
    totalTokens: number;
    totalCost: number;
    activeAgents: number;
    taskCompletion: number;
    messagesPerDay: MetricPoint[];
    tokensPerDay: MetricPoint[];
}
