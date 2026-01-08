/**
 * M04 Workflow Executor - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowExecutor, ExecutionEvent } from './executor';
import { Workflow, NodeType } from './types';

describe('M04 Workflow Executor', () => {
    let executor: WorkflowExecutor;

    beforeEach(() => {
        executor = new WorkflowExecutor();
    });

    const createSimpleWorkflow = (): Workflow => ({
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        nodes: [
            { id: 'start', type: NodeType.Start, position: { x: 0, y: 0 }, data: { label: 'Start' } },
            { id: 'prompt1', type: NodeType.Prompt, position: { x: 100, y: 0 }, data: { prompt: 'Generate code' } },
            { id: 'end', type: NodeType.End, position: { x: 200, y: 0 }, data: { label: 'End' } },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'prompt1' },
            { id: 'e2', source: 'prompt1', target: 'end' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    it('should execute a simple workflow', async () => {
        const workflow = createSimpleWorkflow();
        const result = await executor.execute(workflow);

        expect(result.status).toBe('completed');
        expect(result.results.size).toBe(3);
        expect(result.error).toBeUndefined();
    });

    it('should emit events during execution', async () => {
        const workflow = createSimpleWorkflow();
        const events: ExecutionEvent[] = [];

        executor.onEvent((event) => events.push(event));

        await executor.execute(workflow);

        expect(events.some(e => e.type === 'start')).toBe(true);
        expect(events.some(e => e.type === 'complete')).toBe(true);
        expect(events.filter(e => e.type === 'node_complete').length).toBe(3);
    });

    it('should cancel running execution', async () => {
        const workflow = createSimpleWorkflow();
        const resultPromise = executor.execute(workflow);
        const result = await resultPromise;

        executor.cancel(result.id);

        const execution = executor.getExecution(result.id);
        expect(execution?.status).toBe('completed');
    });
});
