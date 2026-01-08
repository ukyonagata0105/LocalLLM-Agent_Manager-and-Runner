/**
 * M09 Task Store - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from './store';

describe('M09 Task Store', () => {
    beforeEach(() => {
        // Reset store state
        useTaskStore.setState({
            taskLists: [
                {
                    id: 'test-list',
                    name: 'Test List',
                    tasks: [
                        {
                            id: 'task-1',
                            title: 'Test Task',
                            status: 'todo',
                            priority: 'medium',
                            tags: [],
                            dependencies: [],
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        },
                    ],
                },
            ],
            activeListId: 'test-list',
        });
    });

    it('should create a new task', () => {
        const store = useTaskStore.getState();

        store.createTask('test-list', {
            title: 'New Task',
            status: 'todo',
            priority: 'high',
            tags: ['test'],
            dependencies: [],
        });

        const state = useTaskStore.getState();
        const list = state.taskLists.find(l => l.id === 'test-list');

        expect(list?.tasks).toHaveLength(2);
        expect(list?.tasks[1].title).toBe('New Task');
    });

    it('should update task status', () => {
        const store = useTaskStore.getState();

        store.setTaskStatus('test-list', 'task-1', 'done');

        const state = useTaskStore.getState();
        const list = state.taskLists.find(l => l.id === 'test-list');
        const task = list?.tasks.find(t => t.id === 'task-1');

        expect(task?.status).toBe('done');
    });

    it('should delete a task', () => {
        const store = useTaskStore.getState();

        store.deleteTask('test-list', 'task-1');

        const state = useTaskStore.getState();
        const list = state.taskLists.find(l => l.id === 'test-list');

        expect(list?.tasks).toHaveLength(0);
    });

    it('should set active list', () => {
        const store = useTaskStore.getState();

        store.setActiveList('another-list');

        const state = useTaskStore.getState();
        expect(state.activeListId).toBe('another-list');
    });
});
