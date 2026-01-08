/**
 * M04 Workflow Engine - Executor
 * Basic JavaScript workflow execution engine.
 */

import { Workflow, WorkflowNode, WorkflowEdge, NodeType, PromptNodeData, SubAgentData, IfElseNodeData } from './types';

export type NodeResult = {
    nodeId: string;
    success: boolean;
    output: unknown;
    error?: string;
    executionTime: number;
};

export type ExecutionEvent = {
    type: 'start' | 'node_start' | 'node_complete' | 'node_error' | 'complete' | 'error';
    nodeId?: string;
    data?: unknown;
    timestamp: number;
};

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface ExecutionState {
    id: string;
    workflowId: string;
    status: ExecutionStatus;
    currentNodeId?: string;
    results: Map<string, NodeResult>;
    variables: Record<string, unknown>;
    startedAt: number;
    completedAt?: number;
    error?: string;
}

export type NodeHandler = (
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    context: ExecutionContext
) => Promise<unknown>;

export interface ExecutionContext {
    execution: ExecutionState;
    emit: (event: ExecutionEvent) => void;
    getNodeResult: (nodeId: string) => NodeResult | undefined;
    setVariable: (key: string, value: unknown) => void;
    getVariable: (key: string) => unknown;
}

const defaultHandlers: Record<string, NodeHandler> = {
    [NodeType.Start]: async (node) => {
        return { triggered: true };
    },

    [NodeType.End]: async (node, inputs) => {
        return inputs;
    },

    [NodeType.Prompt]: async (node, inputs) => {
        const data = node.data as PromptNodeData;
        // TODO: Connect to M02 LLM Provider
        return {
            prompt: data.prompt,
            response: `[Simulated Response for: ${data.prompt}]`
        };
    },

    [NodeType.SubAgent]: async (node, inputs) => {
        const data = node.data as SubAgentData;

        // @ts-expect-error
        const ipc = window.ipcRenderer;

        let executionResult: any;

        if (ipc) {
            // Electron Environment - Run actual CLI
            // In a real scenario, we might want to allow configurable paths or docker containers
            // For now, we assume 'openhands' is in the system PATH or an alias
            const command = `openhands --task "${data.prompt.replace(/"/g, '\\"')}"`;

            try {
                console.log(`[Executor] Invoking OpenHands CLI: ${command}`);
                const result = await ipc.invoke('run-workflow-task', command);

                if (!result.success) {
                    // Start simple: If command not found, suggest installation
                    if (result.error && result.error.includes('command not found')) {
                        throw new Error('OpenHands CLI not found. Please install it or check your PATH.');
                    }
                    throw new Error(result.error || 'OpenHands Execution Failed');
                }

                // Parse output if possible, otherwise return raw stdout
                executionResult = {
                    status: 'success',
                    output: result.stdout,
                    cli_stderr: result.stderr,
                    agent: data.model || 'sonnet'
                };
            } catch (err: any) {
                console.error('[Executor] OpenHands IPC Error:', err);
                executionResult = {
                    status: 'error',
                    error: err.message
                };
                // We throw here to ensure the workflow engine handles it as a node error
                throw err;
            }
        } else {
            // Browser Environment - Simulation
            await new Promise(resolve => setTimeout(resolve, 2000));
            executionResult = {
                status: 'simulated',
                message: 'Running in browser (simulation). In Electron, this would run OpenHands CLI.',
                agent: data.model || 'sonnet',
                task: data.prompt
            };
        }

        return executionResult;
    },

    [NodeType.IfElse]: async (node, inputs) => {
        const data = node.data as IfElseNodeData;
        // Simple evaluation logic for demo
        // In real impl, use restricted JS evaluation or simple comparison
        const condition = data.branches[0].condition;
        const isTrue = true; // Placeholder evaluation

        return {
            selectedBranch: isTrue ? data.branches[0].id : data.branches[1].id
        };
    },

    // Legacy support mappings
    trigger: async (node) => ({ triggered: true }),
    action: async (node, inputs) => ({ ...inputs, processed: true }),
    output: async (node, inputs) => ({ ...inputs }),
};

export class WorkflowExecutor {
    private handlers: Map<string, NodeHandler> = new Map();
    private executions: Map<string, ExecutionState> = new Map();
    private eventListeners: Set<(event: ExecutionEvent) => void> = new Set();

    constructor() {
        // Register default handlers
        Object.entries(defaultHandlers).forEach(([type, handler]) => {
            this.handlers.set(type, handler);
        });
    }

    registerHandler(nodeType: string, handler: NodeHandler): void {
        this.handlers.set(nodeType, handler);
    }

    onEvent(listener: (event: ExecutionEvent) => void): () => void {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }

    private emit(event: ExecutionEvent): void {
        this.eventListeners.forEach(listener => listener(event));
    }

