/**
 * M09 Task Management - Store
 * Zustand store for task state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, TaskStatus, TaskPriority, TaskList } from './types';
import { parseTaskMarkdown, serializeTaskMarkdown } from './parser';

interface TaskState {
    taskLists: TaskList[];
    activeListId: string | null;

    // Actions
    createTask: (listId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
    updateTask: (listId: string, taskId: string, updates: Partial<Task>) => void;
    deleteTask: (listId: string, taskId: string) => void;
    moveTask: (fromListId: string, toListId: string, taskId: string) => void;
    setTaskStatus: (listId: string, taskId: string, status: TaskStatus) => void;

    createTaskList: (name: string) => TaskList;
    deleteTaskList: (listId: string) => void;
    setActiveList: (listId: string | null) => void;

    importFromMarkdown: (content: string) => TaskList;
    exportToMarkdown: (listId: string) => string;

    getTasksByStatus: (listId: string, status: TaskStatus) => Task[];
    getTasksByPriority: (listId: string, priority: TaskPriority) => Task[];
}

const DEFAULT_LIST: TaskList = {
    id: 'default',
    name: 'Tasks',
    tasks: [
        {
            id: 'welcome-1',
            title: 'Welcome to LocalLLM Agent',
            description: 'Get started by exploring the system',
            status: 'done',
            priority: 'medium',
            tags: ['onboarding'],
            dependencies: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            completedAt: Date.now(),
        },
        {
            id: 'setup-1',
            title: 'Configure LLM Provider',
            description: 'Set up your preferred LLM API key',
            status: 'todo',
            priority: 'high',
            tags: ['setup'],
            dependencies: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
    ],
};

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            taskLists: [DEFAULT_LIST],
            activeListId: 'default',

            createTask: (listId, taskData) => {
                const newTask: Task = {
                    ...taskData,
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    taskLists: state.taskLists.map((list) =>
                        list.id === listId
                            ? { ...list, tasks: [...list.tasks, newTask] }
                            : list
                    ),
                }));

                return newTask;
            },

            updateTask: (listId, taskId, updates) => {
                set((state) => ({
                    taskLists: state.taskLists.map((list) =>
                        list.id === listId
                            ? {
                                ...list,
                                tasks: list.tasks.map((task) =>
                                    task.id === taskId
                                        ? { ...task, ...updates, updatedAt: Date.now() }
                                        : task
                                ),
                            }
                            : list
                    ),
                }));
            },

            deleteTask: (listId, taskId) => {
                set((state) => ({
                    taskLists: state.taskLists.map((list) =>
                        list.id === listId
                            ? { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) }
                            : list
                    ),
                }));
            },

            moveTask: (fromListId, toListId, taskId) => {
                const state = get();
                const fromList = state.taskLists.find((l) => l.id === fromListId);
                const task = fromList?.tasks.find((t) => t.id === taskId);

                if (!task) return;

                set((state) => ({
                    taskLists: state.taskLists.map((list) => {
                        if (list.id === fromListId) {
                            return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
                        }
                        if (list.id === toListId) {
                            return { ...list, tasks: [...list.tasks, task] };
                        }
                        return list;
                    }),
                }));
            },

            setTaskStatus: (listId, taskId, status) => {
                set((state) => ({
                    taskLists: state.taskLists.map((list) =>
                        list.id === listId
                            ? {
                                ...list,
                                tasks: list.tasks.map((task) =>
                                    task.id === taskId
                                        ? {
                                            ...task,
                                            status,
                                            updatedAt: Date.now(),
                                            completedAt: status === 'done' ? Date.now() : undefined,
                                        }
                                        : task
                                ),
                            }
                            : list
                    ),
                }));
            },

            createTaskList: (name) => {
                const newList: TaskList = {
                    id: crypto.randomUUID(),
                    name,
                    tasks: [],
                };

                set((state) => ({
                    taskLists: [...state.taskLists, newList],
                }));

                return newList;
            },

            deleteTaskList: (listId) => {
                set((state) => ({
                    taskLists: state.taskLists.filter((l) => l.id !== listId),
                    activeListId: state.activeListId === listId ? null : state.activeListId,
                }));
            },

            setActiveList: (listId) => {
                set({ activeListId: listId });
            },

            importFromMarkdown: (content) => {
                const parsed = parseTaskMarkdown(content);
                const newList: TaskList = {
                    id: crypto.randomUUID(),
                    name: parsed.title,
                    tasks: parsed.tasks,
                };

                set((state) => ({
                    taskLists: [...state.taskLists, newList],
                }));

                return newList;
            },

            exportToMarkdown: (listId) => {
                const state = get();
                const list = state.taskLists.find((l) => l.id === listId);

                if (!list) return '';

                return serializeTaskMarkdown({
                    title: list.name,
                    tasks: list.tasks,
                });
            },

            getTasksByStatus: (listId, status) => {
                const state = get();
                const list = state.taskLists.find((l) => l.id === listId);
                return list?.tasks.filter((t) => t.status === status) || [];
            },

            getTasksByPriority: (listId, priority) => {
                const state = get();
                const list = state.taskLists.find((l) => l.id === listId);
                return list?.tasks.filter((t) => t.priority === priority) || [];
            },
        }),
        {
            name: 'task-storage',
        }
    )
);
