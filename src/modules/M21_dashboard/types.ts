/**
 * M21 Dashboard - Types
 * Production-level type definitions for dashboard components.
 */

export interface Widget {
    id: string;
    type: WidgetType;
    title: string;
    position: { x: number; y: number; w: number; h: number };
    settings?: Record<string, unknown>;
}

export type WidgetType =
    | 'system-status'
    | 'task-list'
    | 'agent-chat'
    | 'terminal'
    | 'file-explorer'
    | 'memory-view'
    | 'logs'
    | 'analytics';

export interface LayoutConfig {
    id: string;
    name: string;
    widgets: Widget[];
    createdAt: number;
    updatedAt: number;
}

export interface Notification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
}

export type ViewId =
    | 'dashboard'
    | 'tasks'
    | 'workflows'
    | 'agents'
    | 'openhands'
    | 'knowledge'
    | 'settings'
    | 'analytics';

export interface MenuItem {
    id: ViewId;
    label: string;
    icon: string;
    tier: 1 | 2 | 3 | 4;
}

export const MENU_ITEMS: MenuItem[] = [
    { id: 'dashboard', label: 'sidebar.dashboard', icon: 'Home', tier: 1 },
    { id: 'tasks', label: 'sidebar.tasks', icon: 'CheckSquare', tier: 2 },
    { id: 'workflows', label: 'sidebar.workflows', icon: 'GitBranch', tier: 1 },
    { id: 'openhands', label: 'sidebar.openhands', icon: 'Terminal', tier: 1 },
    { id: 'agents', label: 'sidebar.agents', icon: 'Bot', tier: 1 },
    { id: 'knowledge', label: 'sidebar.knowledge', icon: 'Database', tier: 2 },
    { id: 'analytics', label: 'sidebar.analytics', icon: 'BarChart3', tier: 3 },
    { id: 'settings', label: 'sidebar.settings', icon: 'Settings', tier: 1 },
];
