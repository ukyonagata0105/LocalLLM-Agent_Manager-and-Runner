/**
 * M09 Task Management - Task Parser
 * Parser for task.md format (GitHub-style checkboxes).
 */

import { Task, TaskStatus, TaskPriority, ParsedTaskMarkdown } from './types';

const CHECKBOX_REGEX = /^(\s*)- \[([ xX/])\] (.+)$/;
const TAG_REGEX = /#(\w+)/g;
const PRIORITY_REGEX = /!(low|medium|high|urgent)/i;
const DUE_REGEX = /@due\(([^)]+)\)/;
const ID_REGEX = /<!-- id: ([^\s]+) -->/;

export function parseTaskMarkdown(content: string): ParsedTaskMarkdown {
    const lines = content.split('\n');
    const tasks: Task[] = [];
    let title = 'Tasks';
    const metadata: Record<string, string> = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Parse title (first H1)
        if (line.startsWith('# ') && title === 'Tasks') {
            title = line.substring(2).trim();
            continue;
        }

        // Parse metadata (bold key-value pairs)
        const metaMatch = line.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
        if (metaMatch) {
            metadata[metaMatch[1].trim()] = metaMatch[2].trim();
            continue;
        }

        // Parse checkbox items
        const match = line.match(CHECKBOX_REGEX);
        if (match) {
            const indent = match[1].length;
            const checkState = match[2];
            const text = match[3];

            // Determine status from checkbox
            let status: TaskStatus = 'todo';
            if (checkState === 'x' || checkState === 'X') {
                status = 'done';
            } else if (checkState === '/') {
                status = 'in_progress';
            }

            // Extract tags
            const tags: string[] = [];
            let tagMatch;
            while ((tagMatch = TAG_REGEX.exec(text)) !== null) {
                tags.push(tagMatch[1]);
            }

            // Extract priority
            let priority: TaskPriority = 'medium';
            const priorityMatch = text.match(PRIORITY_REGEX);
            if (priorityMatch) {
                priority = priorityMatch[1].toLowerCase() as TaskPriority;
            }

            // Extract due date
            let dueDate: number | undefined;
            const dueMatch = text.match(DUE_REGEX);
            if (dueMatch) {
                dueDate = new Date(dueMatch[1]).getTime();
            }

            // Extract ID or generate one
            let id: string;
            const idMatch = text.match(ID_REGEX);
            if (idMatch) {
                id = idMatch[1];
            } else {
                id = `task-${i}`;
            }

            // Clean title (remove metadata markers)
            const cleanTitle = text
                .replace(TAG_REGEX, '')
                .replace(PRIORITY_REGEX, '')
                .replace(DUE_REGEX, '')
                .replace(ID_REGEX, '')
                .trim();

            tasks.push({
                id,
                title: cleanTitle,
                status,
                priority,
                tags,
                dependencies: [],
                dueDate,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                completedAt: status === 'done' ? Date.now() : undefined,
            });

            // Store indent level for potential hierarchy (unused for now)
            void indent;
        }
    }

    return { title, tasks, metadata };
}

export function serializeTaskMarkdown(data: ParsedTaskMarkdown): string {
    const lines: string[] = [];

    lines.push(`# ${data.title}`);
    lines.push('');

    // Add metadata
    if (data.metadata) {
        for (const [key, value] of Object.entries(data.metadata)) {
            lines.push(`**${key}**: ${value}`);
        }
        if (Object.keys(data.metadata).length > 0) {
            lines.push('');
        }
    }

    // Add tasks
    for (const task of data.tasks) {
        let checkbox: string;
        switch (task.status) {
            case 'done':
                checkbox = 'x';
                break;
            case 'in_progress':
                checkbox = '/';
                break;
            default:
                checkbox = ' ';
        }

        let line = `- [${checkbox}] ${task.title}`;

        // Add tags
        if (task.tags.length > 0) {
            line += ' ' + task.tags.map(t => `#${t}`).join(' ');
        }

        // Add priority if not medium
        if (task.priority !== 'medium') {
            line += ` !${task.priority}`;
        }

        // Add due date
        if (task.dueDate) {
            const date = new Date(task.dueDate).toISOString().split('T')[0];
            line += ` @due(${date})`;
        }

        // Add ID
        line += ` <!-- id: ${task.id} -->`;

        lines.push(line);
    }

    return lines.join('\n');
}
