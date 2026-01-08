/**
 * M18 Analytics - Analytics View Component
 * Real analytics dashboard with metrics visualization.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Zap, Clock, DollarSign, MessageSquare, Activity } from 'lucide-react';
import { useAnalyticsStore } from './store';

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, trend, trendUp, color }) => (
    <div className="p-5 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all group">
        <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white`}>
                {icon}
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {trend}
                </div>
            )}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
    </div>
);

interface SimpleBarChartProps {
    data: Array<{ label: string; value: number }>;
    maxValue: number;
    color: string;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, maxValue, color }) => (
    <div className="flex items-end gap-1 h-32">
        {data.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                    className={`w-full rounded-t-sm ${color} transition-all duration-300`}
                    style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '4px' }}
                    title={`${item.label}: ${item.value}`}
                />
                <span className="text-[10px] text-gray-500">{item.label}</span>
            </div>
        ))}
    </div>
);

export const AnalyticsDashboard: React.FC = () => {
    const { events, getMetrics } = useAnalyticsStore();
    const metrics = getMetrics();

    // Generate sample week data
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const tokensData = weekLabels.map((label, i) => ({
        label,
        value: metrics.tokensPerDay[i]?.value || 0,
    }));
    const messagesData = weekLabels.map((label, i) => ({
        label,
        value: metrics.messagesPerDay[i]?.value || 0,
    }));

    const maxTokens = Math.max(...tokensData.map(d => d.value), 100);
    const maxMessages = Math.max(...messagesData.map(d => d.value), 10);

    return (
        <div className="h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6 overflow-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-1">Analytics</h1>
                <p className="text-gray-500">Monitor usage and performance metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    icon={<Zap size={20} />}
                    label="Total Tokens"
                    value={metrics.totalTokens.toLocaleString()}
                    color="from-blue-500 to-blue-600"
                />
                <MetricCard
                    icon={<MessageSquare size={20} />}
                    label="Sessions"
                    value={metrics.totalSessions.toString()}
                    color="from-purple-500 to-purple-600"
                />
                <MetricCard
                    icon={<DollarSign size={20} />}
                    label="Estimated Cost"
                    value={`$${metrics.totalCost.toFixed(4)}`}
                    color="from-emerald-500 to-emerald-600"
                />
                <MetricCard
                    icon={<Clock size={20} />}
                    label="Active Agents"
                    value={metrics.activeAgents.toString()}
                    color="from-amber-500 to-amber-600"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Token Usage</h3>
                        <span className="text-sm text-gray-400">Last 7 days</span>
                    </div>
                    {metrics.totalTokens > 0 ? (
                        <SimpleBarChart data={tokensData} maxValue={maxTokens} color="bg-blue-500" />
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No token data available</div>
                    )}
                </div>
                <div className="p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Messages</h3>
                        <span className="text-sm text-gray-400">Last 7 days</span>
                    </div>
                    {metrics.totalSessions > 0 ? (
                        <SimpleBarChart data={messagesData} maxValue={maxMessages} color="bg-purple-500" />
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No message data available</div>
                    )}
                </div>
            </div>

            {/* Provider Usage - To be implemented with real data later */}
            {/* 
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                ... 
            </div> 
            */}

            {/* Recent Events */}
            <div className="p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50">
                <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                    {events.slice(-5).reverse().map((event) => (
                        <div key={event.id} className="flex items-center gap-3 text-sm">
                            <Activity size={14} className="text-gray-500" />
                            <span className="text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                            <span className="px-2 py-0.5 rounded bg-gray-700/50 text-xs text-gray-300">{event.type}</span>
                            <span className="text-gray-300 truncate">{JSON.stringify(event.data).slice(0, 50)}</span>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                            No activity recorded yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
