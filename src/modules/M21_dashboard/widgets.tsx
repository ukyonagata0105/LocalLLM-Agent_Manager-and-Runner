/**
 * M21 Dashboard - Widgets
 * Clean, functional widgets with proper layouts.
 */

import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Zap, CheckCircle, Clock } from 'lucide-react';
import { Widget } from './types';
import { useTaskStore } from '../M09_task';

interface WidgetContainerProps {
    widget: Widget;
    children: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({ widget, children }) => {
    return (
        <div className="h-full flex flex-col bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
                <h3 className="font-semibold text-sm text-white">{widget.title}</h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
                {children}
            </div>
        </div>
    );
};

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color: string;
    progress?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subValue, color, progress }) => (
    <div className={`rounded-lg p-4 ${color}`}>
        <div className="flex items-center gap-2 mb-2">
            <span className="text-white/80">{icon}</span>
            <span className="text-xs font-medium text-white/70 uppercase">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {subValue && <div className="text-xs text-white/60">{subValue}</div>}
        {progress !== undefined && (
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                    className="h-full bg-white/70 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, progress)}%` }}
                />
            </div>
        )}
    </div>
);

export const SystemStatusWidget: React.FC = () => {
    const [status, setStatus] = useState({
        cpu: 0,
        memory: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        uptime: 0,
    });

    useEffect(() => {
        const updateStatus = async () => {
            try {
                // Try to get stats from Electron Main process
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    const stats = await window.ipcRenderer.invoke('get-system-stats');
                    setStatus(stats);
                } else {
                    // Fallback for browser-only dev mode
                    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } };
                    const memUsed = perf.memory?.usedJSHeapSize || 0;
                    const memTotal = perf.memory?.totalJSHeapSize || 0;
                    const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

                    setStatus({
                        cpu: 0,
                        memory: memPercent,
                        memoryUsed: Math.round(memUsed / 1024 / 1024),
                        memoryTotal: Math.round(memTotal / 1024 / 1024),
                        uptime: Math.floor((Date.now() - performance.timeOrigin) / 1000),
                    });
                }
            } catch (err) {
                console.warn('[Dashboard] Failed to fetch system stats:', err);
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${h}h ${m}m`;
        return `${h}h ${m}m`;
    };

    const formatMemory = (mb: number) => {
        if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
        return `${mb} MB`;
    };

    return (
        <div className="grid grid-cols-3 gap-3">
            <MetricCard
                icon={<Cpu size={16} />}
                label="CPU Load"
                value={status.cpu >= 0 ? `${status.cpu}%` : "Calculating..."}
                color="bg-gray-700"
                progress={status.cpu}
                subValue="System Total"
            />
            <MetricCard
                icon={<HardDrive size={16} />}
                label="RAM Usage"
                value={`${status.memory}%`}
                subValue={`${formatMemory(status.memoryUsed)} / ${formatMemory(status.memoryTotal)}`}
                color="bg-emerald-600"
                progress={status.memory}
            />
            <MetricCard
                icon={<Activity size={16} />}
                label="System Uptime"
                value={formatUptime(status.uptime)}
                color="bg-purple-600"
            />
        </div>
    );
};

export const TaskSummaryWidget: React.FC = () => {
    const { taskLists, activeListId } = useTaskStore();
    const activeList = taskLists.find(l => l.id === activeListId);

    const todo = activeList?.tasks.filter(t => t.status === 'todo').length || 0;
    const inProgress = activeList?.tasks.filter(t => t.status === 'in_progress').length || 0;
    const done = activeList?.tasks.filter(t => t.status === 'done').length || 0;
    const total = todo + inProgress + done;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Completion</span>
                <span className="text-xl font-bold text-white">{completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded bg-gray-700/50">
                    <Clock size={14} className="mx-auto text-amber-400 mb-1" />
                    <div className="text-lg font-semibold text-white">{todo}</div>
                    <div className="text-xs text-gray-400">To Do</div>
                </div>
                <div className="text-center p-2 rounded bg-gray-700/50">
                    <Zap size={14} className="mx-auto text-blue-400 mb-1" />
                    <div className="text-lg font-semibold text-white">{inProgress}</div>
                    <div className="text-xs text-gray-400">Active</div>
                </div>
                <div className="text-center p-2 rounded bg-gray-700/50">
                    <CheckCircle size={14} className="mx-auto text-emerald-400 mb-1" />
                    <div className="text-lg font-semibold text-white">{done}</div>
                    <div className="text-xs text-gray-400">Done</div>
                </div>
            </div>
        </div>
    );
};

import { useAnalyticsStore } from '../M18_analytics';

export const LogsWidget: React.FC = () => {
    const { events } = useAnalyticsStore();
    // Get last 10 logs
    const recentLogs = events.slice(-10).reverse();

    const getLevelColor = (type: string) => {
        if (type.includes('error') || type.includes('fail')) return 'text-red-400';
        if (type.includes('warn')) return 'text-amber-400';
        if (type.includes('success') || type.includes('complete')) return 'text-emerald-400';
        return 'text-blue-400';
    };

    return (
        <div className="space-y-2 font-mono text-xs">
            {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 p-2 rounded bg-gray-900">
                    <span className="text-gray-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`shrink-0 ${getLevelColor(log.type)}`}>[{log.type}]</span>
                    <span className="text-gray-300 truncate">{JSON.stringify(log.data || {})}</span>
                </div>
            ))}
            {recentLogs.length === 0 && (
                <div className="text-gray-500 text-center py-4">No recent logs</div>
            )}
        </div>
    );
};

// Service Status Widget
interface ServiceStatus {
    name: string;
    running: boolean;
    healthy: boolean;
    port?: number;
    error?: string;
}

export const ServiceStatusWidget: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'OpenHands', running: false, healthy: false, port: 3000 },
        { name: 'n8n', running: false, healthy: false, port: 5678 },
        { name: 'Dify', running: false, healthy: false, port: 80 }
    ]);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    const status = await window.ipcRenderer.invoke('get-services-status');
                    if (Array.isArray(status)) {
                        setServices(status);
                    }
                }
            } catch (err) {
                console.warn('[ServiceStatus] Failed to fetch:', err);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleStartAll = async () => {
        setIsStarting(true);
        try {
            // @ts-expect-error
            if (window.ipcRenderer) {
                // @ts-expect-error
                await window.ipcRenderer.invoke('start-all-services');
            }
        } catch (err) {
            console.error('[ServiceStatus] Failed to start:', err);
        } finally {
            setIsStarting(false);
        }
    };

    const getStatusColor = (running: boolean, healthy: boolean) => {
        if (running && healthy) return 'bg-emerald-500';
        if (running) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getStatusText = (running: boolean, healthy: boolean) => {
        if (running && healthy) return 'Running';
        if (running) return 'Starting...';
        return 'Stopped';
    };

    const allRunning = services.every(s => s.running);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Docker Services</span>
                {!allRunning && (
                    <button
                        onClick={handleStartAll}
                        disabled={isStarting}
                        className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                        {isStarting ? 'Starting...' : 'Start All'}
                    </button>
                )}
            </div>
            {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-2 rounded bg-gray-700/50">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(service.running, service.healthy)}`} />
                        <span className="text-sm text-white">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">:{service.port}</span>
                        <span className={`text-xs ${service.running ? 'text-emerald-400' : 'text-red-400'}`}>
                            {getStatusText(service.running, service.healthy)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

