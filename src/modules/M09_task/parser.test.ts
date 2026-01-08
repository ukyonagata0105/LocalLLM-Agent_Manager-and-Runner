/**
 * M09 Task Parser - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseTaskMarkdown, serializeTaskMarkdown } from './parser';

describe('M09 Task Parser', () => {
    describe('parseTaskMarkdown', () => {
        it('should parse a simple task markdown', () => {
            const markdown = `# My Tasks

- [ ] First task
- [x] Completed task
- [/] In progress task
`;
            const result = parseTaskMarkdown(markdown);

            expect(result.title).toBe('My Tasks');
            expect(result.tasks).toHaveLength(3);
        });

        it('should parse task status correctly', () => {
            const markdown = `# Tasks
- [ ] Todo task
- [x] Done task
- [/] In progress
`;
            const result = parseTaskMarkdown(markdown);

            expect(result.tasks[0].status).toBe('todo');
            expect(result.tasks[1].status).toBe('done');
            expect(result.tasks[2].status).toBe('in_progress');
        });

        it('should parse priority markers', () => {
            const markdown = `# Tasks
- [ ] Normal task
- [ ] !high High priority
- [ ] !!urgent Urgent priority
`;
            const result = parseTaskMarkdown(markdown);

            expect(result.tasks[0].priority).toBe('medium');
            expect(result.tasks[1].priority).toBe('high');
            expect(result.tasks[2].priority).toBe('urgent');
        });

        it('should parse tags', () => {
            const markdown = `# Tasks
- [ ] Task with #tag1 and #tag2
`;
            const result = parseTaskMarkdown(markdown);

            expect(result.tasks[0].tags).toContain('tag1');
            expect(result.tasks[0].tags).toContain('tag2');
        });

        it('should handle empty markdown', () => {
            const result = parseTaskMarkdown('');

            expect(result.title).toBe('Tasks');
            expect(result.tasks).toHaveLength(0);
        });
    });

    describe('serializeTaskMarkdown', () => {
        it('should serialize tasks back to markdown', () => {
            const parsed = {
                title: 'My Tasks',
                tasks: [
                    {
                        id: '1',
                        title: 'First task',
                        status: 'todo' as const,
                        priority: 'medium' as const,
                        tags: [],
                        dependencies: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                    {
                        id: '2',
                        title: 'Done task',
                        status: 'done' as const,
                        priority: 'medium' as const,
                        tags: [],
                        dependencies: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                ],
                metadata: {},
            };

            const result = serializeTaskMarkdown(parsed);

            expect(result).toContain('# My Tasks');
            expect(result).toContain('- [ ] First task');
            expect(result).toContain('- [x] Done task');
        });
    });
});
