/**
 * M21 Dashboard - Layout Component
 * Main layout with proper flexbox structure.
 */

import React from 'react';
import { Sidebar } from './Sidebar';
import {
    DashboardView,
    TasksView,
    WorkflowsView,
    AgentsView,
    KnowledgeView,
    OpenHandsView, // Added
    AnalyticsView,
    SettingsView,
} from './views';
import { useDashboardStore } from './store';
import { ViewId } from './types';

const VIEW_COMPONENTS: Record<ViewId, React.FC> = {
    dashboard: DashboardView,
    tasks: TasksView,
    workflows: WorkflowsView,
    agents: AgentsView,
    openhands: OpenHandsView, // Added
    knowledge: KnowledgeView,
    analytics: AnalyticsView,
    settings: SettingsView,
};

export const DashboardLayout: React.FC = () => {
    const { currentView } = useDashboardStore();
    const ViewComponent = VIEW_COMPONENTS[currentView] || DashboardView;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-white">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
                <ViewComponent />
            </main>
        </div>
    );
};