    async execute(workflow: Workflow, initialParams?: Record<string, unknown>): Promise<ExecutionState> {
        const execution: ExecutionState = {
            id: crypto.randomUUID(),
            workflowId: workflow.id,
            status: 'running',
            results: new Map(),
            variables: { ...initialParams },
            startedAt: Date.now(),
        };

        this.executions.set(execution.id, execution);
        this.emit({ type: 'start', timestamp: Date.now(), data: { workflowId: workflow.id } });

        const context: ExecutionContext = {
            execution,
            emit: (event) => this.emit(event),
            getNodeResult: (nodeId) => execution.results.get(nodeId),
            setVariable: (key, value) => { execution.variables[key] = value; },
            getVariable: (key) => execution.variables[key],
        };

        try {
            // Find start node
            const startNode = workflow.nodes.find(n => n.type === NodeType.Start || n.type === 'trigger') || workflow.nodes[0];
            if (!startNode) {
                throw new Error('No nodes in workflow');
            }

            // Build adjacency list
            const adjacency = this.buildAdjacencyList(workflow.nodes, workflow.edges);

            // Execute nodes in topological order
            await this.executeNode(startNode, workflow, adjacency, context);

            execution.status = 'completed';
            execution.completedAt = Date.now();
            this.emit({ type: 'complete', timestamp: Date.now() });
        } catch (error) {
            execution.status = 'error';
            execution.error = error instanceof Error ? error.message : String(error);
            execution.completedAt = Date.now();
            this.emit({ type: 'error', timestamp: Date.now(), data: { error: execution.error } });
        }

        return execution;
    }

    private async executeNode(
        node: WorkflowNode,
        workflow: Workflow,
        adjacency: Map<string, string[]>,
        context: ExecutionContext
    ): Promise<void> {
        const startTime = Date.now();
        context.execution.currentNodeId = node.id;

        this.emit({ type: 'node_start', nodeId: node.id, timestamp: Date.now() });

        // Gather inputs from connected nodes
        const inputs: Record<string, unknown> = { ...context.execution.variables };
        for (const [resultNodeId, result] of context.execution.results) {
            if (result.success) {
                inputs[resultNodeId] = result.output;
            }
        }

        // Get handler for node type
        const nodeType = node.type as string || 'trigger';
        let handler = this.handlers.get(nodeType);

        // Fallback for legacy types if not found
        if (!handler && (node.type as string) === 'trigger') handler = this.handlers.get('trigger');
        if (!handler && (node.type as string) === 'action') handler = this.handlers.get('action');

        if (!handler) {
            throw new Error(`No handler for node type: ${node.type}`);
        }

        try {
            const output = await handler(node, inputs, context);

            const result: NodeResult = {
                nodeId: node.id,
                success: true,
                output,
                executionTime: Date.now() - startTime,
            };

            context.execution.results.set(node.id, result);
            this.emit({ type: 'node_complete', nodeId: node.id, timestamp: Date.now(), data: output });

            // Execute next nodes
            const nextNodeIds = adjacency.get(node.id) || [];
            for (const nextId of nextNodeIds) {
                const nextNode = workflow.nodes.find(n => n.id === nextId);
                if (nextNode) {
                    await this.executeNode(nextNode, workflow, adjacency, context);
                }
            }
        } catch (error) {
            const result: NodeResult = {
                nodeId: node.id,
                success: false,
                output: null,
                error: error instanceof Error ? error.message : String(error),
                executionTime: Date.now() - startTime,
            };

            context.execution.results.set(node.id, result);
            this.emit({ type: 'node_error', nodeId: node.id, timestamp: Date.now(), data: { error: result.error } });
            throw error;
        }
    }

    private buildAdjacencyList(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, string[]> {
        const adjacency = new Map<string, string[]>();

        for (const node of nodes) {
            adjacency.set(node.id, []);
        }

        for (const edge of edges) {
            const existing = adjacency.get(edge.source) || [];
            existing.push(edge.target);
            adjacency.set(edge.source, existing);
        }

        return adjacency;
    }

    getExecution(executionId: string): ExecutionState | undefined {
        return this.executions.get(executionId);
    }

    pause(executionId: string): void {
        const execution = this.executions.get(executionId);
        if (execution && execution.status === 'running') {
            execution.status = 'paused';
        }
    }

    cancel(executionId: string): void {
        const execution = this.executions.get(executionId);
        if (execution && (execution.status === 'running' || execution.status === 'paused')) {
            execution.status = 'error';
            execution.error = 'Cancelled by user';
            execution.completedAt = Date.now();
        }
    }
}

// Singleton instance
let executorInstance: WorkflowExecutor | null = null;

export function getWorkflowExecutor(): WorkflowExecutor {
    if (!executorInstance) {
        executorInstance = new WorkflowExecutor();
    }
    return executorInstance;
}
