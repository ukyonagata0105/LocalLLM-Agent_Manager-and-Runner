/**
 * M21 Dashboard - Store
 * Zustand store for dashboard state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LayoutConfig, Notification, ViewId, Widget } from './types';

interface DashboardState {
    currentView: ViewId;
    sidebarExpanded: boolean;
    layouts: LayoutConfig[];
    activeLayoutId: string | null;
    notifications: Notification[];

    // Actions
    setCurrentView: (view: ViewId) => void;
    toggleSidebar: () => void;
    saveLayout: (layout: LayoutConfig) => void;
    setActiveLayout: (layoutId: string) => void;
    updateWidget: (layoutId: string, widgetId: string, updates: Partial<Widget>) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markNotificationRead: (id: string) => void;
    clearNotifications: () => void;
}

const DEFAULT_LAYOUT: LayoutConfig = {
    id: 'default',
    name: 'Default Layout',
    widgets: [
        { id: 'status', type: 'system-status', title: 'System Status', position: { x: 0, y: 0, w: 12, h: 4 } },
        { id: 'tasks', type: 'task-list', title: 'Active Tasks', position: { x: 0, y: 4, w: 6, h: 8 } },
        { id: 'logs', type: 'logs', title: 'Logs', position: { x: 6, y: 4, w: 6, h: 8 } },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            currentView: 'dashboard',
            sidebarExpanded: true,
            layouts: [DEFAULT_LAYOUT],
            activeLayoutId: 'default',
            notifications: [],

            setCurrentView: (view) => set({ currentView: view }),

            toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

            saveLayout: (layout) => set((state) => {
                const existing = state.layouts.findIndex((l) => l.id === layout.id);
                const updated = { ...layout, updatedAt: Date.now() };
                if (existing >= 0) {
                    const newLayouts = [...state.layouts];
                    newLayouts[existing] = updated;
                    return { layouts: newLayouts };
                }
                return { layouts: [...state.layouts, updated] };
            }),

            setActiveLayout: (layoutId) => set({ activeLayoutId: layoutId }),

            updateWidget: (layoutId, widgetId, updates) => set((state) => {
                const layoutIndex = state.layouts.findIndex((l) => l.id === layoutId);
                if (layoutIndex < 0) return state;

                const layout = state.layouts[layoutIndex];
                const widgetIndex = layout.widgets.findIndex((w) => w.id === widgetId);
                if (widgetIndex < 0) return state;

                const newWidgets = [...layout.widgets];
                newWidgets[widgetIndex] = { ...newWidgets[widgetIndex], ...updates };

                const newLayouts = [...state.layouts];
                newLayouts[layoutIndex] = { ...layout, widgets: newWidgets, updatedAt: Date.now() };

                return { layouts: newLayouts };
            }),

            addNotification: (notification) => set((state) => ({
                notifications: [
                    {
                        ...notification,
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        read: false,
                    },
                    ...state.notifications,
                ],
            })),

            markNotificationRead: (id) => set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
            })),

            clearNotifications: () => set({ notifications: [] }),
        }),
        {
            name: 'dashboard-storage',
        }
    )
);
