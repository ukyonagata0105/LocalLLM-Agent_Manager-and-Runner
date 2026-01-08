/**
 * M04 Workflow Engine - Store
 * Zustand store for workflow state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workflow, WorkflowExecution, WorkflowNode, WorkflowEdge } from './types';

interface WorkflowState {
    workflows: Workflow[];
    activeWorkflowId: string | null;
    executions: WorkflowExecution[];

    // Actions
    createWorkflow: (name: string) => Workflow;
    updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
    deleteWorkflow: (id: string) => void;
    setActiveWorkflow: (id: string | null) => void;

    addNode: (workflowId: string, node: WorkflowNode) => void;
    updateNode: (workflowId: string, nodeId: string, updates: Partial<WorkflowNode>) => void;
    removeNode: (workflowId: string, nodeId: string) => void;

    addEdge: (workflowId: string, edge: WorkflowEdge) => void;
    removeEdge: (workflowId: string, edgeId: string) => void;

    startExecution: (workflowId: string, inputs: Record<string, unknown>) => WorkflowExecution;
    updateExecution: (executionId: string, updates: Partial<WorkflowExecution>) => void;
}

const SAMPLE_WORKFLOW: Workflow = {
    id: 'sample',
    name: 'Sample Workflow',
    description: 'A sample workflow to get started',
    version: 1,
    nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start' } },
        { id: 'llm', type: 'llm', position: { x: 100, y: 200 }, data: { label: 'Generate Response' } },
        { id: 'output', type: 'output', position: { x: 100, y: 300 }, data: { label: 'Output' } },
    ],
    edges: [
        { id: 'e1', source: 'trigger', target: 'llm' },
        { id: 'e2', source: 'llm', target: 'output' },
    ],
    variables: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

export const useWorkflowStore = create<WorkflowState>()(
    persist(
        (set) => ({
            workflows: [SAMPLE_WORKFLOW],
            activeWorkflowId: 'sample',
            executions: [],

            createWorkflow: (name) => {
                const newWorkflow: Workflow = {
                    id: crypto.randomUUID(),
                    name,
                    version: 1,
                    nodes: [
                        { id: 'trigger', type: 'trigger', position: { x: 200, y: 100 }, data: { label: 'Start' } },
                    ],
                    edges: [],
                    variables: {},
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    workflows: [...state.workflows, newWorkflow],
                }));

                return newWorkflow;
            },

            updateWorkflow: (id, updates) => {
                set((state) => ({
                    workflows: state.workflows.map((w) =>
                        w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
                    ),
                }));
            },

            deleteWorkflow: (id) => {
                set((state) => ({
                    workflows: state.workflows.filter((w) => w.id !== id),
                    activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId,
                }));
            },

            setActiveWorkflow: (id) => {
                set({ activeWorkflowId: id });
            },

            addNode: (workflowId, node) => {
                set((state) => ({
                    workflows: state.workflows.map((w) =>
                        w.id === workflowId
                            ? { ...w, nodes: [...w.nodes, node], updatedAt: Date.now() }
                            : w
                    ),
                }));
            },

            updateNode: (workflowId, nodeId, updates) => {
                set((state) => ({
                    workflows: state.workflows.map((w) =>
                        w.id === workflowId
                            ? {
                                ...w,
                                nodes: w.nodes.map((n) =>
                                    n.id === nodeId ? { ...n, ...updates } : n
                                ),
                                updatedAt: Date.now(),
                            }
                            : w
                    ),
                }));
            },

            removeNode: (workflowId, nodeId) => {
                set((state) => ({
                    workflows: state.workflows.map((w) =>
                        w.id === workflowId
                            ? {
                                ...w,
                                nodes: w.nodes.filter((n) => n.id !== nodeId),
                                edges: w.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
                                updatedAt: Date.now(),
                            }
                            : w
                    ),
                }));
            },

            addEdge: (workflowId, edge) => {
                set((state) => ({
                    workflows: state.workflows.map((w) =>
                        w.id === workflowId
                            ? { ...w, edges: [...w.edges, edge], updatedAt: Date.now() }
                            : w
                    ),
                }));
            },

            removeEdge: (workflowId, edgeId) => {
                set((state) => ({
                    workflows: state.workflows.map((w) =>
                        w.id === workflowId
                            ? { ...w, edges: w.edges.filter((e) => e.id !== edgeId), updatedAt: Date.now() }
                            : w
                    ),
                }));
            },

            startExecution: (workflowId, _inputs) => {
                const execution: WorkflowExecution = {
                    id: crypto.randomUUID(),
                    workflowId,
                    status: 'pending',
                    startedAt: Date.now(),
                };

                set((state) => ({
                    executions: [...state.executions, execution],
                }));

                return execution;
            },

            updateExecution: (executionId, updates) => {
                set((state) => ({
                    executions: state.executions.map((e) =>
                        e.id === executionId ? { ...e, ...updates } : e
                    ),
                }));
            },
        }),
        {
            name: 'workflow-storage',
        }
    )
);
