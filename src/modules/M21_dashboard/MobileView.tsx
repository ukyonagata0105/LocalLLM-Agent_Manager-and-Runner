/**
 * Mobile-Optimized View Components
 * Simplified UI for mobile device access
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Play, Square, Home, ClipboardList, MessageSquare, Settings } from 'lucide-react';

interface PendingApproval {
    id: string;
    type: 'file_write' | 'command' | 'workflow';
    description: string;
    details: string;
    timestamp: number;
}

interface RunningTask {
    id: string;
    name: string;
    progress: number;
    status: string;
}

// Mock data - in production this would come from API
const useMobileData = () => {
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([
        { id: '1', type: 'file_write', description: 'Write to config.json', details: '/path/to/config.json', timestamp: Date.now() - 60000 },
        { id: '2', type: 'command', description: 'Run npm install', details: 'npm install express', timestamp: Date.now() - 30000 },
    ]);
    const [runningTasks, setRunningTasks] = useState<RunningTask[]>([
        { id: '1', name: 'Daily Report Generation', progress: 80, status: 'Processing...' },
    ]);

    const approve = (id: string) => {
        setPendingApprovals(prev => prev.filter(p => p.id !== id));
    };

    const reject = (id: string) => {
        setPendingApprovals(prev => prev.filter(p => p.id !== id));
    };

    return { pendingApprovals, runningTasks, approve, reject };
};

export const MobileApprovalCard: React.FC<{
    approval: PendingApproval;
    onApprove: () => void;
    onReject: () => void;
}> = ({ approval, onApprove, onReject }) => {
    const getIcon = () => {
        switch (approval.type) {
            case 'file_write': return '📝';
            case 'command': return '⚡';
            case 'workflow': return '🔄';
            default: return '❓';
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl p-4 mb-3 shadow-lg">
            <div className="flex items-start gap-3">
                <span className="text-2xl">{getIcon()}</span>
                <div className="flex-1">
                    <h3 className="font-semibold text-white">{approval.description}</h3>
                    <p className="text-sm text-gray-400 mt-1 break-all">{approval.details}</p>
                    <p className="text-xs text-gray-500 mt-2">
                        {Math.floor((Date.now() - approval.timestamp) / 1000)}s ago
                    </p>
                </div>
            </div>
            <div className="flex gap-2 mt-4">
                <button
                    onClick={onReject}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-600/20 text-red-400 rounded-lg border border-red-600/30"
                >
                    <XCircle size={18} />
                    Reject
                </button>
                <button
                    onClick={onApprove}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-600/30"
                >
                    <CheckCircle size={18} />
                    Approve
                </button>
            </div>
        </div>
    );
};

export const MobileTaskCard: React.FC<{ task: RunningTask }> = ({ task }) => {
    return (
        <div className="bg-gray-800 rounded-xl p-4 mb-3 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Play className="text-blue-400" size={20} />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-white">{task.name}</h3>
                    <p className="text-sm text-gray-400">{task.status}</p>
                </div>
            </div>
            <div className="mt-4">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                    />
                </div>
                <p className="text-right text-sm text-gray-400 mt-1">{task.progress}%</p>
            </div>
        </div>
    );
};

export const MobileView: React.FC = () => {
    const { pendingApprovals, runningTasks, approve, reject } = useMobileData();
    const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'chat' | 'settings'>('home');

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <header className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                <h1 className="text-lg font-bold">LocalLLM Agent</h1>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-400">Connected</span>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4">
                {activeTab === 'home' && (
                    <>
                        {/* Pending Approvals */}
                        <section>
                            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                <Clock className="text-amber-400" size={20} />
                                Pending Approvals ({pendingApprovals.length})
                            </h2>
                            {pendingApprovals.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No pending approvals
                                </div>
                            ) : (
                                pendingApprovals.map(approval => (
                                    <MobileApprovalCard
                                        key={approval.id}
                                        approval={approval}
                                        onApprove={() => approve(approval.id)}
                                        onReject={() => reject(approval.id)}
                                    />
                                ))
                            )}
                        </section>

                        {/* Running Tasks */}
                        <section className="mt-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                <Play className="text-blue-400" size={20} />
                                Running Tasks ({runningTasks.length})
                            </h2>
                            {runningTasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No running tasks
                                </div>
                            ) : (
                                runningTasks.map(task => (
                                    <MobileTaskCard key={task.id} task={task} />
                                ))
                            )}
                        </section>
                    </>
                )}

                {activeTab === 'tasks' && (
                    <div className="text-center py-12 text-gray-500">
                        Task list view (read-only on mobile)
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="text-center py-12 text-gray-500">
                        Agent chat (coming soon)
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="text-center py-12 text-gray-500">
                        Settings (view only on mobile)
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="bg-gray-800 border-t border-gray-700 px-4 py-2 grid grid-cols-4 gap-2">
                <button
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center py-2 rounded-lg ${activeTab === 'home' ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                >
                    <Home size={24} />
                    <span className="text-xs mt-1">Home</span>
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex flex-col items-center py-2 rounded-lg ${activeTab === 'tasks' ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                >
                    <ClipboardList size={24} />
                    <span className="text-xs mt-1">Tasks</span>
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-col items-center py-2 rounded-lg ${activeTab === 'chat' ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                >
                    <MessageSquare size={24} />
                    <span className="text-xs mt-1">Chat</span>
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center py-2 rounded-lg ${activeTab === 'settings' ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                >
                    <Settings size={24} />
                    <span className="text-xs mt-1">Settings</span>
                </button>
            </nav>
        </div>
    );
};

export default MobileView;
