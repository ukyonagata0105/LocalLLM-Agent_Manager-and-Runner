/**
 * M21 Dashboard - Sidebar Component
 * Modern sidebar with clean design.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';
import {
    Home,
    CheckSquare,
    GitBranch,
    Bot,
    Database,
    BarChart3,
    Settings,
    Terminal, // Added
    ChevronLeft,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { useDashboardStore } from './store';
import { MENU_ITEMS } from './types';

const ICON_MAP: Record<string, LucideIcon> = {
    Home,
    CheckSquare,
    GitBranch,
    Bot,
    Database,
    BarChart3,
    Settings,
    Terminal, // Added for OpenHands
};

export const Sidebar: React.FC = () => {
    const { t } = useTranslation();
    const { currentView, setCurrentView, sidebarExpanded, toggleSidebar } = useDashboardStore();

    return (
        <aside
            className={`
                flex flex-col h-full bg-gray-900 border-r border-gray-800
                transition-all duration-300 ease-out shrink-0
                ${sidebarExpanded ? 'w-52' : 'w-16'}
            `}
        >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-3 border-b border-gray-800">
                {sidebarExpanded && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-white truncate">LocalLLM</span>
                            <span className="text-[10px] text-gray-500">Agent Manager</span>
                        </div>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white shrink-0"
                >
                    {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
                {MENU_ITEMS.map((item) => {
                    const Icon = ICON_MAP[item.icon] || Home;
                    const isActive = currentView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                                ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }
                            `}
                            title={item.label}
                        >
                            <Icon size={18} className="shrink-0" />
                            {sidebarExpanded && (
                                <span className="truncate font-medium">{t(item.label)}</span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-gray-800">
                {sidebarExpanded ? (
                    <div className="space-y-2">
                        <ActiveModelDisplay />
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-gray-400">{t('sidebar.systemOnline')}</div>
                                <div className="text-[10px] text-gray-600">v0.1.0</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected" />
                    </div>
                )}
            </div>
        </aside>
    );
};

const ActiveModelDisplay: React.FC = () => {
    const [info, setInfo] = React.useState({ provider: '...', model: '...' });

    React.useEffect(() => {
        const check = async () => {
            try {
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    const p = await window.ipcRenderer.invoke('get-config', 'llm.provider');
                    // @ts-expect-error
                    const m = await window.ipcRenderer.invoke('get-config', 'llm.model');
                    setInfo({
                        provider: p === 'lmstudio' ? 'LM Studio' : p === 'ollama' ? 'Ollama' : p || 'OpenAI',
                        model: m || 'Default'
                    });
                } else {
                    setInfo({ provider: 'Local (Dev)', model: 'Dev Mode' });
                }
            } catch (e) {
                // ignore
            }
        };
        // Initial check
        check();
        // Check periodically
        const timer = setInterval(check, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-gray-800/80 rounded-lg p-2 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
                <Bot size={12} className="text-purple-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{info.provider}</span>
            </div>
            <div className="text-xs text-white truncate font-medium pl-5" title={info.model}>
                {info.model}
            </div>
        </div>
    );
};
