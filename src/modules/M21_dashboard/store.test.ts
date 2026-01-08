/**
 * M21 Dashboard Store - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from './store';

describe('M21 Dashboard Store', () => {
    beforeEach(() => {
        useDashboardStore.setState({
            currentView: 'dashboard',
            sidebarExpanded: true,
        });
    });

    it('should change current view', () => {
        const store = useDashboardStore.getState();

        store.setCurrentView('tasks');

        const state = useDashboardStore.getState();
        expect(state.currentView).toBe('tasks');
    });

    it('should toggle sidebar', () => {
        const store = useDashboardStore.getState();
        expect(store.sidebarExpanded).toBe(true);

        store.toggleSidebar();

        const state = useDashboardStore.getState();
        expect(state.sidebarExpanded).toBe(false);
    });

    it('should toggle sidebar back', () => {
        useDashboardStore.setState({ sidebarExpanded: false });
        const store = useDashboardStore.getState();

        store.toggleSidebar();

        const state = useDashboardStore.getState();
        expect(state.sidebarExpanded).toBe(true);
    });

    it('should navigate through all views', () => {
        const views = ['dashboard', 'tasks', 'workflows', 'agents', 'knowledge', 'analytics', 'settings'];

        views.forEach(view => {
            useDashboardStore.getState().setCurrentView(view as any);
            expect(useDashboardStore.getState().currentView).toBe(view);
        });
    });
});
