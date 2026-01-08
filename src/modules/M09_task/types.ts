/**
 * M09 Task Management - Types
 * Production-level type definitions for task management.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    tags: string[];
    dependencies: string[]; // Task IDs
    assignee?: string;
    dueDate?: number;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
}

export interface TaskList {
    id: string;
    name: string;
    tasks: Task[];
    filePath?: string; // Path to task.md file
}

export interface ParsedTaskMarkdown {
    title: string;
    tasks: Task[];
    metadata?: Record<string, string>;
}
