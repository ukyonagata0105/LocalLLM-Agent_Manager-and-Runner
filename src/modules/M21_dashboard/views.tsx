/**
 * M21 Dashboard - Views
 * Modern views with premium design, animations, and refined aesthetics.
 */

import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from './store';
import { WidgetContainer, SystemStatusWidget, TaskSummaryWidget, LogsWidget } from './widgets';
import { KanbanBoard } from '../M09_task';
// import { FlowEditor } from '../M04_workflow'; // Deprecated in favor of n8n
import { AnalyticsDashboard } from '../M18_analytics';
import { Settings2, Sliders, Shield, Bell, Palette, Globe } from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DashboardView: React.FC = () => {
    const { layouts, activeLayoutId } = useDashboardStore();
    const activeLayout = layouts.find((l) => l.id === activeLayoutId) || layouts[0];

    const gridLayout = activeLayout.widgets.map((w) => ({
        i: w.id,
        x: w.position.x,
        y: w.position.y,
        w: w.position.w,
        h: w.position.h,
    }));

    return (
        <div className="h-full p-6 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
                <p className="text-gray-500">Monitor your agents and system status</p>
            </div>
            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: gridLayout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                isDraggable
                isResizable
            >
                {activeLayout.widgets.map((widget) => (
                    <div key={widget.id}>
                        <WidgetContainer widget={widget}>
                            {widget.type === 'system-status' && <SystemStatusWidget />}
                            {widget.type === 'logs' && <LogsWidget />}
                            {widget.type === 'task-list' && <TaskSummaryWidget />}
                        </WidgetContainer>
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};

export const TasksView: React.FC = () => (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
        <div className="p-6 border-b border-gray-800/50">
            <h1 className="text-3xl font-bold text-white mb-1">Task Management</h1>
            <p className="text-gray-500">Organize and track your work</p>
        </div>
        <div className="flex-1 overflow-hidden">
            <KanbanBoard />
        </div>
    </div>
);

import { manageN8nTool } from '../M01_core/tools';

export const WorkflowsView: React.FC = () => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [status, setStatus] = React.useState<string | null>(null);

    const handleRestart = async () => {
        setIsLoading(true);
        setStatus('Syncing config & Restarting n8n...');

        try {
            // 1. Get current LLM Config
            const llmManager = getLLMManager();
            await llmManager.loadFromStore();
            const provider = (llmManager as any).defaultProvider || 'openai';

            // FIX: Use getConfig
            const loadedConfig = llmManager.getConfig(provider);

            // Get language setting from localStorage
            let language = 'en';
            try {
                const saved = localStorage.getItem('config:app.llm_language');
                if (saved) {
                    language = JSON.parse(saved) || 'en';
                }
            } catch { /* ignore */ }

            const config = {
                apiKey: loadedConfig?.apiKey,
                baseUrl: loadedConfig?.baseUrl,
                language: language,
            };

            // 2. Call Tool
            const result = await manageN8nTool.execute({
                action: 'restart',
                llmConfig: config
            });

            if ((result as { success: boolean }).success) {
                setStatus('Success! n8n restarted.');
                // Reload iframe
                setTimeout(() => {
                    const iframe = document.getElementById('n8n-frame') as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                    setStatus(null);
                }, 5000); // n8n takes time to boot
            } else {
                setStatus(`Error: ${(result as { error?: string }).error}`);
            }
        } catch (e) {
            setStatus(`Failed: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
            <div className="p-6 border-b border-gray-800/50 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Workflow Automation (n8n)</h1>
                    <p className="text-gray-500">Design and automate your processes using n8n</p>
                </div>
                <div className="flex gap-3 items-center">
                    {status && <span className="text-xs text-yellow-500">{status}</span>}
                    <button
                        onClick={handleRestart}
                        disabled={isLoading}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isLoading ? 'bg-gray-800 text-gray-500' : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                            }`}
                    >
                        {isLoading ? 'Starting...' : '↻ Sync & Restart'}
                    </button>
                    <a
                        href="http://localhost:5678"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-700 transition-all text-white flex items-center gap-2"
                    >
                        Open in New Tab ↗
                    </a>
                </div>
            </div>
            <div className="flex-1 bg-gray-900 relative">
                <iframe
                    id="n8n-frame"
                    src="http://localhost:5678"
                    className="w-full h-full border-0"
                    title="n8n Workflow Editor"
                />
            </div>
        </div>
    );
};


import { manageOpenHandsTool } from '../M01_core/tools';
import { getLLMManager } from '../M02_llm/LLMManager';

export const OpenHandsView: React.FC = () => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [status, setStatus] = React.useState<string | null>(null);

    const handleRestart = async () => {
        setIsLoading(true);
        setStatus('Syncing config & Restarting...');

        try {
            // 1. Get current LLM Config
            const llmManager = getLLMManager();
            await llmManager.loadFromStore();
            const provider = (llmManager as any).defaultProvider || 'openai';

            // FIX: Use getConfig to get the actual clean configuration object
            const loadedConfig = llmManager.getConfig(provider);

            const config = {
                provider,
                apiKey: loadedConfig?.apiKey,
                model: loadedConfig?.model || 'gpt-4o',
                baseUrl: loadedConfig?.baseUrl // Now this will be correct!
            };

            console.log('Restarting OpenHands with config:', config);

            // 2. Call Tool
            const result = await manageOpenHandsTool.execute({
                action: 'restart',
                llmConfig: config
            });

            if ((result as { success: boolean }).success) {
                setStatus('Success! OpenHands restarted.');
                // Reload iframe after short delay
                setTimeout(() => {
                    const iframe = document.getElementById('openhands-frame') as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                    setStatus(null);
                }, 3000);
            } else {
                setStatus(`Error: ${(result as { error?: string }).error}`);
            }
        } catch (e) {
            setStatus(`Failed: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-purple-500">⚡</span>
                        OpenHands
                    </h2>
                    <p className="text-xs text-gray-500">Autonomous Coding Agent Runtime</p>
                </div>
                <div className="flex gap-2 items-center">
                    {status && <span className="text-xs text-yellow-500 mr-2">{status}</span>}
                    <button
                        onClick={handleRestart}
                        disabled={isLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${isLoading ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20'
                            }`}
                    >
                        {isLoading ? 'Syncing...' : '↻ Sync & Restart'}
                    </button>
                    <a
                        href="http://localhost:3000"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs flex items-center gap-2 transition-colors"
                    >
                        Open in New Tab
                    </a>
                </div>
            </div>
            <div className="flex-1 bg-black relative">
                <iframe
                    id="openhands-frame"
                    src="http://localhost:3000"
                    className="w-full h-full border-none"
                    title="OpenHands Interface"
                />
            </div>
        </div>
    );
};

import { AgentChat } from './agents';

export const AgentsView: React.FC = () => <AgentChat />;

import { KnowledgeManager } from './knowledge';

export const KnowledgeView: React.FC = () => (
    <div className="h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
        <KnowledgeManager />
    </div>
);

export const AnalyticsView: React.FC = () => <AnalyticsDashboard />;

interface SettingCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

const SettingCard: React.FC<SettingCardProps> = ({ icon, title, description, onClick }) => (
    <div
        onClick={onClick}
        className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer group"
    >
        <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gray-700/50 text-gray-400 group-hover:text-white transition-colors">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
    </div>
);

import { LLMSettings, RemoteSettings, GeneralSettings, KnowledgeSettings } from './settings';

export const SettingsView: React.FC = () => {
    const [activeSection, setActiveSection] = React.useState<string | null>(null);

    const settingsSections = [
        { id: 'general', title: 'General', icon: <Settings2 size={20} />, description: 'Application preferences and defaults' },
        { id: 'llm', title: 'LLM Providers', icon: <Sliders size={20} />, description: 'Configure API keys for OpenAI, Anthropic, Google AI, and Local Models' },
        { id: 'knowledge', title: 'Knowledge Base', icon: <span className="text-lg">🧠</span>, description: 'Connect to Dify for RAG and Document Management' },
        { id: 'security', title: 'Security', icon: <Shield size={20} />, description: 'Authentication and access control settings' },
        { id: 'notifications', title: 'Notifications', icon: <Bell size={20} />, description: 'Alert preferences and sound settings' },
        { id: 'appearance', title: 'Appearance', icon: <Palette size={20} />, description: 'Theme, colors, and display options' },
        { id: 'remote', title: 'Remote Access', icon: <Globe size={20} />, description: 'Configure server mode and tunnel settings' }
    ];

    if (activeSection) {
        const section = settingsSections.find(s => s.id === activeSection);
        return (
            <div className="h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6 overflow-auto">
                <button
                    onClick={() => setActiveSection(null)}
                    className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                >
                    ← Back to Settings
                </button>
                <h1 className="text-3xl font-bold text-white mb-1">{section?.title}</h1>
                <p className="text-gray-500 mb-6">{section?.description}</p>

                {activeSection === 'llm' && <LLMSettings />}
                {activeSection === 'knowledge' && <KnowledgeSettings />}
                {activeSection === 'remote' && <RemoteSettings />}
                {activeSection === 'general' && <GeneralSettings />}
                {activeSection === 'appearance' && <GeneralSettings />} {/* Reuse for now */}

                {!['llm', 'remote', 'general', 'appearance', 'knowledge'].includes(activeSection) && (
                    <div className="p-8 rounded-2xl bg-gray-800/30 border border-gray-700/50 text-center">
                        <div className="text-4xl mb-4">🚧</div>
                        <h3 className="text-xl font-semibold text-white mb-2">Work in Progress</h3>
                        <p className="text-gray-400">Settings for {section?.title} are currently being implemented.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6 overflow-auto">
            <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
            <p className="text-gray-500 mb-6">Configure your LocalLLM Agent Manager</p>

            <div className="max-w-3xl space-y-4">
                {settingsSections.map(section => (
                    <SettingCard
                        key={section.id}
                        icon={section.icon}
                        title={section.title}
                        description={section.description}
                        onClick={() => setActiveSection(section.id)}
                    />
                ))}
            </div>
        </div>
    );
};
